/**
 * ========================================================
 * FICHA DE DETALLE DE PROPIEDAD - AISA INMOBILIARIA
 * Integrado con MongoDB REST API y soporte offline/estático
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  const detail = document.getElementById('property-detail');
  const errorPanel = document.getElementById('property-detail-error');
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id') || '';
  let property = null;
  const favoriteButton = document.getElementById('property-favorite');
  const favoriteLabel = document.getElementById('property-favorite-label');
  const scheduleButton = document.getElementById('property-schedule-open');
  const visitForm = document.getElementById('property-visit-form');
  const visitFeedback = document.getElementById('property-visit-feedback');
  const visitPhone = document.getElementById('property-visit-phone');

  const requestVisitLogin = () => {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('scheduleVisit', '1');
    const returnTo = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
    window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const openVisitForm = () => {
    const user = window.gkApi?.getUser();
    const dateInput = document.getElementById('property-visit-date');
    if (dateInput) {
      const localToday = new Date();
      localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset());
      dateInput.min = localToday.toISOString().slice(0, 10);
    }
    if (visitPhone && user?.phone) visitPhone.value = user.phone;
    if (visitForm) visitForm.hidden = false;
    if (scheduleButton) scheduleButton.hidden = true;
    visitPhone?.focus();
  };

  scheduleButton?.addEventListener('click', () => {
    if (!window.gkApi?.isAuthenticated()) {
      requestVisitLogin();
      return;
    }
    openVisitForm();
  });

  visitForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!window.gkApi?.isAuthenticated()) {
      requestVisitLogin();
      return;
    }

    const submitButton = visitForm.querySelector('button[type="submit"]');
    const date = document.getElementById('property-visit-date').value;
    const time = document.getElementById('property-visit-time').value;
    submitButton.disabled = true;
    if (visitFeedback) visitFeedback.hidden = true;

    try {
      const result = await window.gkApi.scheduleVisit({
        propertyId: property?.propertyId || property?.id || requestedId,
        propertyTitle: property?.name || 'Propiedad de Aisa Inmobiliaria',
        propertyPrice: property?.price || '',
        propertyLocation: property?.location || '',
        clientPhone: visitPhone.value.trim(),
        date,
        time
      });
      if (visitFeedback) {
        visitFeedback.textContent = result.message || 'Solicitud guardada en Mis visitas.';
        visitFeedback.className = 'property-visit-feedback is-success';
        visitFeedback.hidden = false;
      }
      visitForm.hidden = true;
      scheduleButton.hidden = true;
    } catch (error) {
      if (visitFeedback) {
        visitFeedback.textContent = error.message || 'No se pudo guardar la solicitud.';
        visitFeedback.className = 'property-visit-feedback is-error';
        visitFeedback.hidden = false;
      }
    } finally {
      submitButton.disabled = false;
    }
  });

  const getFavoriteIdentifiers = () => [property?.propertyId, property?.slug, property?.id, property?.mongoId]
    .filter(Boolean)
    .map(String);

  const updateFavoriteButton = isSaved => {
    if (!favoriteButton) return;
    favoriteButton.classList.toggle('is-saved', isSaved);
    favoriteButton.setAttribute('aria-pressed', String(isSaved));
    if (favoriteLabel) favoriteLabel.textContent = isSaved ? 'Quitar de favoritos' : 'Guardar en favoritos';
  };

  const syncFavoriteButton = () => {
    let localFavorites = [];
    try {
      localFavorites = JSON.parse(localStorage.getItem('aisa-favorite-properties') || '[]');
    } catch (error) {
      localFavorites = [];
    }
    const userFavorites = window.gkApi?.getUser()?.favorites || [];
    const savedFavorites = new Set([...userFavorites, ...localFavorites].map(String));
    updateFavoriteButton(getFavoriteIdentifiers().some(identifier => savedFavorites.has(identifier)));
  };

  favoriteButton?.addEventListener('click', async () => {
    if (!window.gkApi?.isAuthenticated()) {
      window.gkApi?.showToast('Inicia sesión para guardar tus favoritos.', 'info');
      window.location.href = '/login';
      return;
    }

    const favoriteId = property?.propertyId || property?.slug || property?.id || property?.mongoId;
    if (!favoriteId) {
      window.gkApi.showToast('No se pudo identificar esta propiedad.', 'error');
      return;
    }

    favoriteButton.disabled = true;
    try {
      const result = await window.gkApi.toggleFavorite(favoriteId);
      updateFavoriteButton(Boolean(result.isSaved));
      window.gkApi.showToast(result.message || (result.isSaved ? 'Propiedad añadida a tus favoritos.' : 'Propiedad eliminada de tus favoritos.'), result.isSaved ? 'success' : 'info');
    } catch (error) {
      window.gkApi.showToast(error.message || 'No se pudo actualizar tus favoritos.', 'error');
    } finally {
      favoriteButton.disabled = false;
    }
  });

  const slugify = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const showError = message => {
    console.error(message);
    if (detail) detail.hidden = true;
    if (errorPanel) errorPanel.hidden = false;
  };

  const featureValue = (features, pattern, fallback) => {
    if (!Array.isArray(features)) return fallback;
    const feature = features.find(item => pattern.test(item));
    if (!feature) return fallback;
    const match = feature.match(/[\d,.]+\s*(?:m²|baños?|rec\.?|autos?|cajones?)/i);
    return match ? match[0] : feature.replace(/^[^\w\d]+/u, '').trim();
  };

  const addStat = (container, label, value, icon) => {
    const item = document.createElement('div');
    item.className = 'property-detail-stat';
    const symbol = document.createElement('span');
    symbol.className = 'property-detail-stat-icon';
    symbol.setAttribute('aria-hidden', 'true');
    symbol.textContent = icon;
    const text = document.createElement('span');
    text.className = 'property-detail-stat-label';
    text.textContent = label;
    const amount = document.createElement('strong');
    amount.textContent = value;
    item.append(symbol, text, amount);
    container.append(item);
  };

  const renderMap = () => {
    const mapElement = document.getElementById('property-detail-map');
    const message = document.getElementById('property-map-message');
    const latitude = Number(property.latitude);
    const longitude = Number(property.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !window.L) {
      if (message) message.textContent = 'El mapa no está disponible en este momento.';
      return;
    }

    if (message) message.remove();
    const map = window.L.map(mapElement, { scrollWheelZoom: false }).setView([latitude, longitude], 14);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    window.L.marker([latitude, longitude], { title: `Zona de ${property.name}` })
      .addTo(map)
      .bindPopup(`<strong>${property.name}</strong><br>${property.location}`);
    window.L.control.scale({ imperial: false }).addTo(map);
  };

  const renderGallery = () => {
    const mainImage = document.getElementById('property-main-image');
    const thumbnails = document.getElementById('property-gallery-thumbnails');
    const images = [...new Set((property.images || []).filter(Boolean))].slice(0, 4);
    if (!images.length) {
      showError('La ficha no contiene fotografías de referencia.');
      return;
    }

    thumbnails.hidden = images.length < 2;
    mainImage.src = images[0];
    mainImage.alt = `Fotografía de ${property.name}`;
    mainImage.onerror = () => {
      mainImage.onerror = null;
      mainImage.src = 'assets/hero-casa.jpg';
    };

    thumbnails.innerHTML = '';
    images.forEach((source, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `property-gallery-thumbnail${index === 0 ? ' is-active' : ''}`;
      button.setAttribute('aria-label', `Mostrar foto ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === 0));
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = () => { button.hidden = true; };
      button.append(image);
      button.addEventListener('click', () => {
        mainImage.src = source;
        mainImage.alt = `Fotografía ${index + 1} de ${property.name}`;
        thumbnails.querySelectorAll('.property-gallery-thumbnail').forEach(thumbnail => {
          const active = thumbnail === button;
          thumbnail.classList.toggle('is-active', active);
          thumbnail.setAttribute('aria-pressed', String(active));
        });
      });
      thumbnails.append(button);
    });
  };

  const render = () => {
    if (!detail || !errorPanel || !property) {
      showError('No se encontró una propiedad que coincida con el identificador solicitado.');
      return;
    }

    const typeLabels = {
      casa: 'Casa',
      departamento: 'Departamento',
      loft: 'Loft / estudio',
      terreno: 'Terreno',
      comercial: 'Comercial'
    };
    const features = Array.isArray(property.features) ? property.features : [];
    const isLand = property.type === 'terreno';
    const sale = property.operation !== 'renta';

    document.title = `${property.name} | ${sale ? 'Venta' : 'Renta'} en Monterrey | Aisa Inmobiliaria`;
    document.getElementById('property-back-link').href = sale ? 'compra.html' : 'renta.html';
    document.getElementById('property-back-link').textContent = sale ? 'Propiedades en venta' : 'Propiedades en renta';
    document.getElementById('property-name').textContent = property.name;
    document.getElementById('property-breadcrumb-current').textContent = property.name;
    document.getElementById('property-location').textContent = property.location;
    document.getElementById('property-price').textContent = property.price;
    document.getElementById('property-operation').textContent = `${sale ? 'En venta' : 'En renta'} · ${typeLabels[property.type] || 'Inmueble'}`;

    const stats = document.getElementById('property-stats');
    stats.innerHTML = '';
    addStat(stats, 'Superficie', featureValue(features, /m²/i, property.areaM2 ? `${property.areaM2} m²` : 'No especificada'), '⌂');
    addStat(stats, 'Recámaras', featureValue(features, /rec\./i, property.bedrooms ? `${property.bedrooms} rec.` : (isLand ? 'No aplica' : property.type === 'loft' ? 'Estudio' : 'No especificado')), '▦');
    addStat(stats, 'Baños', featureValue(features, /baño/i, property.bathrooms ? `${property.bathrooms} baños` : (isLand ? 'No aplica' : 'No especificado')), '◌');
    addStat(stats, 'Estacionamiento', featureValue(features, /auto|cajón/i, property.parking ? `${property.parking} autos` : 'No especificado'), '▣');

    const descElem = document.getElementById('property-description');
    if (descElem) {
      descElem.textContent = property.description || (isLand
        ? `Terreno en ${property.location}. Excelente opción para construcción o inversión.`
        : `Excelente propiedad en ${property.location}. Cuenta con alta calidad constructiva y acabados de primera.`);
    }

    const featureList = document.getElementById('property-feature-list');
    featureList.innerHTML = '';
    features.forEach(feature => {
      const chip = document.createElement('span');
      chip.textContent = feature;
      featureList.append(chip);
    });

    const operation = property.operation === 'renta' ? 'rentar' : 'comprar';
    const message = encodeURIComponent(`Hola, Aisa Inmobiliaria. Estoy interesado en ${operation} ${property.name} (${property.price}). ¿Podrían compartirme más información y ayudarme a agendar una visita?`);
    const waBtn = document.getElementById('property-whatsapp');
    if (waBtn) {
      waBtn.href = `https://wa.me/52814703248?text=${message}`;
      waBtn.setAttribute('aria-label', `Contactar por WhatsApp sobre ${property.name}`);
    }

    renderGallery();
    syncFavoriteButton();
    renderMap();
    detail.hidden = false;

    if (params.get('scheduleVisit') === '1' && window.gkApi?.isAuthenticated()) {
      openVisitForm();
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('scheduleVisit');
      window.history.replaceState(null, '', `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
    }
  };

  // 1. Intentar cargar directamente desde MongoDB vía API
  if (requestedId && window.gkApi) {
    try {
      const res = await window.gkApi.getProperty(requestedId);
      if (res && res.data) {
        const d = res.data;
        property = {
          id: d.slug || d._id,
          propertyId: d.propertyId,
          slug: d.slug,
          mongoId: d._id,
          name: d.title,
          operation: d.operation,
          type: d.type,
          price: d.priceFormatted || `$${d.price.toLocaleString('es-MX')}`,
          location: d.location,
          description: d.description,
          features: d.features && d.features.length ? d.features : [`${d.bedrooms || 3} rec.`, `${d.bathrooms || 2} baños`, `${d.areaM2 || 150} m²`],
          images: d.images && d.images.length ? d.images : ['assets/hero-casa.jpg'],
          latitude: d.coordinates?.latitude || 25.6866,
          longitude: d.coordinates?.longitude || -100.3161
        };
        render();
        return;
      }
    } catch (e) {
      // Continuar con fallback
    }
  }

  // 2. Intentar leer desde parámetro 'data' en URL
  const encodedProperty = params.get('data');
  if (encodedProperty) {
    try {
      property = JSON.parse(encodedProperty);
      render();
      return;
    } catch (error) {
      console.warn('Fallback a páginas estáticas:', error);
    }
  }

  // 3. Fallback: buscar en páginas estáticas del catálogo
  try {
    const pages = await Promise.all(['index.html', 'compra.html', 'renta.html'].map(async path => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
      return { path, markup: await response.text() };
    }));

    const entries = pages.flatMap(({ path, markup }) => {
      const source = new DOMParser().parseFromString(markup, 'text/html');
      return Array.from(source.querySelectorAll('#map-property-data .property-card, #propiedades .property-card, #properties-grid-container .property-card'))
        .map(card => ({ card, path }));
    });

    const matchingEntries = entries.filter(({ card }) => slugify(card.querySelector('.property-name')?.textContent.trim() || '') === requestedId);
    if (!matchingEntries.length) throw new Error('No se encontró una propiedad que coincida con el identificador solicitado.');

    const { card, path } = matchingEntries[0];
    const image = card.querySelector('.property-image');
    property = {
      id: requestedId,
      propertyId: card.querySelector('.property-favorite')?.dataset.propertyId || '',
      slug: requestedId,
      name: card.querySelector('.property-name').textContent.trim(),
      operation: card.dataset.operation || (path === 'renta.html' ? 'renta' : 'venta'),
      type: card.dataset.type || 'inmueble',
      price: card.querySelector('.property-price').textContent.trim(),
      location: card.querySelector('.property-location').textContent.trim(),
      features: Array.from(card.querySelectorAll('.property-features span')).map(feature => feature.textContent.trim()),
      images: [image?.getAttribute('src')].filter(Boolean),
      latitude: card.dataset.lat || '',
      longitude: card.dataset.lng || ''
    };
    render();
  } catch (error) {
    showError(`No se pudo cargar la ficha: ${error.message}`);
  }
});
