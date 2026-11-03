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

class ApiClient {
  constructor() {
    this.tokenKey = 'greenkey_jwt_token';
    this.userKey = 'greenkey_user_info';
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

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
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
      // Sincronizar favoritos locales con favoritos de MongoDB
      if (data.user && Array.isArray(data.user.favorites)) {
        localStorage.setItem('aisa-favorite-properties', JSON.stringify(data.user.favorites));
      }
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
    return await this.request(`/properties${queryString ? `?${queryString}` : ''}`);
  }

  async getProperty(idOrSlug) {
    return await this.request(`/properties/${idOrSlug}`);
  }

  async createProperty(propertyData) {
    return await this.request('/properties', {
      method: 'POST',
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

  async getVisits() {
    return await this.request('/visits');
  }

  async updateVisitStatus(id, status) {
    return await this.request(`/visits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ================== CONSIGNACIONES / VENTA ==================
  async consignProperty(consignData) {
    return await this.request('/consignments', {
      method: 'POST',
      body: JSON.stringify(consignData)
    });
  }

  async getConsignments() {
    return await this.request('/consignments');
  }

  async updateConsignmentStatus(id, status) {
    return await this.request(`/consignments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ================== FAVORITOS ==================
  async toggleFavorite(propertyId) {
    if (!this.isAuthenticated()) {
      // Manejo local si no ha iniciado sesión
      const stored = localStorage.getItem('aisa-favorite-properties');
      const list = new Set(stored ? JSON.parse(stored) : []);
      let isSaved = false;
      if (list.has(propertyId)) {
        list.delete(propertyId);
        isSaved = false;
      } else {
        list.add(propertyId);
        isSaved = true;
      }
      localStorage.setItem('aisa-favorite-properties', JSON.stringify([...list]));
      return { success: true, isSaved, favorites: [...list] };
    }

    // Si está autenticado, sincronizar en MongoDB
    const result = await this.request(`/favorites/toggle/${propertyId}`, { method: 'POST' });
    if (result.favorites) {
      localStorage.setItem('aisa-favorite-properties', JSON.stringify(result.favorites));
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

    toast.innerHTML = `
      <span class="gk-toast-icon">${icon}</span>
      <div class="gk-toast-body">${message}</div>
      <button type="button" class="gk-toast-close" aria-label="Cerrar">&times;</button>
    `;

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
