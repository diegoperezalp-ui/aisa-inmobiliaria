document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const state = {
    properties: [],
    visits: [],
    preparations: [],
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
            api.logout();
            throw new Error('Esta cuenta no tiene permisos de administrador.');
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
      showNotice('No se pudo cargar el cliente de la API. Actualiza la página o vuelve a intentarlo.');
      return false;
    }

    let user = api.isAuthenticated() ? await api.getMe() : null;
    if (!user || user.role !== 'admin') {
      if (user) api.logout();
      if (!await showLoginPrompt()) return false;
      user = await api.getMe();
    }

    if (user?.role !== 'admin') {
      api.logout();
      showNotice('La cuenta no tiene permisos de administrador para consultar la agenda.');
      return false;
    }
    $('avatar').textContent = (user.name || 'A').trim().charAt(0).toUpperCase();
    $('today-label').textContent = dateFormatter.format(new Date());
    return true;
  }

  async function loadData() {
    hideNotice();
    $('refresh-button').disabled = true;
    setConnection(false, 'Sincronizando...');
    try {
      const [propertyResult, visitResult, preparationResult] = await Promise.all([
        api.getAdminProperties(),
        api.getVisits(),
        api.getPreparations()
      ]);
      state.properties = propertyResult.data || [];
      state.visits = visitResult.data || [];
      state.preparations = preparationResult.data || [];
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
    $('metric-total').textContent = state.visits.length;
    $('metric-pending').textContent = state.visits.filter((visit) => visit.status === 'pendiente').length;
    $('metric-confirmed').textContent = state.visits.filter((visit) => visit.status === 'confirmada').length;
    $('metric-today').textContent = state.visits.filter((visit) => visitDate(visit) === today && visit.status !== 'cancelada').length;
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
    $('export-button').addEventListener('click', exportCSV);
    $('new-visit-button').addEventListener('click', () => {
      if (!state.properties.length) {
        showNotice('No hay propiedades disponibles para vincular. Revisa el inventario.');
        return;
      }
      const dateInput = $('visit-form').elements.date;
      dateInput.value = state.selectedDate || dateKey(new Date());
      $('visit-dialog').showModal();
    });
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
    if (!await authenticate()) return;
    bindEvents();
    await loadData();
  }

  init().catch((error) => {
    setConnection(false, 'Error');
    showNotice(error.message || 'No se pudo iniciar la agenda.');
  });
});
