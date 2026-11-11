/**
 * ========================================================
 * CLIENTE API REST - INMOBILIARIA GREENKEY / AISA
 * Conexión directa con Backend Node.js y Base de Datos MongoDB
 * ========================================================
 */

const configuredApiBase = window.GK_API_BASE_URL?.trim();
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const defaultApiBase = isLocalDevelopment
  ? 'http://localhost:3000/api'
  : 'https://aisa-inmobiliaria-api.onrender.com/api';
const API_BASE_URL = (configuredApiBase || defaultApiBase).replace(/\/+$/, '');

(() => {
  const selector = 'input[type="tel"]';
  const phonePattern = '[2-9][0-9]{9}';
  const phoneTitle = 'Ingresa exactamente 10 dígitos, incluida la clave de área. El prefijo +52 se agrega automáticamente.';

  function isMexicanPhone(value) {
    const input = value.trim();
    return /^[2-9][0-9]{9}$/.test(input) && !/^([0-9])\1{9}$/.test(input);
  }

  function validate(input) {
    if (!input.value.trim()) {
      input.setCustomValidity('');
      return;
    }
    input.setCustomValidity(isMexicanPhone(input.value) ? '' : phoneTitle);
  }

  function prepare(input) {
    if (!(input instanceof HTMLInputElement) || input.dataset.phoneRulesApplied) return;
    input.dataset.phoneRulesApplied = 'true';
    input.maxLength = 10;
    input.inputMode = 'numeric';
    input.pattern = phonePattern;
    input.title = phoneTitle;
    validate(input);
  }

  function prepareTree(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(selector)) prepare(node);
    node.querySelectorAll(selector).forEach(prepare);
  }

  document.addEventListener('beforeinput', (event) => {
    const input = event.target.closest?.(selector);
    if (!input || !event.data) return;
    if (/[^0-9]/.test(event.data)) event.preventDefault();
  }, true);

  document.addEventListener('input', (event) => {
    const input = event.target.closest?.(selector);
    if (!input) return;
    const previous = input.value;
    const caret = input.selectionStart;
    const next = previous.replace(/\D/g, '').slice(0, 10);
    if (next !== previous) {
      input.value = next;
      const safeCaret = Math.max(0, Math.min(next.length, caret - (previous.length - next.length)));
      input.setSelectionRange(safeCaret, safeCaret);
    }
    validate(input);
  }, true);

  document.addEventListener('change', (event) => {
    const input = event.target.closest?.(selector);
    if (input) validate(input);
  }, true);

  prepareTree(document.documentElement);
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(prepareTree)))
    .observe(document.documentElement, { childList: true, subtree: true });
})();

class ApiClient {
  constructor() {
    this.tokenKey = 'greenkey_jwt_token';
    this.userKey = 'greenkey_user_info';
    this.guestFavoritesKey = 'aisa-guest-favorite-properties';
    localStorage.removeItem('aisa-favorite-properties');
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  getUser() {
    try {
      const data = localStorage.getItem(this.userKey);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  setUser(user) {
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.userKey);
    }
  }

  isAuthenticated() {
    return Boolean(this.getToken() && this.getUser());
  }

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  }

  getGuestFavorites() {
    try {
      const favorites = JSON.parse(localStorage.getItem(this.guestFavoritesKey) || '[]');
      return Array.isArray(favorites) ? favorites.map(String) : [];
    } catch (error) {
      return [];
    }
  }

  setGuestFavorites(favorites) {
    localStorage.setItem(this.guestFavoritesKey, JSON.stringify([...new Set(favorites.map(String))]));
  }

  getFavoriteIds() {
    if (!this.isAuthenticated()) return this.getGuestFavorites();
    const user = this.getUser();
    return Array.isArray(user?.favorites) ? [...new Set(user.favorites.map(String))] : [];
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Error del servidor (${response.status})`);
      }

      return data;
    } catch (err) {
      // Manejar desconexión o endpoint no disponible
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        console.warn('Servidor no disponible en', url);
        throw new Error(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'No se pudo conectar con el servidor. Inicia el backend local y vuelve a intentarlo.'
          : 'No se pudo conectar con el servidor de Aisa. Verifica que la URL pública de la API esté configurada.');
      }
      throw err;
    }
  }

  // ================== AUTENTICACIÓN ==================
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  }

  async register(name, email, password, phone = '') {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone })
    });

    if (data.token) {
      this.setToken(data.token);
      this.setUser(data.user);
    }
    return data;
  }

  async getMe() {
    if (!this.getToken()) return null;
    try {
      const data = await this.request('/auth/me');
      if (data.user) {
        this.setUser(data.user);
        return data.user;
      }
    } catch (e) {
      this.logout();
    }
    return null;
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
    localStorage.removeItem('aisa-favorite-properties');
    window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: null } }));
  }

  // ================== PROPIEDADES ==================
  async getProperties(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        query.set(key, val);
      }
    });
    const queryString = query.toString();
    const result = await this.request(`/properties${queryString ? `?${queryString}` : ''}`);
    if (Array.isArray(result?.data)) result.data = result.data.map(property => this.resolvePropertyImages(property));
    return result;
  }

  resolvePropertyImages(property) {
    if (!property || !Array.isArray(property.images)) return property;
    const apiOrigin = new URL(API_BASE_URL, window.location.href).origin;
    return { ...property, images: property.images.map(image => typeof image === 'string' && image.startsWith('/api/') ? `${apiOrigin}${image}` : image) };
  }

  async getAdminProperties() {
    const result = await this.request('/properties/admin');
    if (Array.isArray(result?.data)) result.data = result.data.map(property => this.resolvePropertyImages(property));
    return result;
  }

  async getClosedProperties() {
    const result = await this.request('/properties/admin/archive');
    if (Array.isArray(result?.data)) result.data = result.data.map(property => this.resolvePropertyImages(property));
    return result;
  }

  async getPreparations() {
    return await this.request('/preparations');
  }

  async createPreparation(preparation) {
    return await this.request('/preparations', {
      method: 'POST',
      body: JSON.stringify(preparation)
    });
  }

  async updatePreparation(id, preparation) {
    return await this.request(`/preparations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(preparation)
    });
  }

  async addPreparationRepair(id, repair) {
    return await this.request(`/preparations/${encodeURIComponent(id)}/repairs`, {
      method: 'POST',
      body: JSON.stringify(repair)
    });
  }

  async updatePreparationRepair(id, repairId, updates) {
    return await this.request(`/preparations/${encodeURIComponent(id)}/repairs/${encodeURIComponent(repairId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async promotePreparation(id) {
    return await this.request(`/preparations/${encodeURIComponent(id)}/promote`, { method: 'POST' });
  }

  async getProperty(idOrSlug) {
    const result = await this.request(`/properties/${encodeURIComponent(idOrSlug)}`);
    if (result?.data) result.data = this.resolvePropertyImages(result.data);
    return result;
  }

  async createProperty(propertyData) {
    return await this.request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData)
    });
  }

  async updateProperty(id, propertyData) {
    return await this.request(`/properties/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(propertyData)
    });
  }

  async deleteProperty(id) {
    return await this.request(`/properties/${id}`, {
      method: 'DELETE'
    });
  }

  // ================== VISITAS / CITAS ==================
  async scheduleVisit(visitData) {
    return await this.request('/visits', {
      method: 'POST',
      body: JSON.stringify(visitData)
    });
  }

  async createAdminVisit(visitData) {
    return await this.request('/visits/admin', {
      method: 'POST',
      body: JSON.stringify(visitData)
    });
  }

  async getVisits() {
    return await this.request('/visits');
  }

  async updateVisitStatus(id, updates) {
    return await this.request(`/visits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(typeof updates === 'string' ? { status: updates } : updates)
    });
  }

  async getAppraisalRequests() {
    return await this.request('/appraisals');
  }

  async createAppraisalRequest(requestData) {
    return await this.request('/appraisals', {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
  }

  async updateAppraisalRequest(id, updateData) {
    return await this.request('/appraisals/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    });
  }

  // ================== CONSIGNACIONES / VENTA ==================
  async consignProperty(consignData) {
    const body = new FormData();
    for (const [key, value] of Object.entries(consignData)) {
      if (key === 'photos') {
        for (const photo of Array.from(value || [])) body.append('photos', photo);
      } else if (value !== undefined && value !== null) {
        body.append(key, String(value));
      }
    }
    return await this.request('/consignments', {
      method: 'POST',
      body
    });
  }

  async getConsignments() {
    return await this.request('/consignments');
  }

  async getConsignmentPhoto(consignmentId, photoId) {
    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/consignments/${encodeURIComponent(consignmentId)}/photos/${encodeURIComponent(photoId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'No se pudo cargar la foto.');
    }
    return response.blob();
  }

  async updateConsignmentStatus(id, status) {
    return await this.request(`/consignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async approveConsignment(id, listing) {
    return await this.request(`/consignments/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify(listing)
    });
  }

  // ================== FAVORITOS ==================
  async toggleFavorite(propertyId) {
    if (!this.isAuthenticated()) {
      const list = new Set(this.getGuestFavorites());
      let isSaved = false;
      if (list.has(propertyId)) {
        list.delete(propertyId);
        isSaved = false;
      } else {
        list.add(propertyId);
        isSaved = true;
      }
      this.setGuestFavorites([...list]);
      return { success: true, isSaved, favorites: [...list] };
    }

    // Si está autenticado, sincronizar en MongoDB
    const result = await this.request(`/favorites/toggle/${encodeURIComponent(propertyId)}`, { method: 'POST' });
    if (result.favorites) {
      const user = this.getUser();
      if (user) {
        user.favorites = result.favorites;
        this.setUser(user);
      }
    }
    return result;
  }

  async getMyFavorites() {
    return await this.request('/favorites/my');
  }

  // ================== CONTACTO ==================
  async submitContact(contactData) {
    return await this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  }

  // ================== PANEL DE ADMINISTRACIÓN ==================
  async getAdminSummary() {
    return await this.request('/admin/summary');
  }

  async getStatus() {
    return await this.request('/status');
  }

  async getWhatsAppCatalogStatus() {
    return await this.request('/whatsapp/catalog/status');
  }

  async syncWhatsAppCatalog() {
    return await this.request('/whatsapp/catalog/sync', { method: 'POST' });
  }

  async syncWhatsAppProfile() {
    return await this.request('/whatsapp/profile/sync', { method: 'POST' });
  }

  // ================== NOTIFICACIONES TOAST ==================
  showToast(message, type = 'success') {
    let container = document.getElementById('gk-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gk-toast-container';
      container.className = 'gk-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `gk-toast gk-toast-${type}`;

    const icon = type === 'success'
      ? '✓'
      : type === 'error'
        ? '✕'
        : 'ℹ';

    const iconElement = document.createElement('span');
    iconElement.className = 'gk-toast-icon';
    iconElement.textContent = icon;
    const body = document.createElement('div');
    body.className = 'gk-toast-body';
    body.textContent = String(message);
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'gk-toast-close';
    closeButton.setAttribute('aria-label', 'Cerrar');
    closeButton.textContent = '×';
    toast.replaceChildren(iconElement, body, closeButton);

    container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    const remove = () => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.gk-toast-close').addEventListener('click', remove);
    setTimeout(remove, 4500);
  }
}

// Instancia global disponible en todas las páginas
window.gkApi = new ApiClient();
