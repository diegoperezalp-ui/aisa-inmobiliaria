document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const state = {
    properties: [],
    visits: [],
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: dateKey(new Date()),
    query: '',
    status: 'all',
    propertyId: 'all',
    activeVisit: null
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

  async function authenticate() {
    if (!api?.isAuthenticated()) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }

    const user = await api.getMe();
    if (!user) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    }
    if (user.role !== 'admin') {
      document.querySelector('main').innerHTML = `
        <section class="panel" style="padding:32px;text-align:center">
          <h1>Acceso restringido</h1>
          <p>Esta agenda está disponible únicamente para el equipo administrador.</p>
          <a class="button button-primary" href="/">Volver al sitio</a>
        </section>`;
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
      const [propertyResult, visitResult] = await Promise.all([
        api.getProperties(),
        api.getVisits()
      ]);
      state.properties = propertyResult.data || [];
      state.visits = visitResult.data || [];
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
      const eventMarkup = visits.slice(0, 2).map((visit) =>
        `<span class="day-event ${escapeHTML(visit.status)}">${escapeHTML(visit.scheduledTime || visit.time || 'Cita')} · ${escapeHTML(visit.clientName)}</span>`
      ).join('');
      const more = visits.length > 2 ? `<span class="more-events">+${visits.length - 2} más</span>` : '';
      cells.push(`
        <button class="calendar-cell ${date.getMonth() !== month ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${key === state.selectedDate ? 'is-selected' : ''}" type="button" data-date="${key}" aria-label="${escapeHTML(dateFormatter.format(date))}, ${visits.length} citas">
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
    $('selected-day-count').textContent = `${visits.length} ${visits.length === 1 ? 'cita' : 'citas'}`;
    $('day-appointments').innerHTML = visits.length ? visits.map((visit) => `
      <article class="day-card">
        <div class="day-card-top"><time>${escapeHTML(timeFormatter(visit.scheduledTime || visit.time))}</time><span class="status ${escapeHTML(visit.status)}">${escapeHTML(statusLabel(visit.status))}</span></div>
        <h3>${escapeHTML(visit.clientName)}</h3>
        <p>${escapeHTML(visit.propertyTitle)}${visit.clientPhone ? ` · ${escapeHTML(visit.clientPhone)}` : ''}</p>
        <button class="text-action" type="button" data-open-visit="${escapeHTML(visit._id)}">Ver y gestionar →</button>
      </article>`).join('') : '<div class="empty-state">No hay visitas programadas para este día.<br>Elige otra fecha o agenda una nueva cita.</div>';
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
    });
    $('visits-table-body').addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-visit]');
      if (button) openVisitDetails(button.dataset.openVisit);
    });
    $('status-filter').addEventListener('change', (event) => { state.status = event.target.value; renderTable(); });
    $('property-filter').addEventListener('change', (event) => { state.propertyId = event.target.value; renderTable(); });
    $('search-input').addEventListener('input', (event) => { state.query = event.target.value; renderTable(); });
    $('refresh-button').addEventListener('click', loadData);
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
    $('refresh-button').addEventListener('click', hideNotice);
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
