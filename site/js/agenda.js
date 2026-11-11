document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const state = {
    properties: [],
    visits: [],
    preparations: [],
    consignments: [],
    inventoryQuery: '',
    inventoryOperation: 'all',
    inventoryStatus: 'all',
    preparationQuery: '',
    preparationStatus: 'all',
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: dateKey(new Date()),
    query: '',
    status: 'all',
    propertyId: 'all',
    activeVisit: null,
    activePreparation: null,
    activeRepair: null
  };
  const $ = (id) => document.getElementById(id);
  const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
  const dateFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateShortFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeFormatter = (value) => value || 'Hora pendiente';

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function propertyPhoto(images) {
    if (!Array.isArray(images)) return '';
    return images.find((value) => typeof value === 'string' && (
      /^https:\/\//i.test(value.trim())
      || (/^\/assets\/[a-z0-9_./%-]+$/i.test(value.trim()) && !value.includes('..'))
    )) || '';
  }

  function visitDate(visit) {
    return visit.scheduledDate || visit.date || '';
  }

  function statusLabel(status) {
    return ({ pendiente: 'Pendiente', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada' })[status] || status;
  }

  function showNotice(message, type = 'error') {
    const notice = $('notice');
    notice.textContent = message;
    notice.classList.toggle('success', type === 'success');
    notice.hidden = false;
  }

  function hideNotice() {
    $('notice').hidden = true;
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    const isDark = nextTheme === 'dark';
    $('theme-toggle-icon').textContent = isDark ? '☀' : '☾';
    $('theme-toggle-label').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    $('theme-toggle').setAttribute('aria-label', `Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`);
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#17231b' : '#f2f5ef';

    if (persist) {
      try {
        localStorage.setItem('aisa-agenda-theme', nextTheme);
      } catch {
        showNotice('El tema cambió, pero el navegador no permitió guardar esta preferencia.');
      }
    }
  }

  function updateActiveNavigation(sectionId) {
    document.querySelectorAll('.sidebar-link[href^="#"]').forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  const aiDraftState = {
    currentScripts: [],
    activeIndex: 0
  };

  // Presenta el borrador generado por la API de IA.
  function displayDraftResult(data) {
    const reasoningBox = $('whatsapp-reasoning-body');
    const coveredBox = $('whatsapp-covered-badges');
    const tabsBar = $('whatsapp-script-tabs-bar');
    const propertyInfo = $('whatsapp-property-info');
    const propertyInfoList = $('whatsapp-property-info-list');
    const propertyInfoSummary = $('whatsapp-property-info-summary');
    const titleElem = $('whatsapp-active-script-title');
    const badgeElem = $('whatsapp-active-script-badge');
    const answerElem = $('whatsapp-draft-answer');

    // El razonamiento es interno; aquí solo mostramos el borrador para el asesor.
    if (reasoningBox) reasoningBox.closest('.whatsapp-reasoning-card').hidden = true;
    if (coveredBox) coveredBox.closest('.whatsapp-covered-wrap').hidden = true;

    const properties = Array.isArray(data.properties) ? data.properties : [];
    if (propertyInfo && propertyInfoList) {
      propertyInfo.hidden = properties.length === 0;
      if (propertyInfoSummary) {
        propertyInfoSummary.textContent = properties.length === 1
          ? 'Todos los datos encontrados de la propiedad'
          : `${properties.length} propiedades encontradas · ver datos del inventario`;
      }
      propertyInfoList.innerHTML = properties.map((property) => {
        const facts = [
          ['Operación', property.operation],
          ['Tipo', property.type],
          ['Disponibilidad', property.status],
          ['Precio', property.price],
          ['Zona', [property.neighborhood, property.city].filter(Boolean).join(', ')],
          ['Recámaras', property.bedrooms],
          ['Baños', property.bathrooms],
          ['Medio baño', property.halfBathrooms],
          ['Construcción', property.constructionAreaM2 ? `${property.constructionAreaM2} m²` : ''],
          ['Terreno', property.landAreaM2 ? `${property.landAreaM2} m²` : ''],
          ['Estacionamiento', property.parkingSpaces],
          ['Plantas', property.floors],
          ['Año de construcción', property.yearBuilt],
          ['Antigüedad', property.age ? `${property.age} años` : ''],
          ['Condición', property.condition],
          ['Créditos registrados', Array.isArray(property.acceptedCredits) ? property.acceptedCredits.join(', ') : property.acceptedCredits],
          ['Cuota de mantenimiento', property.maintenanceFee ? `$${Number(property.maintenanceFee).toLocaleString('es-MX')} MXN` : ''],
          ['Cuota de avalúo', property.appraisalFee ? `$${Number(property.appraisalFee).toLocaleString('es-MX')} MXN` : ''],
          ['Medidas del terreno', property.lotDimensions],
          ['Equipamiento', Array.isArray(property.equipment) ? property.equipment.join(', ') : property.equipment],
          ['Distribución', property.distribution && typeof property.distribution === 'object' ? Object.values(property.distribution).flat().filter(Boolean).join(', ') : property.distribution],
          ['Características', Array.isArray(property.features) ? property.features.join(', ') : property.features],
          ['Amenidades', Array.isArray(property.amenities) ? property.amenities.join(', ') : property.amenities],
          ['Amenidades del conjunto', Array.isArray(property.communityAmenities) ? property.communityAmenities.join(', ') : property.communityAmenities],
          ['Servicios cercanos', property.nearbyServices && typeof property.nearbyServices === 'object' ? JSON.stringify(property.nearbyServices) : property.nearbyServices],
          ['Descripción', property.description]
        ].filter(([, value]) => value !== null && value !== undefined && value !== '');

        return `<article class="whatsapp-property-card">
          <h3>${escapeHTML(property.title || 'Propiedad')}</h3>
          <dl>${facts.map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(String(value))}</dd></div>`).join('')}</dl>
        </article>`;
      }).join('');
    }

    // Scripts y pestañas
    const scripts = Array.isArray(data.scripts) && data.scripts.length 
      ? data.scripts 
      : [{ title: 'Respuesta General para WhatsApp', badge: 'Principal', content: data.answer || '' }];

    aiDraftState.currentScripts = scripts;
    aiDraftState.activeIndex = 0;

    if (tabsBar) {
      tabsBar.hidden = scripts.length < 2;
      tabsBar.innerHTML = scripts.map((s, idx) => `
        <button class="script-tab ${idx === 0 ? 'is-active' : ''}" type="button" data-script-idx="${idx}">
          ${escapeHTML(s.title || ('Opción ' + (idx + 1)))}
        </button>
      `).join('');

      tabsBar.querySelectorAll('.script-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          const idx = Number(tab.dataset.scriptIdx);
          switchActiveScript(idx);
        });
      });
    }

    switchActiveScript(0);
    $('whatsapp-draft-result').hidden = false;
  }

  function switchActiveScript(index) {
    aiDraftState.activeIndex = index;
    const script = aiDraftState.currentScripts[index] || aiDraftState.currentScripts[0];
    if (!script) return;

    // Actualizar tabs activas
    const tabsBar = $('whatsapp-script-tabs-bar');
    if (tabsBar) {
      tabsBar.querySelectorAll('.script-tab').forEach((t, idx) => {
        t.classList.toggle('is-active', idx === index);
      });
    }

    const titleElem = $('whatsapp-active-script-title');
    const badgeElem = $('whatsapp-active-script-badge');
    const answerElem = $('whatsapp-draft-answer');

    if (titleElem) titleElem.textContent = script.title || `Opción ${index + 1}`;
    if (badgeElem) badgeElem.textContent = script.badge || `Opción ${index + 1}`;
    if (answerElem) answerElem.textContent = script.content || '';
  }

  async function draftWhatsAppReply(event) {
    if (event && event.preventDefault) event.preventDefault();
    const messageInput = $('whatsapp-customer-message');
    const message = messageInput ? messageInput.value.trim() : '';
    const button = $('whatsapp-draft-submit');
    const status = $('whatsapp-draft-status');
    if (!message) return;

    if (button) {
      button.disabled = true;
      button.textContent = 'Redactando…';
    }
    if (status) status.textContent = '';
    $('whatsapp-draft-result').hidden = true;

    try {
      const result = await api.request('/ai/admin-draft', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      const payload = [result?.data, result?.result, result].find((candidate) =>
        candidate && (Array.isArray(candidate.scripts) || typeof candidate.answer === 'string' || typeof candidate.reply === 'string')
      );
      const answer = payload?.answer || payload?.reply || payload?.scripts?.find((script) => script?.content)?.content;
      if (!answer) {
        throw new Error(payload?.message || 'El servidor no devolvió texto. Revisa la conexión de IA e inténtalo otra vez.');
      }
      const scripts = Array.isArray(payload.scripts) && payload.scripts.some((script) => script?.content)
        ? payload.scripts
        : [{ title: 'Respuesta para WhatsApp', badge: 'Borrador', content: answer }];
      displayDraftResult({ ...payload, scripts, answer, properties: payload.properties || payload.matchedProperties || [] });
      if (status) status.textContent = payload.aiFallback
        ? 'Borrador automático listo. La IA avanzada no está conectando; revísalo y confirma los datos antes de enviarlo.'
        : 'Borrador listo. Revísalo antes de enviarlo al cliente.';
    } catch (error) {
      if (status) status.textContent = error.message || 'No se pudo redactar la respuesta.';
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Redactar respuesta';
      }
    }
  }

  async function copyWhatsAppReply() {
    const answer = $('whatsapp-draft-answer').textContent.trim();
    if (!answer) return;
    const status = $('whatsapp-draft-status');
    const copyBtn = $('whatsapp-draft-copy');
    try {
      await navigator.clipboard.writeText(answer);
      status.textContent = 'Respuesta copiada. Puedes pegarla en WhatsApp Business.';
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ ¡Copiado!';
        copyBtn.style.color = '#34d399';
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.color = '';
        }, 2200);
      }
    } catch {
      status.textContent = 'No se pudo acceder al portapapeles. Selecciona y copia la respuesta manualmente.';
    }
  }

  function setConnection(online, text) {
    const indicator = $('connection-status');
    indicator.classList.toggle('is-online', online);
    indicator.classList.toggle('is-offline', !online);
    indicator.lastChild.textContent = ` ${text}`;
  }

  function showLoginPrompt() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'agenda-auth-overlay';
      overlay.innerHTML = `
        <form class="agenda-auth-card" id="agenda-login-form">
          <img src="/assets/aisa-symbol.png" alt="" class="agenda-auth-logo">
          <p class="eyebrow">ACCESO ADMINISTRATIVO</p>
          <h1>Inicia sesión para abrir tu agenda</h1>
          <p class="welcome-copy">Usa la cuenta administradora de Aisa. Al actualizar la página permanecerás en la agenda.</p>
          <label class="field">Correo electrónico<input name="email" type="email" autocomplete="username" required></label>
          <label class="field">Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
          <p class="agenda-auth-error" id="agenda-login-error" role="alert" hidden></p>
          <button class="button button-primary" type="submit">Entrar a la agenda</button>
          <a href="/" class="agenda-auth-back">Volver al sitio de Aisa</a>
        </form>`;
      document.body.append(overlay);

      overlay.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const errorMessage = $('agenda-login-error');
        button.disabled = true;
        button.textContent = 'Verificando…';
        errorMessage.hidden = true;

        try {
          const result = await api.login(form.elements.email.value.trim(), form.elements.password.value);
          if (result.user?.role !== 'admin') {
            throw new Error('Esta cuenta no tiene permisos de administrador. La sesión de cliente se conserva al volver a Aisa.');
          }
          overlay.remove();
          resolve(true);
        } catch (error) {
          errorMessage.textContent = error.message || 'No se pudo iniciar sesión.';
          errorMessage.hidden = false;
          button.disabled = false;
          button.textContent = 'Entrar a la agenda';
        }
      });
    });
  }

  async function authenticate() {
    if (!api) {
      window.location.replace('/');
      return false;
    }

    let user = api.isAuthenticated() ? await api.getMe() : null;
    if (user && user.role !== 'admin') {
      window.location.replace('/');
      return false;
    }

    if (!user) {
      if (!await showLoginPrompt()) return false;
      user = await api.getMe();
    }

    if (user?.role !== 'admin') {
      window.location.replace('/');
      return false;
    }

    document.documentElement.classList.remove('agenda-auth-pending');
    document.documentElement.classList.add('agenda-authenticated');
    $('avatar').textContent = (user.name || 'A').trim().charAt(0).toUpperCase();
    $('today-label').textContent = dateFormatter.format(new Date());
    return true;
  }

  async function loadData() {
    hideNotice();
    $('refresh-button').disabled = true;
    setConnection(false, 'Sincronizando...');
    try {
      const [propertyResult, visitResult, preparationResult, consignmentResult] = await Promise.all([
        api.getAdminProperties(),
        api.getVisits(),
        api.getPreparations(),
        api.getConsignments()
      ]);
      state.properties = propertyResult.data || [];
      state.visits = visitResult.data || [];
      state.preparations = preparationResult.data || [];
      state.consignments = consignmentResult.data || [];
      setConnection(true, 'Conectado');
      render();
    } catch (error) {
      setConnection(false, 'Sin conexión');
      showNotice(`${error.message} Revisa tu sesión y vuelve a actualizar.`);
    } finally {
      $('refresh-button').disabled = false;
    }
  }

  function filteredVisits() {
    const query = state.query.trim().toLowerCase();
    return state.visits.filter((visit) => {
      const matchesStatus = state.status === 'all' || visit.status === state.status;
      const matchesProperty = state.propertyId === 'all' || String(visit.propertyId) === state.propertyId;
      const searchText = [visit.clientName, visit.clientPhone, visit.clientEmail, visit.propertyTitle, visit.propertyLocation].join(' ').toLowerCase();
      return matchesStatus && matchesProperty && (!query || searchText.includes(query));
    }).sort((a, b) => {
      const first = `${visitDate(a)}T${a.scheduledTime || a.time || '99:99'}`;
      const second = `${visitDate(b)}T${b.scheduledTime || b.time || '99:99'}`;
      return first.localeCompare(second);
    });
  }

  function render() {
    populatePropertyFilters();
    renderMetrics();
    renderPreparations();
    renderInventory();
    renderCalendar();
    renderSelectedDay();
    renderTable();
    renderConsignments();
  }

  const consignmentStatusLabels = {
    nuevo: 'Nueva', en_revision: 'En revisión', contactado: 'Contactado', publicado: 'Publicado', rechazado: 'Rechazado'
  };

  function renderConsignments() {
    const tbody = $('consignments-table-body');
    if (!tbody) return;
    const items = [...state.consignments].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const newCount = items.filter(item => item.status === 'nuevo').length;
    $('consignment-count').textContent = `${items.length} ${items.length === 1 ? 'solicitud' : 'solicitudes'}`;
    $('dock-consignment-badge').textContent = String(newCount);

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">Todavía no hay solicitudes de venta.</div></td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => {
      const phoneDigits = String(item.phone || '').replace(/\D/g, '');
      const date = new Date(item.createdAt || Date.now());
      const dateLabel = Number.isNaN(date.getTime()) ? '—' : dateShortFormatter.format(date);
      const photos = Array.isArray(item.photos) ? item.photos : [];
      const selectedStatus = consignmentStatusLabels[item.status] && item.status !== 'publicado' ? item.status : 'nuevo';
      const smsLabel = item.smsStatus === 'enviado' ? 'Enviado'
        : item.smsStatus === 'no_configurado' ? 'Sin configurar'
          : item.smsStatus === 'pendiente' ? 'Pendiente' : 'No enviado';
      return `<tr>
        <td>${escapeHTML(dateLabel)}</td>
        <td><strong>${escapeHTML(item.ownerName)}</strong><br><a href="tel:${phoneDigits}">${escapeHTML(item.phone)}</a></td>
        <td>${escapeHTML(item.propertyType)}<br><small>${escapeHTML(item.zone)}</small></td>
        <td>${escapeHTML(item.expectedPrice || 'Sin especificar')}</td>
        <td>${photos.length
          ? `<button class="button button-quiet button-small" type="button" data-view-consignment-photos="${escapeHTML(item._id)}">Ver ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}</button>`
          : 'Sin fotos'}</td>
        <td>${escapeHTML(smsLabel)}</td>
        <td>${item.status === 'publicado' ? '<span class="status confirmada">Publicado</span>' : `<select class="consignment-status-select" data-consignment-status="${escapeHTML(item._id)}" aria-label="Estado de solicitud de ${escapeHTML(item.ownerName)}">
          ${Object.entries(consignmentStatusLabels).filter(([value]) => value !== 'publicado').map(([value, label]) => `<option value="${value}" ${selectedStatus === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>`}</td>
        <td>${item.status === 'publicado' ? '<small>En catálogo</small>' : `<button class="button button-primary button-small" type="button" data-approve-consignment="${escapeHTML(item._id)}">Revisar y publicar</button><button class="button button-quiet button-small" type="button" data-update-consignment="${escapeHTML(item._id)}">Guardar estado</button>`}</td>
      </tr>`;
    }).join('');
  }

  let consignmentPhotoUrls = [];

  async function openConsignmentPhotos(consignmentId) {
    const item = state.consignments.find(entry => String(entry._id) === String(consignmentId));
    if (!item) return;
    const dialog = $('consignment-photo-dialog');
    const gallery = $('consignment-photo-gallery');
    $('consignment-photo-title').textContent = `Fotos · ${item.ownerName || 'Propiedad'}`;
    gallery.textContent = 'Cargando fotos…';
    dialog.showModal();
    try {
      const photos = Array.isArray(item.photos) ? item.photos : [];
      const blobs = await Promise.all(photos.map(photo => api.getConsignmentPhoto(item._id, photo.fileId)));
      if (!dialog.open) return;
      gallery.replaceChildren();
      blobs.forEach((blob, index) => {
        const url = URL.createObjectURL(blob);
        consignmentPhotoUrls.push(url);
        const figure = document.createElement('figure');
        const image = document.createElement('img');
        image.src = url;
        image.alt = photos[index].name || `Foto ${index + 1} de la propiedad`;
        const caption = document.createElement('figcaption');
        caption.textContent = image.alt;
        figure.append(image, caption);
        gallery.appendChild(figure);
      });
    } catch (error) {
      gallery.textContent = error.message;
    }
  }

  async function saveConsignmentStatus(button) {
    const id = button.dataset.updateConsignment;
    const select = document.querySelector(`[data-consignment-status="${CSS.escape(id)}"]`);
    if (!select) return;
    button.disabled = true;
    try {
      await api.updateConsignmentStatus(id, select.value);
      await loadData();
      showNotice('Estado de la solicitud actualizado.', 'success');
    } catch (error) {
      showNotice(error.message || 'No se pudo actualizar la solicitud.');
    } finally {
      button.disabled = false;
    }
  }

  function openConsignmentApproval(id) {
    const item = state.consignments.find(entry => String(entry._id) === String(id));
    if (!item) return;
    const form = $('consignment-approval-form');
    form.elements.consignmentId.value = id;
    form.elements.title.value = `Propiedad en ${item.zone}`.slice(0, 160);
    form.elements.type.value = ({ Casa: 'casa', Departamento: 'departamento', Terreno: 'terreno', 'Edificio / Comercial': 'comercial' })[item.propertyType] || 'casa';
    const price = String(item.expectedPrice || '').replace(/[^\d.]/g, '');
    form.elements.price.value = price;
    form.elements.city.value = 'Monterrey';
    form.elements.neighborhood.value = item.zone;
    form.elements.location.value = `${item.zone}, Monterrey, Nuevo León`;
    form.elements.description.value = item.notes || '';
    form.elements.bedrooms.value = 0;
    form.elements.bathrooms.value = 0;
    form.elements.constructionAreaM2.value = 0;
    form.elements.landAreaM2.value = 0;
    $('consignment-approval-error').textContent = '';
    $('consignment-approval-dialog').showModal();
  }

  async function submitConsignmentApproval(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('publish-consignment-button');
    const data = Object.fromEntries(new FormData(form));
    delete data.consignmentId;
    for (const key of ['price', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'latitude', 'longitude']) data[key] = Number(data[key]);
    button.disabled = true;
    $('consignment-approval-error').textContent = '';
    try {
      await api.approveConsignment(form.elements.consignmentId.value, data);
      $('consignment-approval-dialog').close();
      await loadData();
      showNotice('Propiedad aprobada y publicada en el catálogo de ventas.', 'success');
    } catch (error) {
      $('consignment-approval-error').textContent = error.message || 'No se pudo publicar la propiedad.';
    } finally { button.disabled = false; }
  }

  function populatePropertyFilters() {
    const options = state.properties.map((property) =>
      `<option value="${escapeHTML(property._id)}">${escapeHTML(property.title)}</option>`
    ).join('');
    $('property-filter').innerHTML = `<option value="all">Todas las propiedades</option>${options}`;
    $('property-filter').value = state.propertyId;
    $('visit-property').innerHTML = `<option value="">Selecciona una propiedad</option>${options}`;
  }

  function renderMetrics() {
    const today = dateKey(new Date());
    const totalVisits = state.visits.length;
    const pendingVisits = state.visits.filter((visit) => visit.status === 'pendiente').length;
    const confirmedVisits = state.visits.filter((visit) => visit.status === 'confirmada').length;
    const todayVisits = state.visits.filter((visit) => visitDate(visit) === today && visit.status !== 'cancelada').length;

    const metricTotal = $('metric-total');
    if (metricTotal) metricTotal.textContent = totalVisits;
    const metricPending = $('metric-pending');
    if (metricPending) metricPending.textContent = pendingVisits;
    const metricConfirmed = $('metric-confirmed');
    if (metricConfirmed) metricConfirmed.textContent = confirmedVisits;
    const metricToday = $('metric-today');
    if (metricToday) metricToday.textContent = todayVisits;

    // Badges en vivo del Dock de Navegación
    const dockToday = $('dock-today-badge');
    if (dockToday) dockToday.textContent = todayVisits > 0 ? `${todayVisits} hoy` : 'Hoy';
    const dockMonth = $('dock-month-badge');
    if (dockMonth) dockMonth.textContent = monthFormatter.format(state.currentMonth).slice(0, 3);
    const dockPending = $('dock-pending-badge');
    if (dockPending) dockPending.textContent = pendingVisits;
    const dockInventory = $('dock-inventory-badge');
    if (dockInventory) dockInventory.textContent = state.properties.length;
    const dockPrep = $('dock-prep-badge');
    if (dockPrep) dockPrep.textContent = state.preparations.filter((p) => p.status !== 'publicada').length;
  }

  function filteredProperties() {
    const query = state.inventoryQuery.trim().toLowerCase();
    return state.properties.filter((property) => {
      const matchesOperation = state.inventoryOperation === 'all' || property.operation === state.inventoryOperation;
      const matchesStatus = state.inventoryStatus === 'all' || property.status === state.inventoryStatus;
      const text = [property.title, property.location, property.neighborhood, property.city].join(' ').toLowerCase();
      return matchesOperation && matchesStatus && (!query || text.includes(query));
    });
  }

  function renderInventory() {
    const properties = filteredProperties();
    $('inventory-count').textContent = `${state.properties.length} ${state.properties.length === 1 ? 'propiedad' : 'propiedades'}`;
    $('inventory-result-count').textContent = `${properties.length} ${properties.length === 1 ? 'resultado' : 'resultados'}`;
    $('inventory-grid').innerHTML = properties.length ? properties.map((property) => {
      const photo = propertyPhoto(property.images);
      const statusClass = property.status === 'disponible' ? 'confirmada' : property.status === 'apartada' ? 'pendiente' : property.status === 'vendida' ? 'cancelada' : 'realizada';
      return `
        <article class="property-card">
          <div class="property-card-image">${photo ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(property.title)}" loading="lazy">` : '<div class="property-image-placeholder"><span>⌂</span><small>Sin fotografía</small></div>'}<span class="property-card-badge">${escapeHTML(property.status || 'disponible')}</span></div>
          <div class="property-card-body">
            <div class="property-card-heading"><div><p class="property-card-location">${escapeHTML([property.neighborhood, property.city].filter(Boolean).join(' · ') || property.location)}</p><h3>${escapeHTML(property.title)}</h3></div><span class="status ${statusClass}">${property.operation === 'renta' ? 'Renta' : 'Venta'}</span></div>
            <strong class="property-card-price">${escapeHTML(property.priceFormatted || `$${Number(property.price || 0).toLocaleString('es-MX')} MXN`)}</strong>
            <div class="property-specs"><span>${Number(property.bedrooms || 0)} rec.</span><span>${Number(property.bathrooms || 0)} baños</span><span>${Number(property.constructionAreaM2 || 0)} m²</span></div>
            <button class="button button-quiet button-small" type="button" data-edit-property="${escapeHTML(property._id)}">Editar ficha completa</button>
          </div>
        </article>`;
    }).join('') : '<div class="empty-state">No se encontraron propiedades con esos filtros.</div>';
  }

  const preparationLabels = {
    por_inspeccionar: 'Por inspeccionar',
    en_preparacion: 'En preparación',
    lista_para_publicar: 'Lista para publicar',
    publicada: 'Publicada en Aisa'
  };
  const repairLabels = {
    pendiente: 'Pendiente',
    programada: 'Programada',
    en_proceso: 'En proceso',
    completada: 'Completada'
  };

  function filteredPreparations() {
    const query = state.preparationQuery.trim().toLowerCase();
    return state.preparations.filter((property) => {
      const matchesStatus = state.preparationStatus === 'all' || property.readinessStatus === state.preparationStatus;
      const searchable = [property.title, property.location, property.neighborhood, property.city].join(' ').toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }

  function renderPreparations() {
    const properties = filteredPreparations();
    const active = state.preparations.filter((property) => property.readinessStatus !== 'publicada');
    const repairs = active.flatMap((property) => (property.repairs || []).map((repair) => ({ property, repair })));
    const pending = repairs.filter(({ repair }) => repair.status !== 'completada').length;
    const scheduled = repairs.filter(({ repair }) => repair.scheduledDate && repair.status !== 'completada').length;
    $('preparation-summary').innerHTML = `
      <div><strong>${active.filter((property) => property.readinessStatus === 'por_inspeccionar').length}</strong><span>Por inspeccionar</span></div>
      <div><strong>${active.filter((property) => property.readinessStatus === 'en_preparacion').length}</strong><span>En preparación</span></div>
      <div><strong>${pending}</strong><span>Trabajos pendientes</span></div>
      <div><strong>${scheduled}</strong><span>Visitas de reparación</span></div>`;
    $('preparation-grid').innerHTML = properties.length ? properties.map((property) => {
      const photo = propertyPhoto(property.images);
      const tasks = property.repairs || [];
      const completed = tasks.filter((repair) => repair.status === 'completada').length;
      const pendingTasks = tasks.filter((repair) => repair.status !== 'completada');
      const statusClass = property.readinessStatus === 'lista_para_publicar' ? 'ready' : property.readinessStatus === 'publicada' ? 'published' : property.readinessStatus === 'en_preparacion' ? 'working' : 'inspection';
      const taskMarkup = tasks.length ? tasks.slice(0, 3).map((repair) => `
        <div class="repair-item ${repair.status === 'completada' ? 'is-complete' : ''}">
          <div><strong>${escapeHTML(repair.title)}</strong><small>${escapeHTML(repair.scheduledDate ? `${repair.scheduledDate}${repair.scheduledTime ? ` · ${repair.scheduledTime}` : ''}` : (repairCategoriesLabel(repair.category)))} · ${escapeHTML(repairLabels[repair.status] || repair.status)}</small></div>
          <div class="repair-actions"><button class="text-action" type="button" data-open-repair="${escapeHTML(property._id)}" data-repair-id="${escapeHTML(repair._id)}">Editar</button>${repair.status !== 'completada' ? `<button class="text-action complete-action" type="button" data-complete-repair="${escapeHTML(property._id)}" data-repair-id="${escapeHTML(repair._id)}">Concluir</button>` : ''}</div>
        </div>`).join('') : '<p class="no-repairs">Aún no hay trabajos cargados. Agrega los detalles después de inspeccionar.</p>';
      const canPromote = property.readinessStatus === 'lista_para_publicar' && tasks.every((repair) => repair.status === 'completada') && !property.promotedPropertyId;
      return `
        <article class="preparation-card">
          <div class="preparation-image">${photo ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(property.title)}" loading="lazy">` : '<div class="property-image-placeholder"><span>⌂</span><small>Agrega fotos del inmueble</small></div>'}<span class="preparation-badge ${statusClass}">${escapeHTML(preparationLabels[property.readinessStatus] || property.readinessStatus)}</span></div>
          <div class="preparation-card-body">
            <p class="property-card-location">${escapeHTML([property.neighborhood, property.city, property.state].filter(Boolean).join(' · '))}</p>
            <h3>${escapeHTML(property.title)}</h3>
            <p class="preparation-address">${escapeHTML(property.location)}${property.postalCode ? ` · CP ${escapeHTML(property.postalCode)}` : ''}</p>
            ${property.price ? `<strong class="property-card-price">${escapeHTML(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(property.price))}</strong>` : ''}
            <div class="property-specs"><span>${property.bedrooms == null ? 'Recámaras pendientes' : `${Number(property.bedrooms)} rec.`}</span><span>${property.bathrooms == null ? 'Baños pendientes' : `${Number(property.bathrooms)} baños`}</span><span>${property.constructionAreaM2 == null ? 'Construcción pendiente' : `${Number(property.constructionAreaM2)} m² const.`}</span></div>
            <div class="property-specs"><span>${property.age == null ? 'Antigüedad pendiente' : `${Number(property.age)} años`}</span><span>${property.landAreaM2 == null ? 'Terreno pendiente' : `${Number(property.landAreaM2)} m² terreno`}</span><span>${completed}/${tasks.length} trabajos listos</span></div>
            <div class="repair-list">${taskMarkup}${tasks.length > 3 ? `<p class="more-repairs">y ${tasks.length - 3} trabajos más</p>` : ''}</div>
            <div class="preparation-actions">
              ${property.readinessStatus === 'publicada'
                ? '<span class="published-note">Ya está disponible en Aisa · edición desde Inventario</span>'
                : `<button class="button button-quiet button-small" type="button" data-edit-preparation="${escapeHTML(property._id)}">Editar ficha</button>
                  <button class="button button-quiet button-small" type="button" data-add-repair="${escapeHTML(property._id)}">+ Trabajo / visita</button>
                  ${property.readinessStatus !== 'lista_para_publicar' && pendingTasks.length === 0 ? `<button class="button button-quiet button-small" type="button" data-mark-ready="${escapeHTML(property._id)}">Marcar lista</button>` : ''}
                  ${canPromote ? `<button class="button button-primary button-small" type="button" data-promote-preparation="${escapeHTML(property._id)}">Dar de alta para venta</button>` : ''}`}
            </div>
          </div>
        </article>`;
    }).join('') : '<div class="empty-state">No hay inmuebles en esta etapa. Usa “Agregar inmueble” para crear una ficha privada.</div>';
  }

  function repairCategoriesLabel(category) {
    return ({ electricidad: 'Electricidad', agua: 'Agua', plomeria: 'Plomería', estructura: 'Estructura', acabados: 'Acabados', limpieza: 'Limpieza', documentacion: 'Documentación', otro: 'Otro' })[category] || 'Trabajo';
  }

  function openPreparationDialog(property = null) {
    const form = $('preparation-form');
    form.reset();
    form.elements.preparationId.value = property?._id || '';
    form.elements.type.value = property?.type || 'casa';
    form.elements.state.value = property?.state || 'Nuevo León';
    $('preparation-dialog-title').textContent = property ? `Editar: ${property.title}` : 'Agregar inmueble en preparación';
    $('save-preparation-button').textContent = property ? 'Guardar cambios' : 'Guardar ficha interna';
    if (property) {
      for (const field of ['title', 'readinessStatus', 'location', 'neighborhood', 'city', 'state', 'postalCode', 'age', 'price', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors', 'description', 'notes']) {
        form.elements[field].value = property[field] ?? '';
      }
      form.elements.latitude.value = property.coordinates?.latitude ?? '';
      form.elements.longitude.value = property.coordinates?.longitude ?? '';
      form.elements.images.value = Array.isArray(property.images) ? property.images.join('\n') : '';
      form.elements.features.value = Array.isArray(property.features) ? property.features.join('\n') : '';
    } else {
      // Estos campos proceden de la solicitud de avalúo adjunta; la colonia queda pendiente de confirmación.
      form.elements.title.value = 'Casa en preparación · Cerro de Loreto 130';
      form.elements.location.value = 'Cerro de Loreto 130';
      form.elements.neighborhood.value = 'Provileon (confirmar)';
      form.elements.city.value = 'General Escobedo';
      form.elements.postalCode.value = '66070';
      form.elements.age.value = '40';
      form.elements.notes.value = 'Pendiente inspección física y confirmación de la ortografía de la colonia, medidas, estado de servicios, trabajos necesarios y fotos reales del inmueble. No se copiaron datos personales del expediente.';
    }
    $('preparation-dialog').showModal();
  }

  async function savePreparation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const preparationId = formData.get('preparationId');
    const payload = Object.fromEntries(formData.entries());
    delete payload.preparationId;
    payload.features = String(payload.features || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    payload.images = String(payload.images || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    payload.coordinates = {
      latitude: payload.latitude === '' ? null : Number(payload.latitude),
      longitude: payload.longitude === '' ? null : Number(payload.longitude)
    };
    delete payload.latitude;
    delete payload.longitude;
    for (const field of ['age', 'price', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors']) {
      payload[field] = payload[field] === '' ? null : Number(payload[field]);
    }
    const button = $('save-preparation-button');
    button.disabled = true;
    try {
      if (preparationId) await api.updatePreparation(preparationId, payload);
      else await api.createPreparation(payload);
      $('preparation-dialog').close();
      showNotice(preparationId ? 'La ficha interna quedó actualizada.' : 'El inmueble quedó agregado al tablero privado.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar el inmueble.');
    } finally {
      button.disabled = false;
    }
  }

  function openRepairDialog(propertyId, repairId = '') {
    const property = state.preparations.find((item) => String(item._id) === String(propertyId));
    if (!property) return;
    const repair = repairId ? (property.repairs || []).find((item) => String(item._id) === String(repairId)) : null;
    const form = $('repair-form');
    form.reset();
    form.elements.preparationId.value = property._id;
    form.elements.repairId.value = repair?._id || '';
    $('repair-dialog-title').textContent = repair ? `Trabajo · ${property.title}` : `Programar trabajo · ${property.title}`;
    $('save-repair-button').textContent = repair ? 'Guardar cambios' : 'Agregar trabajo';
    form.elements.category.value = repair?.category || 'electricidad';
    form.elements.priority.value = repair?.priority || 'media';
    form.elements.status.value = repair?.status || 'pendiente';
    for (const field of ['title', 'description', 'scheduledDate', 'scheduledTime', 'assignedTo', 'completionNotes']) {
      form.elements[field].value = repair?.[field] || '';
    }
    $('repair-dialog').showModal();
  }

  async function saveRepair(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const preparationId = payload.preparationId;
    const repairId = payload.repairId;
    delete payload.preparationId;
    delete payload.repairId;
    if (payload.scheduledDate && !payload.scheduledTime) payload.scheduledTime = '';
    if (payload.scheduledDate && payload.status === 'pendiente') payload.status = 'programada';
    const button = $('save-repair-button');
    button.disabled = true;
    try {
      if (repairId) await api.updatePreparationRepair(preparationId, repairId, payload);
      else await api.addPreparationRepair(preparationId, payload);
      $('repair-dialog').close();
      showNotice(repairId ? 'El trabajo quedó actualizado.' : 'El trabajo quedó agregado a la agenda.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar el trabajo.');
    } finally {
      button.disabled = false;
    }
  }

  function openQuickTaskDialog() {
    if (!state.preparations.length) {
      showNotice('Primero registra la propiedad en “Inmuebles en preparación” para poder asociar y agendar una tarea.', 'error');
      $('preparation-management').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const form = $('quick-task-form');
    form.reset();
    form.elements.preparationId.innerHTML = state.preparations.map(property => `<option value="${escapeHTML(property._id)}">${escapeHTML(property.title)} · ${escapeHTML(property.neighborhood || property.city || '')}</option>`).join('');
    form.elements.scheduledDate.value = state.selectedDate || dateKey(new Date());
    $('quick-task-dialog').showModal();
  }

  async function saveQuickTask(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const preparationId = values.preparationId;
    delete values.preparationId;
    values.status = 'programada';
    const button = $('save-quick-task');
    button.disabled = true;
    try {
      await api.addPreparationRepair(preparationId, values);
      $('quick-task-dialog').close();
      showNotice('Tarea agendada y añadida al calendario.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo agendar la tarea.');
    } finally { button.disabled = false; }
  }

  async function completeRepair(preparationId, repairId) {
    const property = state.preparations.find((item) => String(item._id) === String(preparationId));
    const repair = property?.repairs?.find((item) => String(item._id) === String(repairId));
    if (!repair) return;
    if (!window.confirm(`¿Marcar como concluido “${repair.title}”?`)) return;
    try {
      await api.updatePreparationRepair(preparationId, repairId, { status: 'completada' });
      showNotice('El trabajo quedó marcado como concluido.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo concluir el trabajo.');
    }
  }

  async function markPreparationReady(preparationId) {
    try {
      await api.updatePreparation(preparationId, { readinessStatus: 'lista_para_publicar' });
      showNotice('El inmueble quedó listo para completar sus datos de publicación.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'Revisa los trabajos pendientes antes de marcarlo listo.');
    }
  }

  async function promotePreparation(preparationId) {
    const property = state.preparations.find((item) => String(item._id) === String(preparationId));
    if (!property || !window.confirm(`Vas a publicar “${property.title}” en el catálogo público de Aisa para venta. ¿Continuar?`)) return;
    try {
      const result = await api.promotePreparation(preparationId);
      showNotice(result.message || 'El inmueble quedó dado de alta en Aisa.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'Completa fotos y datos de venta antes de publicar.');
      if (property.readinessStatus === 'lista_para_publicar') openPreparationDialog(property);
    }
  }

  function editProperty(propertyId) {
    const property = state.properties.find((item) => String(item._id) === String(propertyId));
    if (!property) return;
    const form = $('property-form');
    form.elements.propertyId.value = property._id;
    for (const field of [
      'title', 'operation', 'type', 'price', 'status', 'city', 'neighborhood',
      'location', 'bedrooms', 'bathrooms', 'halfBathrooms', 'parkingSpaces',
      'constructionAreaM2', 'landAreaM2', 'floors', 'age', 'appraisalFee',
      'maintenanceFee', 'condition', 'legalStatus', 'description'
    ]) {
      form.elements[field].value = property[field] ?? '';
    }
    for (const field of ['features', 'amenities', 'images']) {
      form.elements[field].value = Array.isArray(property[field]) ? property[field].join('\n') : '';
    }
    $('property-dialog-title').textContent = `Editar: ${property.title}`;
    $('property-dialog').showModal();
  }

  async function saveProperty(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const propertyId = formData.get('propertyId');
    const payload = Object.fromEntries(formData.entries());
    delete payload.propertyId;

    for (const field of ['price', 'bedrooms', 'bathrooms', 'parkingSpaces', 'constructionAreaM2', 'landAreaM2', 'floors']) {
      payload[field] = Number(payload[field] || 0);
    }
    for (const field of ['halfBathrooms', 'age', 'appraisalFee', 'maintenanceFee']) {
      payload[field] = payload[field] === '' ? null : Number(payload[field]);
    }
    payload.features = payload.features.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    payload.amenities = payload.amenities.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    payload.images = payload.images.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!payload.images.length) {
      showNotice('Agrega por lo menos una imagen antes de guardar.');
      return;
    }

    const button = $('save-property-button');
    button.disabled = true;
    try {
      await api.updateProperty(propertyId, payload);
      $('property-dialog').close();
      showNotice('La ficha de la propiedad se actualizó correctamente.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo actualizar la propiedad.');
    } finally {
      button.disabled = false;
    }
  }

  function renderCalendar() {
    $('month-label').textContent = monthFormatter.format(state.currentMonth);
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);
    const today = dateKey(new Date());
    const cells = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = dateKey(date);
      const visits = state.visits.filter((visit) => visitDate(visit) === key && visit.status !== 'cancelada');
      const repairs = repairsForDate(key);
      const activities = [
        ...visits.map((visit) => ({ type: 'visit', time: visit.scheduledTime || visit.time || '', label: visit.clientName, status: visit.status })),
        ...repairs.map(({ property, repair }) => ({ type: 'repair', time: repair.scheduledTime || '', label: repair.title, status: repair.status, property: property.title }))
      ].sort((a, b) => a.time.localeCompare(b.time));
      const eventMarkup = activities.slice(0, 2).map((activity) =>
        `<span class="day-event ${activity.type === 'repair' ? 'repair-event' : escapeHTML(activity.status)}">${escapeHTML(activity.time || (activity.type === 'repair' ? 'Trabajo' : 'Cita'))} · ${escapeHTML(activity.type === 'repair' ? activity.property : activity.label)}</span>`
      ).join('');
      const more = activities.length > 2 ? `<span class="more-events">+${activities.length - 2} más</span>` : '';
      cells.push(`
        <button class="calendar-cell ${date.getMonth() !== month ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${key === state.selectedDate ? 'is-selected' : ''}" type="button" data-date="${key}" aria-label="${escapeHTML(dateFormatter.format(date))}, ${activities.length} actividades">
          <span class="day-number">${date.getDate()}</span>
          <span class="day-events">${eventMarkup}${more}</span>
        </button>`);
    }
    $('calendar-grid').innerHTML = cells.join('');
  }

  function renderSelectedDay() {
    const selected = new Date(`${state.selectedDate}T12:00:00`);
    $('selected-date-label').textContent = dateFormatter.format(selected);
    const visits = state.visits
      .filter((visit) => visitDate(visit) === state.selectedDate && visit.status !== 'cancelada')
      .sort((a, b) => (a.scheduledTime || a.time || '').localeCompare(b.scheduledTime || b.time || ''));
    const repairs = repairsForDate(state.selectedDate);
    const activities = [
      ...visits.map((visit) => ({ type: 'visit', time: visit.scheduledTime || visit.time || '', visit })),
      ...repairs.map(({ property, repair }) => ({ type: 'repair', time: repair.scheduledTime || '', property, repair }))
    ].sort((a, b) => a.time.localeCompare(b.time));
    $('selected-day-count').textContent = `${activities.length} ${activities.length === 1 ? 'actividad' : 'actividades'}`;
    $('day-appointments').innerHTML = activities.length ? activities.map((activity) => activity.type === 'visit' ? `
      <article class="day-card">
        <div class="day-card-top"><time>${escapeHTML(timeFormatter(activity.visit.scheduledTime || activity.visit.time))}</time><span class="status ${escapeHTML(activity.visit.status)}">${escapeHTML(statusLabel(activity.visit.status))}</span></div>
        <h3>${escapeHTML(activity.visit.clientName)}</h3>
        <p>${escapeHTML(activity.visit.propertyTitle)}${activity.visit.clientPhone ? ` · ${escapeHTML(activity.visit.clientPhone)}` : ''}</p>
        <button class="text-action" type="button" data-open-visit="${escapeHTML(activity.visit._id)}">Ver y gestionar →</button>
      </article>` : `
      <article class="day-card repair-day-card">
        <div class="day-card-top"><time>${escapeHTML(timeFormatter(activity.repair.scheduledTime))}</time><span class="status pendiente">Reparación</span></div>
        <h3>${escapeHTML(activity.repair.title)}</h3>
        <p>${escapeHTML(activity.property.title)} · ${escapeHTML(repairCategoriesLabel(activity.repair.category))}</p>
        <button class="text-action" type="button" data-open-repair="${escapeHTML(activity.property._id)}" data-repair-id="${escapeHTML(activity.repair._id)}">Ver trabajo →</button>
      </article>`).join('') : '<div class="empty-state">No hay citas ni visitas de reparación programadas para este día.</div>';
  }

  function repairsForDate(key) {
    return state.preparations.flatMap((property) => (property.repairs || [])
      .filter((repair) => repair.scheduledDate === key && repair.status !== 'completada')
      .map((repair) => ({ property, repair })));
  }

  function renderTable() {
    const visits = filteredVisits();
    $('result-count').textContent = `${visits.length} ${visits.length === 1 ? 'resultado' : 'resultados'}`;
    $('visits-table-body').innerHTML = visits.length ? visits.map((visit) => `
      <tr>
        <td><strong>${escapeHTML(visit.clientName)}</strong><small>${escapeHTML(visit.clientEmail || 'Sin correo')}</small></td>
        <td><strong>${escapeHTML(visit.propertyTitle)}</strong><small>${escapeHTML(visit.propertyLocation || '')}</small></td>
        <td><strong>${escapeHTML(dateShortFormatter.format(new Date(`${visitDate(visit)}T12:00:00`)))}</strong><small>${escapeHTML(visit.scheduledTime || visit.time || 'Hora pendiente')}</small></td>
        <td><span class="status ${escapeHTML(visit.status)}">${escapeHTML(statusLabel(visit.status))}</span></td>
        <td>${visit.clientPhone ? `<a href="tel:${escapeHTML(visit.clientPhone)}">${escapeHTML(visit.clientPhone)}</a>` : '—'}</td>
        <td><button class="row-action" type="button" data-open-visit="${escapeHTML(visit._id)}">Gestionar</button></td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state">No encontramos citas con esos filtros.</div></td></tr>';
  }

  function openVisitDetails(visitId) {
    const visit = state.visits.find((item) => String(item._id) === String(visitId));
    if (!visit) return;
    state.activeVisit = visit;
    $('details-title').textContent = visit.clientName;
    $('details-summary').innerHTML = `
      <span><strong>Propiedad:</strong> ${escapeHTML(visit.propertyTitle)}</span>
      <span><strong>Contacto:</strong> ${escapeHTML(visit.clientPhone)}${visit.clientEmail ? ` · ${escapeHTML(visit.clientEmail)}` : ''}</span>
      <span><strong>Estado:</strong> ${escapeHTML(statusLabel(visit.status))}</span>
      ${visit.notes ? `<span><strong>Notas:</strong> ${escapeHTML(visit.notes)}</span>` : ''}`;
    $('details-form').elements.visitId.value = visit._id;
    $('details-form').elements.scheduledDate.value = visitDate(visit);
    $('details-form').elements.scheduledTime.value = visit.scheduledTime || visit.time || '';
    $('details-dialog').showModal();
  }

  async function updateVisit(status) {
    const visit = state.activeVisit;
    if (!visit) return;
    const form = $('details-form');
    const updates = { status };
    if (status === 'confirmada') {
      updates.scheduledDate = form.elements.scheduledDate.value;
      updates.scheduledTime = form.elements.scheduledTime.value;
      if (!updates.scheduledDate || !updates.scheduledTime) {
        showNotice('Para confirmar, selecciona una fecha y una hora.');
        return;
      }
    }
    const button = $('details-dialog').querySelector(`[data-action="${status}"]`);
    button.disabled = true;
    try {
      await api.updateVisitStatus(visit._id, updates);
      $('details-dialog').close();
      showNotice(status === 'cancelada' ? 'La cita quedó cancelada.' : 'La cita se actualizó correctamente.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function createVisit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const property = state.properties.find((item) => String(item._id) === data.propertyId);
    if (!property) {
      showNotice('Selecciona una propiedad del inventario.');
      return;
    }
    const button = $('save-visit-button');
    button.disabled = true;
    try {
      await api.createAdminVisit({
        ...data,
        propertyId: property._id,
        propertyTitle: property.title,
        propertyPrice: property.priceFormatted || String(property.price || ''),
        propertyLocation: property.location || property.city || ''
      });
      form.reset();
      form.elements.time.value = '10:00';
      $('visit-dialog').close();
      showNotice('La cita quedó agregada a la agenda.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message);
    } finally {
      button.disabled = false;
    }
  }

  function exportCSV() {
    const rows = [
      ['Cliente', 'Teléfono', 'Correo', 'Propiedad', 'Fecha', 'Hora', 'Estado', 'Notas'],
      ...filteredVisits().map((visit) => [
        visit.clientName, visit.clientPhone, visit.clientEmail, visit.propertyTitle,
        visitDate(visit), visit.scheduledTime || visit.time, statusLabel(visit.status), visit.notes
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aisa-agenda-${dateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    // Dock Toggle & Modo Drawer
    function toggleDock() {
      const isMobile = window.innerWidth <= 1024;
      if (isMobile) {
        const isOpen = document.body.classList.toggle('sidebar-open');
        if (menuToggleBtn) {
          menuToggleBtn.setAttribute('aria-expanded', String(isOpen));
          menuToggleBtn.setAttribute('aria-label', isOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral');
        }
      } else {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-expanded', !isCollapsed);
        try {
          localStorage.setItem('aisa-agenda-dock-collapsed', isCollapsed ? 'true' : 'false');
        } catch {}
      }
    }

    const menuToggleBtn = $('menu-toggle-btn');
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleDock);

    const dockCollapseBtn = $('dock-collapse-btn');
    if (dockCollapseBtn) dockCollapseBtn.addEventListener('click', toggleDock);

    const sidebarBackdrop = $('sidebar-backdrop');
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
        if (menuToggleBtn) {
          menuToggleBtn.setAttribute('aria-expanded', 'false');
          menuToggleBtn.setAttribute('aria-label', 'Abrir menú lateral');
        }
      });
    }

    // Auto-cerrar drawer al navegar en móvil
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          document.body.classList.remove('sidebar-open');
          if (menuToggleBtn) {
            menuToggleBtn.setAttribute('aria-expanded', 'false');
            menuToggleBtn.setAttribute('aria-label', 'Abrir menú lateral');
          }
        }
      });
    });

    // Buscador Global Rápido en Topbar
    const globalSearch = $('global-quick-search');
    if (globalSearch) {
      globalSearch.addEventListener('input', (event) => {
        const value = event.target.value.trim();
        state.query = value;
        state.inventoryQuery = value;
        state.preparationQuery = value;

        const tableSearch = $('search-input');
        if (tableSearch) tableSearch.value = value;
        const invSearch = $('inventory-search');
        if (invSearch) invSearch.value = value;
        const prepSearch = $('preparation-search');
        if (prepSearch) prepSearch.value = value;

        renderTable();
        renderInventory();
        renderPreparations();
      });

      globalSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const target = $('inventory-management') || $('appointment-management');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Atajos de teclado: Ctrl+B (Dock) y Ctrl+K (Buscador)
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleDock();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (globalSearch) {
          globalSearch.focus();
          globalSearch.select();
        }
      }
      if (event.key === 'Escape') {
        document.body.classList.remove('sidebar-open');
      }
    });

    $('theme-toggle').addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
    document.querySelectorAll('.sidebar-link[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => updateActiveNavigation(link.hash.slice(1)));
    });
    const navigationSections = ['overview', 'calendar-management', 'appointment-management', 'consignment-management', 'inventory-management', 'preparation-management']
      .map((id) => $(id)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        const visibleSections = entries.filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio);
        if (visibleSections[0]) updateActiveNavigation(visibleSections[0].target.id);
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] });
      navigationSections.forEach((section) => sectionObserver.observe(section));
    }

    $('previous-month').addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    $('next-month').addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });
    $('today-button').addEventListener('click', () => {
      const today = new Date();
      state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      state.selectedDate = dateKey(today);
      renderCalendar();
      renderSelectedDay();
    });
    $('calendar-grid').addEventListener('click', (event) => {
      const cell = event.target.closest('[data-date]');
      if (!cell) return;
      state.selectedDate = cell.dataset.date;
      const date = new Date(`${state.selectedDate}T12:00:00`);
      state.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      renderSelectedDay();
    });
    $('day-appointments').addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-visit]');
      if (button) openVisitDetails(button.dataset.openVisit);
      const repairButton = event.target.closest('[data-open-repair]');
      if (repairButton) openRepairDialog(repairButton.dataset.openRepair, repairButton.dataset.repairId);
    });
    $('visits-table-body').addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-visit]');
      if (button) openVisitDetails(button.dataset.openVisit);
    });
    $('inventory-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-property]');
      if (button) editProperty(button.dataset.editProperty);
    });
    $('preparation-grid').addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-preparation]');
      if (editButton) {
        openPreparationDialog(state.preparations.find((item) => String(item._id) === String(editButton.dataset.editPreparation)));
        return;
      }
      const addRepairButton = event.target.closest('[data-add-repair]');
      if (addRepairButton) {
        openRepairDialog(addRepairButton.dataset.addRepair);
        return;
      }
      const openRepairButton = event.target.closest('[data-open-repair]');
      if (openRepairButton) {
        openRepairDialog(openRepairButton.dataset.openRepair, openRepairButton.dataset.repairId);
        return;
      }
      const completeButton = event.target.closest('[data-complete-repair]');
      if (completeButton) {
        completeRepair(completeButton.dataset.completeRepair, completeButton.dataset.repairId);
        return;
      }
      const readyButton = event.target.closest('[data-mark-ready]');
      if (readyButton) {
        markPreparationReady(readyButton.dataset.markReady);
        return;
      }
      const promoteButton = event.target.closest('[data-promote-preparation]');
      if (promoteButton) promotePreparation(promoteButton.dataset.promotePreparation);
    });
    $('consignments-table-body').addEventListener('click', (event) => {
      const approveButton = event.target.closest('[data-approve-consignment]');
      if (approveButton) { openConsignmentApproval(approveButton.dataset.approveConsignment); return; }
      const photoButton = event.target.closest('[data-view-consignment-photos]');
      if (photoButton) {
        openConsignmentPhotos(photoButton.dataset.viewConsignmentPhotos);
        return;
      }
      const updateButton = event.target.closest('[data-update-consignment]');
      if (updateButton) saveConsignmentStatus(updateButton);
    });
    $('inventory-search').addEventListener('input', (event) => {
      state.inventoryQuery = event.target.value;
      renderInventory();
    });
    $('inventory-operation-filter').addEventListener('change', (event) => {
      state.inventoryOperation = event.target.value;
      renderInventory();
    });
    $('inventory-status-filter').addEventListener('change', (event) => {
      state.inventoryStatus = event.target.value;
      renderInventory();
    });
    $('preparation-search').addEventListener('input', (event) => {
      state.preparationQuery = event.target.value;
      renderPreparations();
    });
    $('preparation-status-filter').addEventListener('change', (event) => {
      state.preparationStatus = event.target.value;
      renderPreparations();
    });
    $('status-filter').addEventListener('change', (event) => { state.status = event.target.value; renderTable(); });
    $('property-filter').addEventListener('change', (event) => { state.propertyId = event.target.value; renderTable(); });
    $('search-input').addEventListener('input', (event) => { state.query = event.target.value; renderTable(); });
    $('refresh-button').addEventListener('click', () => {
      hideNotice();
      loadData();
    });
    $('refresh-consignments').addEventListener('click', loadData);
    $('close-consignment-photo-dialog').addEventListener('click', () => $('consignment-photo-dialog').close());
    $('consignment-approval-form').addEventListener('submit', submitConsignmentApproval);
    $('close-consignment-approval').addEventListener('click', () => $('consignment-approval-dialog').close());
    $('consignment-photo-dialog').addEventListener('click', (event) => {
      if (event.target === $('consignment-photo-dialog')) $('consignment-photo-dialog').close();
    });
    $('consignment-photo-dialog').addEventListener('close', () => {
      consignmentPhotoUrls.forEach(url => URL.revokeObjectURL(url));
      consignmentPhotoUrls = [];
      $('consignment-photo-gallery').replaceChildren();
    });
    $('export-button').addEventListener('click', exportCSV);
        // Atajos Rápidos de Escenarios en el Asistente de IA
    const SCENARIO_TEMPLATES = {
      compra: "Hola, me interesa comprar una propiedad. ¿Qué opciones tienen y cómo puedo agendar una visita?",
      renta: "Hola, busco una propiedad en renta. ¿Qué opciones hay y cuáles son los requisitos?",
      vender: "Hola, me gustaría vender mi propiedad. ¿Qué información necesitan para orientarme?",
      avaluo: "Hola, necesito información sobre un avalúo. ¿Me pueden orientar?",
      sello_rojo: "Hola, tengo una duda sobre una característica de una propiedad. ¿Me pueden ayudar a confirmarla?"
    };

    document.querySelectorAll('.scenario-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const scenarioKey = pill.dataset.scenario;
        const msg = SCENARIO_TEMPLATES[scenarioKey];
        if (msg) {
          const input = $('whatsapp-customer-message');
          if (input) {
            input.value = msg;
            input.focus();
            draftWhatsAppReply(new Event('submit'));
          }
        }
      });
    });
    $('new-visit-button').addEventListener('click', () => {
      if (!state.properties.length) {
        showNotice('No hay propiedades disponibles para vincular. Revisa el inventario.');
        return;
      }
      const dateInput = $('visit-form').elements.date;
      dateInput.value = state.selectedDate || dateKey(new Date());
      $('visit-dialog').showModal();
    });
    $('calendar-new-visit').addEventListener('click', () => $('new-visit-button').click());
    $('quick-add-task').addEventListener('click', openQuickTaskDialog);
    $('quick-task-form').addEventListener('submit', saveQuickTask);
    $('close-quick-task').addEventListener('click', () => $('quick-task-dialog').close());
    $('cancel-quick-task').addEventListener('click', () => $('quick-task-dialog').close());
    $('close-visit-dialog').addEventListener('click', () => $('visit-dialog').close());
    $('cancel-visit-dialog').addEventListener('click', () => $('visit-dialog').close());
    $('visit-form').addEventListener('submit', createVisit);
    $('close-details-dialog').addEventListener('click', () => $('details-dialog').close());
    $('details-form').querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => updateVisit(button.dataset.action));
    });
    $('refresh-inventory').addEventListener('click', loadData);
    $('close-property-dialog').addEventListener('click', () => $('property-dialog').close());
    $('cancel-property-dialog').addEventListener('click', () => $('property-dialog').close());
    $('property-form').addEventListener('submit', saveProperty);
    $('new-preparation-button').addEventListener('click', () => openPreparationDialog());
    $('close-preparation-dialog').addEventListener('click', () => $('preparation-dialog').close());
    $('cancel-preparation-dialog').addEventListener('click', () => $('preparation-dialog').close());
    $('preparation-form').addEventListener('submit', savePreparation);
    $('close-repair-dialog').addEventListener('click', () => $('repair-dialog').close());
    $('cancel-repair-dialog').addEventListener('click', () => $('repair-dialog').close());
    $('repair-form').addEventListener('submit', saveRepair);
    $('avatar').addEventListener('click', () => {
      api.logout();
      window.location.assign('/');
    });
  }

  async function init() {
    applyTheme(document.documentElement.dataset.theme);

    // Restaurar estado preferido del dock
    try {
      const isCollapsed = localStorage.getItem('aisa-agenda-dock-collapsed') === 'true';
      if (window.innerWidth > 1024) {
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        document.body.classList.toggle('sidebar-expanded', !isCollapsed);
      }
    } catch {}

    updateActiveNavigation(location.hash.slice(1) || 'overview');
    if (!await authenticate()) return;
    bindEvents();
    await loadData();
  }

  init().catch((error) => {
    setConnection(false, 'Error');
    showNotice(error.message || 'No se pudo iniciar la agenda.');
  });
});
