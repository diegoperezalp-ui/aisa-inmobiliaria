/**
 * ========================================================
 * INTERFAZ DE USUARIO: AUTENTICACIÓN, LOGIN, PERFIL Y PANEL ADMIN
 * Inmobiliaria GreenKey / Aisa
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar interfaz de autenticación
  initAuthUI();
});

let adminVisitPollingTimer = null;
let knownPendingAdminVisits = null;
let verifiedAdminSession = false;

function initAuthUI() {
  injectAuthContainers();
  renderNavbarAuth();
  bindModalTriggers();
  openAuthRoute();
  checkCurrentSession();

  // Escuchar cambios de autenticación
  window.addEventListener('auth-change', (event) => {
    verifiedAdminSession = event.detail?.user?.role === 'admin';
    renderNavbarAuth();
    syncAdminVisitNotifications();
  });
}

/**
 * Inserta los modales en el DOM si no existen
 */
function injectAuthContainers() {
  if (document.getElementById('gk-auth-modal')) return;

  const modalContainer = document.createElement('div');
  modalContainer.id = 'gk-auth-modal-root';
  modalContainer.innerHTML = `
    <!-- MODAL DE LOGIN / REGISTRO -->
    <div class="gk-modal-backdrop" id="gk-auth-modal" role="dialog" aria-modal="true" aria-labelledby="gk-auth-title">
      <div class="gk-modal-dialog">
        <button type="button" class="gk-modal-close" id="gk-auth-close" aria-label="Cerrar modal">&times;</button>

        <div class="auth-card-header">
          <div class="auth-header-brand">
            <img src="assets/aisa-logo-cropped.png" alt="Aisa Inmobiliaria" onerror="this.style.display='none'">
          </div>
          <h2 class="auth-title" id="gk-auth-title">Bienvenido a Aisa</h2>
          <p class="auth-subtitle" id="gk-auth-subtitle">Accede a tu cuenta para gestionar favoritos y visitas</p>

          <div class="auth-nav-tabs" role="tablist">
            <button type="button" class="auth-tab-btn is-active" id="tab-btn-login" role="tab" aria-selected="true">Iniciar Sesión</button>
            <button type="button" class="auth-tab-btn" id="tab-btn-register" role="tab" aria-selected="false">Crear Cuenta</button>
          </div>
        </div>

        <div class="auth-body">
          <!-- Formulario de Iniciar Sesión -->
          <form id="form-login" class="auth-form-panel">
            <div class="auth-form-group">
              <label class="auth-form-label" for="login-email">Correo Electrónico</label>
              <div class="auth-input-wrapper">
                <input type="email" id="login-email" class="auth-input" placeholder="tu.correo@ejemplo.com" required autocomplete="email">
              </div>
            </div>

            <div class="auth-form-group">
              <label class="auth-form-label" for="login-password">Contraseña</label>
              <div class="auth-input-wrapper">
                <input type="password" id="login-password" class="auth-input" placeholder="••••••••" required autocomplete="current-password">
                <button type="button" class="auth-toggle-pwd" data-target="login-password" aria-label="Ver contraseña">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <div class="auth-form-options">
              <a href="#" id="gk-forgot-password" class="auth-forgot-link">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" class="auth-submit-btn" id="btn-submit-login">
              <span>Ingresar a mi cuenta</span>
            </button>
          </form>

          <!-- Formulario de Registro -->
          <form id="form-register" class="auth-form-panel" style="display: none;">
            <div class="auth-form-group">
              <label class="auth-form-label" for="reg-name">Nombre Completo</label>
              <div class="auth-input-wrapper">
                <input type="text" id="reg-name" class="auth-input" placeholder="Ej. Roberto Garza" required autocomplete="name">
              </div>
            </div>

            <div class="auth-form-group">
              <label class="auth-form-label" for="reg-email">Correo Electrónico</label>
              <div class="auth-input-wrapper">
                <input type="email" id="reg-email" class="auth-input" placeholder="tu.correo@ejemplo.com" required autocomplete="email">
              </div>
            </div>

            <div class="auth-form-group">
              <label class="auth-form-label" for="reg-phone">Teléfono / WhatsApp (Opcional)</label>
              <div class="auth-input-wrapper">
                <input type="tel" id="reg-phone" class="auth-input" placeholder="Ej. 81 1234 5678" autocomplete="tel">
              </div>
            </div>

            <div class="auth-form-group">
              <label class="auth-form-label" for="reg-password">Contraseña (Mínimo 6 caracteres)</label>
              <div class="auth-input-wrapper">
                <input type="password" id="reg-password" class="auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password">
                <button type="button" class="auth-toggle-pwd" data-target="reg-password" aria-label="Ver contraseña">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            <button type="submit" class="auth-submit-btn" id="btn-submit-register">
              <span>Crear Cuenta Gratis</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- MODAL DE MIS VISITAS (USUARIO) -->
    <div class="gk-modal-backdrop" id="gk-my-visits-modal" role="dialog" aria-modal="true">
      <div class="gk-modal-dialog gk-modal-dialog-large">
        <button type="button" class="gk-modal-close" id="gk-my-visits-close">&times;</button>
        <div class="admin-modal-header">
          <h2 class="admin-header-title">📅 Mis Visitas Agendadas</h2>
        </div>
        <div class="admin-body">
          <div id="my-visits-list">Cargando tus citas...</div>
        </div>
      </div>
    </div>

    <!-- MODAL DE PANEL DE ADMINISTRACIÓN (ADMINISTRADOR) -->
    <div class="gk-modal-backdrop" id="gk-admin-modal" role="dialog" aria-modal="true">
      <div class="gk-modal-dialog gk-modal-dialog-large">
        <button type="button" class="gk-modal-close" id="gk-admin-close">&times;</button>

        <div class="admin-modal-header">
          <h2 class="admin-header-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Panel de Administración - Inmobiliaria GreenKey
          </h2>
          <span id="admin-mongo-indicator" class="user-role-pill admin">Servicio activo</span>
        </div>

        <div class="admin-nav-tabs">
          <button type="button" class="admin-tab-btn is-active" data-admin-tab="metrics">📊 Resumen General</button>
          <button type="button" class="admin-tab-btn" data-admin-tab="visits">📅 Agenda de visitas <span class="admin-pending-count" data-admin-pending-count hidden></span></button>
          <button type="button" class="admin-tab-btn" data-admin-tab="consignments">📝 Consignaciones</button>
          <button type="button" class="admin-tab-btn" data-admin-tab="new-property">➕ Nueva Propiedad</button>
        </div>

        <div class="admin-body">
          <!-- Tab 1: Métricas -->
          <div id="admin-tab-metrics" class="admin-view-panel">
            <div class="admin-metrics-grid" id="admin-metrics-container">
              Cargando métricas...
            </div>
            <h3 style="font-size: 1.05rem; margin-bottom: 12px; color: #1b4332;">Estado del servicio</h3>
            <div id="admin-db-info" style="background: #f8faf6; padding: 14px 18px; border-radius: 10px; font-size: 0.9rem; border: 1px solid #dce5d4;">
              Consultando estado...
            </div>
          </div>

          <!-- Tab 2: Visitas -->
          <div id="admin-tab-visits" class="admin-view-panel" style="display: none;">
            <div class="admin-visits-toolbar">
              <label for="admin-visits-date-filter">Ver agenda del día</label>
              <input type="date" id="admin-visits-date-filter" class="auth-input">
              <button type="button" class="btn btn-outline-dark btn-sm" id="admin-visits-show-all">Ver todas</button>
              <span id="admin-visits-pending-summary" aria-live="polite"></span>
            </div>
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Fecha solicitada</th>
                    <th>Propiedad</th>
                    <th>Cliente</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Agenda confirmada</th>
                  </tr>
                </thead>
                <tbody id="admin-visits-tbody">
                  <tr><td colspan="6" style="text-align: center;">Cargando visitas...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 3: Consignaciones -->
          <div id="admin-tab-consignments" class="admin-view-panel" style="display: none;">
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Propietario</th>
                    <th>Tipo / Zona</th>
                    <th>Precio Pretendido</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody id="admin-consignments-tbody">
                  <tr><td colspan="6" style="text-align: center;">Cargando consignaciones...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab 4: Crear Propiedad -->
          <div id="admin-tab-new-property" class="admin-view-panel" style="display: none;">
            <form id="admin-create-property-form" class="admin-form-grid">
              <div class="auth-form-group admin-form-full">
                <label class="auth-form-label">Título de la Propiedad *</label>
                <input type="text" name="title" class="auth-input" placeholder="Ej. Residencia San Patricio" required>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Operación *</label>
                <select name="operation" class="auth-input">
                  <option value="venta">Venta</option>
                  <option value="renta">Renta</option>
                </select>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Tipo de Inmueble *</label>
                <select name="type" class="auth-input">
                  <option value="casa">Casa</option>
                  <option value="departamento">Departamento</option>
                  <option value="loft">Loft</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Precio en MXN *</label>
                <input type="number" name="price" class="auth-input" placeholder="Ej. 4500000" required>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Ubicación / Colonia *</label>
                <input type="text" name="location" class="auth-input" placeholder="Ej. Cumbres, Monterrey, N.L." required>
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Recámaras</label>
                <input type="number" name="bedrooms" class="auth-input" placeholder="3" value="3">
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Baños</label>
                <input type="number" step="0.5" name="bathrooms" class="auth-input" placeholder="2.5" value="2.5">
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Área Construida (m²)</label>
                <input type="number" name="areaM2" class="auth-input" placeholder="200" value="200">
              </div>

              <div class="auth-form-group">
                <label class="auth-form-label">Cajones de Estacionamiento</label>
                <input type="number" name="parking" class="auth-input" placeholder="2" value="2">
              </div>

              <div class="auth-form-group admin-form-full">
                <label class="auth-form-label">URL de Fotografía Principal</label>
                <input type="url" name="imageUrl" class="auth-input" placeholder="https://images.unsplash.com/photo-..." value="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80">
              </div>

              <div class="auth-form-group admin-form-full">
                <label class="auth-form-label">Descripción</label>
                <textarea name="description" class="auth-input" rows="3" placeholder="Detalles de la propiedad..."></textarea>
              </div>

              <div class="admin-form-full" style="margin-top: 10px;">
                <button type="submit" class="auth-submit-btn">Guardar propiedad</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);
}

/**
 * Renderiza el estado del botón en la barra de navegación
 */
function renderNavbarAuth() {
  const navContainer = document.querySelector('.nav-content');
  if (!navContainer) return;

  const showAdminLinks = Boolean(verifiedAdminSession && window.gkApi?.isAdmin());
  document.querySelectorAll('[data-admin-only-link]').forEach((link) => {
    link.hidden = !showAdminLinks;
  });

  let authWrap = navContainer.querySelector('.nav-auth-wrap');
  if (!authWrap) {
    authWrap = document.createElement('div');
    authWrap.className = 'nav-auth-wrap';
    const ctaBtn = navContainer.querySelector('.nav-cta-btn');
    if (ctaBtn) {
      navContainer.insertBefore(authWrap, ctaBtn);
    } else {
      navContainer.appendChild(authWrap);
    }
  }

  const user = window.gkApi.getUser();

  if (user) {
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const firstName = user.name.split(' ')[0];
    const isAdmin = verifiedAdminSession && user.role === 'admin';
    const roleLabel = isAdmin ? 'Admin' : user.role === 'agent' ? 'Agente' : 'Cliente';

    authWrap.innerHTML = `
      <div class="user-profile-badge" id="btn-user-profile" role="button" aria-haspopup="true" aria-expanded="false" tabindex="0">
        <div class="user-avatar-circle">${initials}</div>
        <span class="user-name-label">${firstName}</span>
        <span class="user-role-pill ${isAdmin ? 'admin' : 'client'}">${roleLabel}</span>
      </div>

      <div class="user-dropdown-menu" id="user-dropdown">
        <div class="dropdown-user-header">
          <div class="dropdown-user-name">${user.name}</div>
          <div class="dropdown-user-email">${user.email}</div>
        </div>

        ${isAdmin ? `
          <button type="button" class="user-dropdown-item" id="btn-open-admin">
            <span>👑</span> <strong>Panel de Control Admin</strong>
            <span class="admin-pending-count" data-admin-pending-count hidden></span>
          </button>
        ` : ''}

        <button type="button" class="user-dropdown-item" id="btn-open-my-visits">
          <span>📅</span> Mis Visitas Agendadas
        </button>

        <a href="/favoritos" class="user-dropdown-item">
          <span>⭐</span> Ver mis favoritos
        </a>

        <button type="button" class="user-dropdown-item text-danger" id="btn-logout">
          <span>🚪</span> Cerrar Sesión
        </button>
      </div>
    `;

    // Dropdown toggle
    const badge = document.getElementById('btn-user-profile');
    const dropdown = document.getElementById('user-dropdown');

    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!authWrap.contains(e.target)) {
        dropdown.classList.remove('is-open');
      }
    });

    // Abrir mis visitas
    const btnMyVisits = document.getElementById('btn-open-my-visits');
    if (btnMyVisits) {
      btnMyVisits.addEventListener('click', () => {
        dropdown.classList.remove('is-open');
        openMyVisitsModal();
      });
    }

    // Abrir admin modal
    const btnAdmin = document.getElementById('btn-open-admin');
    if (btnAdmin) {
      btnAdmin.addEventListener('click', () => {
        dropdown.classList.remove('is-open');
        openAdminModal();
      });
    }

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
      dropdown.classList.remove('is-open');
      window.gkApi.logout();
      window.gkApi.showToast('Has cerrado sesión correctamente.', 'info');
    });

  } else {
    // Si no ha iniciado sesión
    authWrap.innerHTML = `
      <a class="btn-nav-login" id="btn-open-login" href="/login">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Iniciar sesión</span>
      </a>
    `;
  }

  // Actualizar también en el menú móvil drawer si existe
  renderMobileDrawerAuth(user);
}

function renderMobileDrawerAuth(user) {
  const drawer = document.getElementById('mobile-drawer');
  if (!drawer) return;

  let drawerAuth = drawer.querySelector('.drawer-auth-item');
  if (!drawerAuth) {
    drawerAuth = document.createElement('div');
    drawerAuth.className = 'drawer-auth-item';
    drawerAuth.style.padding = '12px 0';
    drawerAuth.style.borderTop = '1px solid rgba(255,255,255,0.15)';
    drawer.appendChild(drawerAuth);
  }

  if (user) {
    drawerAuth.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">👤 ${user.name} (${user.role === 'admin' ? 'Admin' : 'Cliente'})</div>
      ${user.role === 'admin' ? '<a href="#" id="mobile-btn-admin" style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">👑 Panel Administrativo <span class="admin-pending-count" data-admin-pending-count hidden></span></a>' : ''}
      <a href="/favoritos" style="display: block; margin-bottom: 6px;">⭐ Ver mis favoritos</a>
      <a href="#" id="mobile-btn-my-visits" style="display: block; margin-bottom: 6px;">📅 Mis Citas Agendadas</a>
      <a href="#" id="mobile-btn-logout" style="color: #ff9999;">🚪 Cerrar Sesión</a>
    `;

    drawer.querySelector('#mobile-btn-my-visits')?.addEventListener('click', (e) => {
      e.preventDefault();
      drawer.classList.remove('open');
      openMyVisitsModal();
    });

    drawer.querySelector('#mobile-btn-admin')?.addEventListener('click', (e) => {
      e.preventDefault();
      drawer.classList.remove('open');
      openAdminModal();
    });

    drawer.querySelector('#mobile-btn-logout')?.addEventListener('click', (e) => {
      e.preventDefault();
      drawer.classList.remove('open');
      window.gkApi.logout();
      window.gkApi.showToast('Sesión cerrada.', 'info');
    });
  } else {
    drawerAuth.innerHTML = `
      <a class="btn btn-primary" id="mobile-btn-login" href="/login" style="width: 100%; justify-content: center;">
        Iniciar Sesión / Crear Cuenta
      </a>
    `;
  }
}

/**
 * Control del modal y de tabs de Login / Registro
 */
function bindModalTriggers() {
  const modal = document.getElementById('gk-auth-modal');
  const modalDialog = modal.querySelector('.gk-modal-dialog');
  const closeBtn = document.getElementById('gk-auth-close');
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const subtitle = document.getElementById('gk-auth-subtitle');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => setAuthModalOpen(false));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) setAuthModalOpen(false);
    });
  }

  // Alternar Tabs
  tabLogin.addEventListener('click', () => {
    modalDialog.classList.remove('is-register');
    tabLogin.classList.add('is-active');
    tabRegister.classList.remove('is-active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
    subtitle.textContent = 'Accede a tu cuenta para gestionar favoritos y visitas';
  });

  tabRegister.addEventListener('click', () => {
    modalDialog.classList.add('is-register');
    tabRegister.classList.add('is-active');
    tabLogin.classList.remove('is-active');
    formLogin.style.display = 'none';
    formRegister.style.display = 'block';
    subtitle.textContent = 'Crea tu cuenta en segundos para agendar visitas';
  });

  // Mostrar / ocultar contraseña
  document.querySelectorAll('.auth-toggle-pwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
    });
  });

  document.getElementById('gk-forgot-password')?.addEventListener('click', event => {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value.trim() || '';
    const subject = encodeURIComponent('Solicitud de recuperación de cuenta Aisa');
    const accountEmail = email ? ` Correo de registro: ${email}.` : '';
    const body = encodeURIComponent(`Hola, necesito ayuda para recuperar el acceso a mi cuenta de Aisa.${accountEmail}`);
    window.location.href = `mailto:aisainmobiliaria9@gmail.com?subject=${subject}&body=${body}`;
  });

  // Envío Formulario Login
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-submit-login');

    try {
      btn.disabled = true;
      btn.innerHTML = '<span>Verificando credenciales...</span>';

      const res = await window.gkApi.login(email, password);
      setAuthModalOpen(false);
      window.gkApi.showToast(res.message || '¡Sesión iniciada con éxito!', 'success');
      if (!redirectAfterAuth()) {
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: res.user } }));
      }
    } catch (err) {
      window.gkApi.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Ingresar a mi cuenta</span>';
    }
  });

  // Envío Formulario Registro
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-submit-register');

    try {
      btn.disabled = true;
      btn.innerHTML = '<span>Creando tu cuenta...</span>';

      const res = await window.gkApi.register(name, email, password, phone);
      setAuthModalOpen(false);
      window.gkApi.showToast(res.message || '¡Cuenta creada con éxito!', 'success');
      if (!redirectAfterAuth()) {
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { user: res.user } }));
      }
    } catch (err) {
      window.gkApi.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Crear Cuenta Gratis</span>';
    }
  });

}

let authModalScrollY = 0;

function setAuthModalOpen(isOpen) {
  const modal = document.getElementById('gk-auth-modal');
  if (!modal) return;

  if (isOpen) {
    if (modal.classList.contains('is-open')) return;
    authModalScrollY = window.scrollY;
    document.documentElement.style.setProperty('--gk-auth-scroll-y', `${authModalScrollY}px`);
    document.documentElement.classList.add('gk-auth-modal-open');
    document.body.classList.add('gk-auth-modal-open');
    modal.classList.add('is-open');
    return;
  }

  if (!modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  document.documentElement.classList.remove('gk-auth-modal-open');
  document.body.classList.remove('gk-auth-modal-open');
  document.documentElement.style.removeProperty('--gk-auth-scroll-y');
  window.scrollTo(0, authModalScrollY);
}

function openLoginModal() {
  setAuthModalOpen(true);
}

function redirectAfterAuth() {
  const returnTo = new URLSearchParams(window.location.search).get('returnTo');
  if (!returnTo) return false;

  try {
    const destination = new URL(returnTo, window.location.origin);
    if (destination.origin !== window.location.origin) return false;
    window.location.assign(`${destination.pathname}${destination.search}${destination.hash}`);
    return true;
  } catch (error) {
    return false;
  }
}

function openAuthRoute() {
  if (window.location.pathname.replace(/\/+$/, '') !== '/login') return;

  openLoginModal();
  if (new URLSearchParams(window.location.search).get('tab') === 'register') {
    document.getElementById('tab-btn-register')?.click();
  }
}

/**
 * Modal de Mis Visitas Agendadas
 */
async function openMyVisitsModal() {
  const modal = document.getElementById('gk-my-visits-modal');
  const closeBtn = document.getElementById('gk-my-visits-close');
  const list = document.getElementById('my-visits-list');

  modal.classList.add('is-open');
  closeBtn.onclick = () => modal.classList.remove('is-open');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('is-open'); };

  list.innerHTML = '<p style="text-align: center; color: #666;">Cargando tus visitas...</p>';

  try {
    const res = await window.gkApi.getVisits();
    const visits = res.data || [];

    if (visits.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <p style="font-size: 1.1rem; color: #2d6a4f; font-weight: 600;">No tienes visitas agendadas aún.</p>
          <p style="color: #666; font-size: 0.9rem;">Explora nuestro catálogo en Monterrey y agenda una cita presencial con tu asesor.</p>
          <a href="/compra" class="btn btn-primary" style="margin-top: 14px; display: inline-block;">Ver propiedades en venta</a>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Fecha y Horario</th>
              <th>Propiedad</th>
              <th>Teléfono registrado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${visits.map(v => `
              <tr>
                <td>${v.status === 'confirmada' && v.scheduledDate && v.scheduledTime
                  ? `<strong>Confirmada: ${escapeHtml(v.scheduledDate)}</strong><br><small style="color: #2b7a4b;">${escapeHtml(v.scheduledTime)}</small><br><small>Solicitada: ${escapeHtml(v.date)} · ${escapeHtml(v.time)}</small>`
                  : `<strong>Solicitada: ${escapeHtml(v.date)}</strong><br><small style="color: #666;">${escapeHtml(v.time)}</small>`}</td>
                <td><strong>${escapeHtml(v.propertyTitle)}</strong></td>
                <td>${escapeHtml(v.clientPhone)}</td>
                <td><span class="status-badge ${v.status}">${v.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    list.innerHTML = `<p style="color: red; text-align: center;">Error al cargar visitas: ${err.message}</p>`;
  }
}

/**
 * Panel de Administración
 */
async function openAdminModal() {
  const modal = document.getElementById('gk-admin-modal');
  const closeBtn = document.getElementById('gk-admin-close');
  modal.classList.add('is-open');

  closeBtn.onclick = () => modal.classList.remove('is-open');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('is-open'); };

  const dateFilter = document.getElementById('admin-visits-date-filter');
  const showAllVisits = document.getElementById('admin-visits-show-all');
  if (dateFilter) dateFilter.onchange = loadAdminVisits;
  if (showAllVisits) {
    showAllVisits.onclick = () => {
      if (dateFilter) dateFilter.value = '';
      loadAdminVisits();
    };
  }
  syncAdminVisitNotifications();

  // Control de Tabs en Admin
  const adminTabs = modal.querySelectorAll('.admin-tab-btn');
  adminTabs.forEach(btn => {
    btn.onclick = () => {
      adminTabs.forEach(t => t.classList.remove('is-active'));
      btn.classList.add('is-active');

      const target = btn.dataset.adminTab;
      modal.querySelectorAll('.admin-view-panel').forEach(panel => {
        panel.style.display = panel.id === `admin-tab-${target}` ? 'block' : 'none';
      });

      if (target === 'visits') loadAdminVisits();
      if (target === 'consignments') loadAdminConsignments();
    };
  });

  // Cargar métricas iniciales
  loadAdminMetrics();

  // Formulario de nueva propiedad
  const newPropForm = document.getElementById('admin-create-property-form');
  newPropForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(newPropForm);
    const payload = Object.fromEntries(formData.entries());
    payload.images = [payload.imageUrl];

    try {
      window.gkApi.showToast('Guardando propiedad...', 'info');
      const res = await window.gkApi.createProperty(payload);
      window.gkApi.showToast(res.message || '¡Propiedad creada!', 'success');
      newPropForm.reset();
      loadAdminMetrics();
    } catch (err) {
      window.gkApi.showToast(err.message, 'error');
    }
  };
}

async function loadAdminMetrics() {
  const container = document.getElementById('admin-metrics-container');
  const dbInfo = document.getElementById('admin-db-info');
  const indicator = document.getElementById('admin-mongo-indicator');

  try {
    const res = await window.gkApi.getAdminSummary();
    const m = res.metrics;
    const db = res.dbStatus;

    indicator.textContent = db.isMongoConnected ? 'Servicio conectado' : 'Modo de respaldo';
    indicator.className = `user-role-pill ${db.isMongoConnected ? 'admin' : 'client'}`;

    container.innerHTML = `
      <div class="admin-metric-card">
        <div class="admin-metric-label">Propiedades</div>
        <div class="admin-metric-value">${m.totalProperties}</div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-label">Visitas Totales</div>
        <div class="admin-metric-value">${m.totalVisits}</div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-label">Visitas Pendientes</div>
        <div class="admin-metric-value" style="color: #b45309;">${m.pendingVisits}</div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-label">Consignaciones</div>
        <div class="admin-metric-value">${m.totalConsignments}</div>
      </div>
      <div class="admin-metric-card">
        <div class="admin-metric-label">Usuarios Registrados</div>
        <div class="admin-metric-value">${m.totalUsers}</div>
      </div>
    `;

    dbInfo.innerHTML = `
      <strong>Estado del sistema:</strong> ${db.isMongoConnected ? 'Servicio conectado y operativo' : 'Modo de respaldo local activo'}<br>
      <strong>Servidor:</strong> Servicio Aisa activo.
    `;
  } catch (err) {
    container.innerHTML = `<p style="color: red;">Error al consultar métricas: ${err.message}</p>`;
  }
}

async function loadAdminVisits() {
  const tbody = document.getElementById('admin-visits-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando agenda...</td></tr>';

  try {
    const res = await window.gkApi.getVisits();
    const visits = res.data || [];
    const dateFilter = document.getElementById('admin-visits-date-filter')?.value || '';
    const pendingCount = visits.filter(visit => visit.status === 'pendiente').length;
    updateAdminPendingBadges(pendingCount);

    const pendingSummary = document.getElementById('admin-visits-pending-summary');
    if (pendingSummary) pendingSummary.textContent = `${pendingCount} solicitudes pendientes`;

    const visibleVisits = visits
      .filter(visit => !dateFilter || (visit.scheduledDate || visit.date) === dateFilter)
      .sort((first, second) => `${first.scheduledDate || first.date} ${first.scheduledTime || ''}`.localeCompare(`${second.scheduledDate || second.date} ${second.scheduledTime || ''}`));

    if (!visibleVisits.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666;">${dateFilter ? 'No hay visitas para ese día.' : 'No hay solicitudes de visita registradas.'}</td></tr>`;
      return;
    }

    tbody.innerHTML = visibleVisits.map(visit => `
      <tr>
        <td><strong>${escapeHtml(visit.date)}</strong><br><small>${escapeHtml(visit.time)}</small></td>
        <td><strong>${escapeHtml(visit.propertyTitle)}</strong>${visit.propertyPrice ? `<br><small>${escapeHtml(visit.propertyPrice)}</small>` : ''}</td>
        <td>${escapeHtml(visit.clientName)}</td>
        <td><a href="tel:${String(visit.clientPhone || '').replace(/[^0-9+]/g, '')}">${escapeHtml(visit.clientPhone)}</a></td>
        <td><span class="status-badge ${escapeHtml(visit.status)}">${escapeHtml(visit.status)}</span></td>
        <td>
          <div class="admin-visit-schedule-controls">
            <label>Fecha
              <input type="date" class="auth-input" data-scheduled-date value="${escapeHtml(visit.scheduledDate || visit.date)}">
            </label>
            <label>Hora
              <input type="time" class="auth-input" data-scheduled-time value="${escapeHtml(visit.scheduledTime || '')}">
            </label>
            <select class="auth-input" data-visit-status aria-label="Estado de visita">
              <option value="pendiente" ${visit.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
              <option value="confirmada" ${visit.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
              <option value="realizada" ${visit.status === 'realizada' ? 'selected' : ''}>Realizada</option>
              <option value="cancelada" ${visit.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
            </select>
            <button type="button" class="btn btn-primary btn-sm admin-visit-save" data-visit-id="${escapeHtml(visit._id)}">Guardar</button>
          </div>
          ${visit.scheduledDate && visit.scheduledTime ? `<small class="admin-visit-confirmed">Agendada: ${escapeHtml(visit.scheduledDate)} · ${escapeHtml(visit.scheduledTime)}</small>` : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.admin-visit-save').forEach(button => {
      button.addEventListener('click', () => saveAdminVisit(button));
    });
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function saveAdminVisit(button) {
  const row = button.closest('tr');
  const status = row.querySelector('[data-visit-status]').value;
  const scheduledDate = row.querySelector('[data-scheduled-date]').value;
  const scheduledTime = row.querySelector('[data-scheduled-time]').value;

  if (status === 'confirmada' && (!scheduledDate || !scheduledTime)) {
    window.gkApi.showToast('Selecciona la fecha y hora acordadas antes de confirmar.', 'error');
    return;
  }

  button.disabled = true;
  try {
    await window.gkApi.updateVisitStatus(button.dataset.visitId, { status, scheduledDate, scheduledTime });
    window.gkApi.showToast(status === 'confirmada' ? 'Visita confirmada y agenda actualizada.' : 'Agenda de visita actualizada.', 'success');
    await loadAdminVisits();
    loadAdminMetrics();
  } catch (error) {
    window.gkApi.showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function loadAdminConsignments() {
  const tbody = document.getElementById('admin-consignments-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando solicitudes...</td></tr>';

  try {
    const res = await window.gkApi.getConsignments();
    const items = res.data || [];

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No hay solicitudes de venta registradas aún.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(c => `
      <tr>
        <td>${new Date(c.createdAt).toLocaleDateString()}</td>
        <td><strong>${c.ownerName}</strong></td>
        <td>${c.propertyType} en ${c.zone}</td>
        <td><strong style="color: #1b4332;">${c.expectedPrice}</strong></td>
        <td><a href="https://wa.me/${c.phone.replace(/[^0-9]/g, '')}" target="_blank" style="color: #2d6a4f; font-weight: 600;">${c.phone} 💬</a></td>
        <td><span class="status-badge ${c.status}">${c.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">${err.message}</td></tr>`;
  }
}

async function checkCurrentSession() {
  verifiedAdminSession = false;
  const user = window.gkApi.isAuthenticated() ? await window.gkApi.getMe() : null;
  verifiedAdminSession = user?.role === 'admin';
  renderNavbarAuth();
  syncAdminVisitNotifications();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function updateAdminPendingBadges(count) {
  document.querySelectorAll('[data-admin-pending-count]').forEach(badge => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
}

function syncAdminVisitNotifications() {
  if (!verifiedAdminSession || !window.gkApi?.isAdmin()) {
    if (adminVisitPollingTimer) window.clearInterval(adminVisitPollingTimer);
    adminVisitPollingTimer = null;
    knownPendingAdminVisits = null;
    updateAdminPendingBadges(0);
    return;
  }

  if (adminVisitPollingTimer) return;

  const pollPendingVisits = async () => {
    try {
      const response = await window.gkApi.getVisits();
      const pendingVisits = (response.data || []).filter(visit => visit.status === 'pendiente');
      const pendingIds = new Set(pendingVisits.map(visit => String(visit._id)));
      updateAdminPendingBadges(pendingIds.size);

      if (knownPendingAdminVisits) {
        const newRequests = pendingVisits.filter(visit => !knownPendingAdminVisits.has(String(visit._id)));
        if (newRequests.length) {
          window.gkApi.showToast(`${newRequests.length} nueva${newRequests.length === 1 ? '' : 's'} solicitud${newRequests.length === 1 ? '' : 'es'} de visita por revisar.`, 'info');
        }
      }

      knownPendingAdminVisits = pendingIds;
    } catch (error) {
      // El indicador vuelve a intentarlo en el siguiente ciclo.
    }
  };

  pollPendingVisits();
  adminVisitPollingTimer = window.setInterval(pollPendingVisits, 45000);
}
