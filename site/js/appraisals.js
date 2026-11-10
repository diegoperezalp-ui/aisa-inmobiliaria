document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const $ = (id) => document.getElementById(id);

  const state = {
    requests: [],
    activeFilter: 'all',
    searchQuery: '',
    selectedRequest: null
  };

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function showNotice(message, success = false) {
    const notice = $('notice');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle('success', success);
    notice.hidden = false;
    if (success) {
      setTimeout(() => { notice.hidden = true; }, 5000);
    }
  }

  function setConnection(online, text) {
    const element = $('connection-status');
    if (!element) return;
    element.classList.toggle('is-online', online);
    element.classList.toggle('is-offline', !online);
    element.lastChild.textContent = ` ${text}`;
  }

  /* ==========================================================================
     MANEJO DE TEMAS (DARK OBSIDIAN / LIGHT PASTEL CON DIFUMINADOS ROSAS)
     ========================================================================== */
  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    const isDark = nextTheme === 'dark';
    const icon = $('theme-toggle-icon');
    const label = $('theme-toggle-label');
    const toggle = $('theme-toggle');

    if (icon) icon.textContent = isDark ? '☀' : '☾';
    if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    if (toggle) toggle.setAttribute('aria-label', `Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`);
    
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = isDark ? '#0b1116' : '#faf6f8';

    if (persist) {
      try {
        localStorage.setItem('aisa-agenda-theme', nextTheme);
      } catch {}
    }
  }

  /* ==========================================================================
     AUTENTICACIÓN DE ADMINISTRADOR
     ========================================================================== */
  function loginPrompt() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'agenda-auth-overlay';
      overlay.innerHTML = `
        <form class="agenda-auth-card" id="appraisal-login-form">
          <img src="/assets/aisa-symbol.png" alt="Aisa" class="agenda-auth-logo">
          <p class="eyebrow">ACCESO CONFIDENCIAL</p>
          <h1>Solicitudes de avalúo</h1>
          <p class="welcome-copy">Inicia sesión con tu cuenta administradora de Aisa. Esta área es privada y confidencial.</p>
          <label class="field"><span>Correo electrónico</span><input name="email" type="email" autocomplete="username" required></label>
          <label class="field"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
          <p class="agenda-auth-error" id="login-error" role="alert" hidden></p>
          <button class="button button-primary btn btn-primary" type="submit">Entrar al sistema</button>
          <a href="/" class="agenda-auth-back">Volver a Aisa</a>
        </form>`;
      document.body.append(overlay);

      overlay.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Verificando…';
        try {
          const result = await api.login(form.elements.email.value.trim(), form.elements.password.value);
          if (result.user?.role !== 'admin') {
            throw new Error('Esta cuenta no tiene permisos de administrador.');
          }
          overlay.remove();
          resolve(true);
        } catch (error) {
          const message = $('login-error');
          message.textContent = error.message || 'No se pudo iniciar sesión.';
          message.hidden = false;
          button.disabled = false;
          button.textContent = 'Entrar al sistema';
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
    const avatar = $('avatar');
    if (avatar) avatar.textContent = (user.name || 'A').trim().charAt(0).toUpperCase();
    return true;
  }

  /* ==========================================================================
     CARGA Y GESTIÓN DE SOLICITUDES
     ========================================================================== */
  async function loadRequests() {
    const refreshBtn = $('refresh-button');
    if (refreshBtn) refreshBtn.disabled = true;
    setConnection(false, 'Sincronizando...');
    try {
      const result = await api.getAppraisalRequests();
      state.requests = Array.isArray(result.data) ? result.data : [];
      render();
      setConnection(true, 'Conectado');
    } catch (error) {
      setConnection(false, 'Sin conexión');
      showNotice(error.message || 'No se pudieron consultar las solicitudes.');
      render();
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  function getFolio(request, index) {
    if (request.folio) return request.folio;
    const year = new Date(request.createdAt || Date.now()).getFullYear();
    const idSuffix = String(request._id || '').slice(-4).toUpperCase() || String(index + 1).padStart(4, '0');
    return `AV-${year}-${idSuffix}`;
  }

  function render() {
    renderMetrics();
    renderRequests();
  }

  function renderMetrics() {
    const total = state.requests.length;
    const pending = state.requests.filter((r) => !r.status || r.status === 'pendiente').length;
    const review = state.requests.filter((r) => r.status === 'en_revision').length;
    const completed = state.requests.filter((r) => r.status === 'completada').length;

    $('metric-total').textContent = total;
    $('metric-pending').textContent = pending;
    $('metric-review').textContent = review;
    $('metric-completed').textContent = completed;

    $('tab-count-all').textContent = total;
    $('tab-count-pending').textContent = pending;
    $('tab-count-review').textContent = review;
    $('tab-count-completed').textContent = completed;
  }

  function filteredRequests() {
    const query = state.searchQuery.trim().toLowerCase();
    return state.requests.filter((request, index) => {
      const matchesFilter = state.activeFilter === 'all' 
        ? true 
        : (request.status || 'pendiente') === state.activeFilter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const folio = getFolio(request, index).toLowerCase();
      const text = [
        folio,
        request.beneficiaryName,
        request.beneficiaryPhone,
        request.propertyStreet,
        request.propertyNeighborhood,
        request.municipality,
        request.creditPurpose,
        request.propertyOwnerName
      ].filter(Boolean).join(' ').toLowerCase();

      return text.includes(query);
    });
  }

  function renderRequests() {
    const list = $('request-list');
    const items = filteredRequests();

    if (!items.length) {
      list.innerHTML = `<div class="empty-state">No se encontraron solicitudes con los filtros actuales.</div>`;
      return;
    }

    list.innerHTML = items.map((request, index) => {
      const folio = getFolio(request, index);
      const createdDate = new Date(request.createdAt || Date.now()).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const status = request.status || 'pendiente';
      const statusText = status === 'en_revision' ? 'En revisión' : status === 'completada' ? 'Completada' : status === 'cancelada' ? 'Cancelada' : 'Pendiente';
      const cleanPhone = (request.beneficiaryPhone || '').replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/52${cleanPhone}` : '';

      return `
        <article class="request-card" data-card-id="${escapeHTML(request._id || index)}">
          <div class="request-card-head">
            <div>
              <span class="request-folio-tag">${escapeHTML(folio)}</span>
              <h3>${escapeHTML(request.beneficiaryName)}</h3>
            </div>
            <time>${escapeHTML(createdDate)}</time>
          </div>

          <address>${escapeHTML(request.propertyStreet)}, ${escapeHTML(request.propertyNeighborhood)}, ${escapeHTML(request.municipality)}, ${escapeHTML(request.state || 'N.L.')} ${escapeHTML(request.postalCode || '')}</address>

          <div class="request-card-info-grid">
            <div class="info-item">
              <span>Derechohabiente:</span>
              <span>${escapeHTML(request.beneficiaryPhone)} ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="wa-link" title="Contactar por WhatsApp">💬 WhatsApp</a>` : ''}</span>
            </div>
            <div class="info-item">
              <span>Destino:</span>
              <span>${escapeHTML(request.creditPurpose || 'Avalúo inmobiliario')}</span>
            </div>
            ${request.propertyOwnerName ? `
            <div class="info-item">
              <span>Propietario:</span>
              <span>${escapeHTML(request.propertyOwnerName)} ${request.propertyOwnerPhone ? `· ${escapeHTML(request.propertyOwnerPhone)}` : ''}</span>
            </div>` : ''}
            ${request.propertyAgeYears ? `
            <div class="info-item">
              <span>Antigüedad:</span>
              <span>${escapeHTML(request.propertyAgeYears)} años</span>
            </div>` : ''}
          </div>

          ${Array.isArray(request.documentsPresented) && request.documentsPresented.length ? `
          <div class="request-docs-chips">
            ${request.documentsPresented.map((doc) => `<span class="doc-chip">✓ ${escapeHTML(doc)}</span>`).join('')}
          </div>` : ''}

          ${request.notes ? `<div class="request-notes-box">📝 ${escapeHTML(request.notes)}</div>` : ''}

          <div class="request-card-foot">
            <span class="status ${status}">${escapeHTML(statusText)}</span>
            <div class="request-card-actions">
              <button class="button button-quiet button-small" type="button" data-action="status" data-id="${escapeHTML(request._id || index)}">
                ⚙️ Gestionar Estado
              </button>
              <button class="button button-secondary-glow button-small" type="button" data-action="print" data-id="${escapeHTML(request._id || index)}">
                🖨️ Imprimir / PDF
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /* ==========================================================================
     MODAL DE FORMATO OFICIAL PARA IMPRESIÓN Y PDF
     ========================================================================== */
  const STANDARD_DOCUMENTS = [
    'Escritura pública inscrita en RPP',
    'Boleta de Impuesto Predial al corriente',
    'Identificación oficial con foto (INE / Pasaporte)',
    'Comprobante de domicilio reciente (CFE / Agua)',
    'Plano arquitectónico o croquis de distribución',
    'Constancia de no adeudo de servicios / Otros'
  ];

  function openPrintModal(request) {
    if (!request) return;
    state.selectedRequest = request;

    const index = state.requests.indexOf(request);
    const folio = getFolio(request, index >= 0 ? index : 0);
    const dateFormatted = new Date(request.createdAt || Date.now()).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    $('print-folio').textContent = folio;
    $('print-date').textContent = `Fecha: ${dateFormatted}`;
    $('print-beneficiary-name').textContent = request.beneficiaryName || '—';
    $('print-beneficiary-phone').textContent = request.beneficiaryPhone || '—';
    $('print-credit-purpose').textContent = request.creditPurpose || 'Adquisición de vivienda usada / Crédito Infonavit';
    $('print-owner-name').textContent = request.propertyOwnerName || 'Se omite / En trámite';
    $('print-owner-phone').textContent = request.propertyOwnerPhone || '—';
    $('print-property-street').textContent = request.propertyStreet || '—';
    $('print-property-neighborhood').textContent = request.propertyNeighborhood || '—';
    $('print-property-municipality').textContent = `${request.municipality || 'Pesquería'}, ${request.state || 'Nuevo León'}`;
    $('print-property-postal').textContent = request.postalCode || '—';
    $('print-property-age').textContent = request.propertyAgeYears ? `${request.propertyAgeYears} años` : 'No especificada';

    // Checklist técnico
    const presented = new Set(request.documentsPresented || []);
    const checklistHtml = STANDARD_DOCUMENTS.map((doc) => {
      const isChecked = presented.has(doc) || [...presented].some((p) => doc.toLowerCase().includes(p.toLowerCase()));
      return `
        <div class="sheet-check-item">
          <span class="check-box-icon ${isChecked ? 'is-checked' : ''}">${isChecked ? '☑' : '☐'}</span>
          <span>${escapeHTML(doc)}</span>
        </div>
      `;
    }).join('');
    $('print-checklist').innerHTML = checklistHtml;

    // Notas
    $('print-notes').textContent = request.notes || 'Sin observaciones técnicas adicionales. El inmueble se encuentra en condiciones para programar la visita técnica de inspección física.';

    // Firmas
    $('print-sign-beneficiary').textContent = request.beneficiaryName || 'Nombre y Firma del Solicitante';
    $('print-sign-owner').textContent = request.propertyOwnerName || 'Nombre y Firma del Propietario';

    $('print-dialog').showModal();
  }

  /* ==========================================================================
     MODAL DE GESTIÓN DE ESTADO
     ========================================================================== */
  function openStatusModal(request) {
    if (!request) return;
    state.selectedRequest = request;

    const idInput = $('status-appraisal-id');
    const nameSpan = $('status-modal-name');
    const addressSpan = $('status-modal-address');
    const select = $('status-select');
    const notes = $('status-notes');

    if (idInput) idInput.value = request._id || '';
    if (nameSpan) nameSpan.textContent = request.beneficiaryName || '—';
    if (addressSpan) addressSpan.textContent = `${request.propertyStreet || ''}, ${request.propertyNeighborhood || ''}`;
    if (select) select.value = request.status || 'pendiente';
    if (notes) notes.value = request.notes || '';

    $('status-dialog').showModal();
  }

  async function handleStatusSubmit(event) {
    event.preventDefault();
    const req = state.selectedRequest;
    if (!req) return;

    const newStatus = $('status-select').value;
    const newNotes = $('status-notes').value.trim();
    const saveBtn = $('btn-save-status');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Actualizando…';

    try {
      if (req._id && api.updateAppraisalRequest) {
        await api.updateAppraisalRequest(req._id, { status: newStatus, notes: newNotes });
      }
      req.status = newStatus;
      req.notes = newNotes;
      showNotice(`Solicitud actualizada a estado: ${newStatus}.`, true);
      render();
      $('status-dialog').close();
    } catch (error) {
      showNotice(error.message || 'No se pudo actualizar el estado de la solicitud.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar Cambios';
    }
  }

  /* ==========================================================================
     GUARDAR NUEVA SOLICITUD
     ========================================================================== */
  async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const documentsPresented = formData.getAll('documentsPresented');
    const data = Object.fromEntries(formData.entries());

    data.documentsPresented = documentsPresented;
    data.propertyAgeYears = data.propertyAgeYears === '' ? null : Number(data.propertyAgeYears);

    const button = $('save-button');
    button.disabled = true;
    button.textContent = 'Guardando expediente…';

    try {
      const result = await api.createAppraisalRequest(data);
      form.reset();
      form.elements.state.value = 'Nuevo León';
      showNotice(result.message || 'Solicitud de avalúo registrada con éxito.', true);
      await loadRequests();

      // Abrir automáticamente la vista oficial de impresión del expediente recién creado
      if (result.data) {
        openPrintModal(result.data);
      }
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar la solicitud.');
    } finally {
      button.disabled = false;
      button.textContent = '💾 Guardar Solicitud de Avalúo';
    }
  }

  /* ==========================================================================
     EVENT LISTENERS & BINDING
     ========================================================================== */
  function bindEvents() {
    // Tema claro / oscuro
    const themeBtn = $('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme, true);
      });
    }

    // Avatar logout
    const avatar = $('avatar');
    if (avatar) {
      avatar.addEventListener('click', () => {
        api.logout();
        window.location.assign('/');
      });
    }

    // Formulario de nueva solicitud
    $('appraisal-form').addEventListener('submit', handleFormSubmit);

    // Botón refrescar
    const refreshBtn = $('refresh-button');
    if (refreshBtn) refreshBtn.addEventListener('click', loadRequests);

    // Buscador en vivo
    const searchInput = $('search-appraisals');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        state.searchQuery = event.target.value;
        renderRequests();
      });
    }

    // Atajos de teclado: Ctrl+K enfoca buscador
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Pestañas de filtro por estado
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.activeFilter = tab.dataset.filter;
        renderRequests();
      });
    });

    // Delegación de clics en la lista de solicitudes (Imprimir o Gestionar)
    $('request-list').addEventListener('click', (event) => {
      const printBtn = event.target.closest('[data-action="print"]');
      if (printBtn) {
        const reqId = printBtn.dataset.id;
        const req = state.requests.find((r, i) => String(r._id || i) === String(reqId));
        if (req) openPrintModal(req);
        return;
      }

      const statusBtn = event.target.closest('[data-action="status"]');
      if (statusBtn) {
        const reqId = statusBtn.dataset.id;
        const req = state.requests.find((r, i) => String(r._id || i) === String(reqId));
        if (req) openStatusModal(req);
      }
    });

    // Botones rápidos del banner
    const btnScroll = $('btn-scroll-form');
    if (btnScroll) {
      btnScroll.addEventListener('click', () => {
        const formPanel = $('form-panel');
        if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const btnOpenLast = $('btn-open-last-print');
    if (btnOpenLast) {
      btnOpenLast.addEventListener('click', () => {
        if (state.requests.length) {
          openPrintModal(state.requests[0]);
        } else {
          showNotice('No hay solicitudes registradas aún para imprimir.');
        }
      });
    }

    // Modal de Impresión
    $('btn-trigger-print').addEventListener('click', () => {
      window.print();
    });

    $('btn-close-print').addEventListener('click', () => {
      $('print-dialog').close();
    });

    // Modal de Estado
    $('btn-close-status').addEventListener('click', () => {
      $('status-dialog').close();
    });

    $('btn-cancel-status').addEventListener('click', () => {
      $('status-dialog').close();
    });

    $('status-form').addEventListener('submit', handleStatusSubmit);
  }

  /* ==========================================================================
     INICIALIZACIÓN
     ========================================================================== */
  async function init() {
    try {
      applyTheme(document.documentElement.dataset.theme);
      if (!await authenticate()) return;
      bindEvents();
      await loadRequests();
    } catch (error) {
      setConnection(false, 'Error');
      showNotice(error.message || 'No se pudo abrir la sección de avalúos.');
    }
  }

  init();
});
