document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const $ = (id) => document.getElementById(id);

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function showNotice(message, success = false) {
    const notice = $('notice');
    notice.textContent = message;
    notice.classList.toggle('success', success);
    notice.hidden = false;
  }

  function setConnection(online, text) {
    const element = $('connection-status');
    element.classList.toggle('is-online', online);
    element.classList.toggle('is-offline', !online);
    element.lastChild.textContent = ` ${text}`;
  }

  function loginPrompt() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'agenda-auth-overlay';
      overlay.innerHTML = `
        <form class="agenda-auth-card" id="appraisal-login-form">
          <img src="/assets/aisa-symbol.png" alt="" class="agenda-auth-logo">
          <p class="eyebrow">ACCESO CONFIDENCIAL</p>
          <h1>Solicitudes de avalúo</h1>
          <p class="welcome-copy">Inicia sesión con una cuenta administradora. Estos datos no son parte del catálogo público.</p>
          <label class="field">Correo electrónico<input name="email" type="email" autocomplete="username" required></label>
          <label class="field">Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
          <p class="agenda-auth-error" id="login-error" role="alert" hidden></p>
          <button class="button button-primary" type="submit">Entrar</button>
          <a href="/" class="agenda-auth-back">Volver a Aisa</a>
        </form>`;
      document.body.append(overlay);
      overlay.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
          const result = await api.login(form.elements.email.value.trim(), form.elements.password.value);
          if (result.user?.role !== 'admin') {
            throw new Error('Esta cuenta no tiene permisos de administrador. La sesión de cliente se conserva al volver a Aisa.');
          }
          overlay.remove();
          resolve(true);
        } catch (error) {
          const message = $('login-error');
          message.textContent = error.message || 'No se pudo iniciar sesión.';
          message.hidden = false;
          button.disabled = false;
        }
      });
    });
  }

  async function authenticate() {
    if (!api) throw new Error('No se pudo cargar el cliente de API.');
    let user = api.isAuthenticated() ? await api.getMe() : null;
    if (user && user.role !== 'admin') {
      window.location.replace('/');
      return false;
    }
    if (!user) {
      await loginPrompt();
      user = await api.getMe();
    }
    if (user?.role !== 'admin') {
      window.location.replace('/');
      return false;
    }
    document.documentElement.classList.remove('agenda-auth-pending');
    document.documentElement.classList.add('agenda-authenticated');
    $('avatar').textContent = (user.name || 'A').trim().charAt(0).toUpperCase();
    $('avatar').addEventListener('click', () => {
      api.logout();
      window.location.assign('/');
    });
    return true;
  }

  async function loadRequests() {
    $('refresh-button').disabled = true;
    setConnection(false, 'Sincronizando...');
    try {
      const result = await api.getAppraisalRequests();
      renderRequests(result.data || []);
      setConnection(true, 'Conectado');
    } catch (error) {
      setConnection(false, 'Sin conexión');
      showNotice(error.message || 'No se pudieron cargar las solicitudes.');
    } finally {
      $('refresh-button').disabled = false;
    }
  }

  function renderRequests(requests) {
    $('request-count').textContent = `${requests.length} ${requests.length === 1 ? 'solicitud' : 'solicitudes'}`;
    $('request-list').innerHTML = requests.length ? requests.map((request) => {
      const created = new Date(request.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <article class="request-card">
          <div class="request-card-head"><h3>${escapeHTML(request.beneficiaryName)}</h3><time>${escapeHTML(created)}</time></div>
          <address>${escapeHTML(request.propertyStreet)}, ${escapeHTML(request.propertyNeighborhood)}, ${escapeHTML(request.municipality)}, ${escapeHTML(request.state)} ${escapeHTML(request.postalCode)}</address>
          <div class="request-card-contact">
            <span><strong>Derechohabiente:</strong> ${escapeHTML(request.beneficiaryPhone)}</span>
            ${request.propertyOwnerName ? `<span><strong>Propietario:</strong> ${escapeHTML(request.propertyOwnerName)}${request.propertyOwnerPhone ? ` · ${escapeHTML(request.propertyOwnerPhone)}` : ''}</span>` : ''}
            ${request.propertyAgeYears !== null && request.propertyAgeYears !== undefined ? `<span><strong>Antigüedad:</strong> ${escapeHTML(request.propertyAgeYears)} años</span>` : ''}
            ${request.creditPurpose ? `<span><strong>Destino:</strong> ${escapeHTML(request.creditPurpose)}</span>` : ''}
            ${request.documentsPresented?.length ? `<span><strong>Documentación:</strong> ${request.documentsPresented.map(escapeHTML).join(', ')}</span>` : ''}
            ${request.notes ? `<span><strong>Notas:</strong> ${escapeHTML(request.notes)}</span>` : ''}
          </div>
          <span class="request-status">${escapeHTML(request.status.replace('_', ' '))}</span>
        </article>`;
    }).join('') : '<div class="empty-state">Todavía no hay solicitudes privadas registradas.</div>';
  }

  async function saveRequest(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const documentsPresented = formData.getAll('documentsPresented');
    const data = Object.fromEntries(formData.entries());
    data.documentsPresented = documentsPresented;
    data.propertyAgeYears = data.propertyAgeYears === '' ? null : Number(data.propertyAgeYears);

    const button = $('save-button');
    button.disabled = true;
    button.textContent = 'Guardando de forma segura…';
    try {
      const result = await api.createAppraisalRequest(data);
      form.reset();
      form.elements.state.value = 'Nuevo León';
      showNotice(result.message || 'Solicitud registrada correctamente.', true);
      await loadRequests();
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar la solicitud.');
    } finally {
      button.disabled = false;
      button.textContent = 'Guardar solicitud privada';
    }
  }

  async function init() {
    try {
      if (!await authenticate()) return;
      $('appraisal-form').addEventListener('submit', saveRequest);
      $('refresh-button').addEventListener('click', loadRequests);
      await loadRequests();
    } catch (error) {
      setConnection(false, 'Error');
      showNotice(error.message || 'No se pudo abrir la sección privada.');
    }
  }

  init();
});
