(() => {
  const onReady = callback => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  };

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const getPropertyId = property => String(property.propertyId || property.slug || property._id || '');
  const getFavoriteIdsFor = property => [property.propertyId, property.slug, property._id].filter(Boolean).map(String);
  const isFavorite = (property, favorites) => getFavoriteIdsFor(property).some(id => favorites.has(id));
  const getLocation = property => [property.neighborhood, property.city].filter(Boolean).join(', ') || property.location || 'Monterrey y área metropolitana';
  const getPrice = property => property.priceFormatted || new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0
  }).format(Number(property.price) || 0) + (property.operation === 'renta' ? ' / mes' : '');
  const getImage = property => {
    const value = Array.isArray(property.images) ? property.images[0] : '';
    if (!value) return '';
    try {
      const url = new URL(value, window.location.href);
      return ['https:', 'http:'].includes(url.protocol) || (url.origin === window.location.origin && url.pathname.startsWith('/')) ? url.href : '';
    } catch {
      return '';
    }
  };

  const parseRange = value => {
    if (!value || value === 'all') return null;
    const [first, second] = value.split('-').map(Number);
    if (!Number.isFinite(first)) return null;
    return Number.isFinite(second) ? { min: first, max: second } : { min: first, max: Infinity };
  };

  function makeFeature(text) {
    const feature = document.createElement('span');
    feature.textContent = text;
    return feature;
  }

  function makeCard(property, favoriteIds, onFavoriteChange, withFavorite = false) {
    const id = getPropertyId(property);
    const operation = property.operation === 'renta' ? 'renta' : 'venta';
    const price = Number(property.price) || 0;
    const location = getLocation(property);
    const imageUrl = getImage(property);
    const card = document.createElement('article');
    card.className = 'property-card';
    card.dataset.propertyId = id;
    card.dataset.operation = operation;
    card.dataset.type = property.type || '';
    card.dataset.city = normalize([property.city, property.neighborhood, property.location].join(' '));
    card.dataset.neighborhood = normalize(property.neighborhood || '');
    card.dataset.price = String(price);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'property-image-wrapper';
    if (imageUrl) {
      const image = document.createElement('img');
      image.className = 'property-image';
      image.src = imageUrl;
      image.alt = property.title || 'Propiedad de Aisa Inmobiliaria';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'property-image-placeholder';
        placeholder.textContent = 'Aisa Inmobiliaria';
        image.replaceWith(placeholder);
      }, { once: true });
      imageWrapper.append(image);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'property-image-placeholder';
      placeholder.textContent = 'Aisa Inmobiliaria';
      imageWrapper.append(placeholder);
    }

    const badges = document.createElement('div');
    badges.className = 'property-badge-overlay';
    const operationBadge = document.createElement('span');
    operationBadge.className = `badge ${operation === 'renta' ? 'badge-rent' : 'badge-sale'}`;
    operationBadge.textContent = operation === 'renta' ? 'Renta' : 'Venta';
    const availabilityBadge = document.createElement('span');
    availabilityBadge.className = 'badge badge-soft';
    availabilityBadge.textContent = property.featured ? 'Destacada' : 'Disponible';
    badges.append(operationBadge, availabilityBadge);
    imageWrapper.append(badges);

    if (withFavorite) {
      const favorite = document.createElement('button');
      favorite.type = 'button';
      favorite.className = 'property-favorite';
      favorite.dataset.propertyId = id;
      favorite.setAttribute('aria-label', `Guardar ${property.title || 'propiedad'}`);
      favorite.setAttribute('aria-pressed', String(isFavorite(property, favoriteIds)));
      favorite.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>';
      favorite.classList.toggle('is-saved', isFavorite(property, favoriteIds));
      favorite.addEventListener('click', async () => {
        favorite.disabled = true;
        try {
          const identifiers = getFavoriteIdsFor(property);
          const targetId = identifiers.find(identifier => favoriteIds.has(identifier)) || id;
          const result = await window.gkApi.toggleFavorite(targetId);
          if (result.isSaved) favoriteIds.add(targetId);
          else favoriteIds.delete(targetId);
          favorite.classList.toggle('is-saved', Boolean(result.isSaved));
          favorite.setAttribute('aria-pressed', String(Boolean(result.isSaved)));
          favorite.setAttribute('aria-label', `${result.isSaved ? 'Quitar de favoritos' : 'Guardar'} ${property.title || 'propiedad'}`);
          onFavoriteChange();
        } catch (error) {
          window.gkApi?.showToast(error.message || 'No se pudo actualizar el favorito.', 'error');
        } finally {
          favorite.disabled = false;
        }
      });
      imageWrapper.append(favorite);
    }

    const info = document.createElement('div');
    info.className = 'property-info';
    const priceLabel = document.createElement('p');
    priceLabel.className = 'property-price';
    priceLabel.textContent = getPrice(property);
    const name = document.createElement('h3');
    name.className = 'property-name';
    name.textContent = property.title || 'Propiedad disponible';
    const locationLabel = document.createElement('p');
    locationLabel.className = 'property-location';
    locationLabel.textContent = location;
    const features = document.createElement('div');
    features.className = 'property-features';
    const bedrooms = Number(property.bedrooms) || 0;
    const bathrooms = Number(property.bathrooms) || 0;
    const area = Number(property.constructionAreaM2 || property.areaM2) || 0;
    const parking = Number(property.parkingSpaces || property.parking) || 0;
    if (bedrooms) features.append(makeFeature(`${bedrooms} rec.`));
    if (bathrooms) features.append(makeFeature(`${bathrooms} baños`));
    if (area) features.append(makeFeature(`${area} m²`));
    if (parking) features.append(makeFeature(`${parking} cajones`));

    const actions = document.createElement('div');
    actions.className = 'property-actions';
    const detailLink = document.createElement('a');
    detailLink.className = 'btn btn-outline-dark btn-sm btn-block property-detail-link';
    detailLink.href = `/propiedad.html?id=${encodeURIComponent(property.slug || id)}`;
    detailLink.textContent = 'Ver ficha completa';
    const whatsapp = document.createElement('a');
    const actionWord = operation === 'renta' ? 'rentar' : 'comprar';
    whatsapp.href = `https://wa.me/5218147030248?text=${encodeURIComponent(`Hola, Aisa Inmobiliaria. Me interesa ${actionWord} ${property.title || 'esta propiedad'}. ¿Podrían compartirme información y ayudarme a agendar una visita?`)}`;
    whatsapp.className = 'btn btn-accent btn-sm btn-block property-whatsapp-link';
    whatsapp.target = '_blank';
    whatsapp.rel = 'noreferrer';
    whatsapp.textContent = 'WhatsApp';
    actions.append(detailLink, whatsapp);
    info.append(priceLabel, name, locationLabel, features, actions);
    card.append(imageWrapper, info);
    return card;
  }

  onReady(async () => {
    if (document.body.dataset.catalog !== 'database') return;
    const api = window.gkApi;
    const path = normalize(window.location.pathname.split('/').filter(Boolean).pop() || 'index').replace(/\.html$/, '');
    const pageOperation = path === 'compra' ? 'venta' : path === 'renta' ? 'renta' : null;
    const mainGrid = document.getElementById('properties-grid-container');
    const featuredGrid = document.getElementById('featured-properties-grid');
    const mapElement = document.getElementById('property-map');
    const status = document.getElementById('catalog-status');
    const emptyState = document.getElementById('no-results-msg');
    const count = document.getElementById('map-result-count');
    const favoriteToggle = document.getElementById('show-favorites');
    const favoriteCount = document.getElementById('favorite-count');
    const favorites = new Set(api?.getFavoriteIds() || []);
    const params = new URLSearchParams(window.location.search);
    const mapControls = {
      operation: document.getElementById('map-filter-operation'),
      type: document.getElementById('map-filter-type'),
      neighborhood: document.getElementById('map-filter-neighborhood'),
      budget: document.getElementById('map-filter-budget')
    };
    let properties = [];
    let filteredProperties = [];
    let favoriteOnly = false;
    let map = null;
    let markers = [];

    const setMessage = (container, message, className = 'catalog-feedback') => {
      if (!container) return;
      const node = document.createElement('p');
      node.className = className;
      node.textContent = message;
      container.replaceChildren(node);
    };

    const matchesPrice = (price, range) => !range || (price >= range.min && price <= range.max);
    const matchesLocation = (property, selected) => {
      if (!selected || selected === 'all') return true;
      const text = normalize([property.city, property.neighborhood, property.location].join(' '));
      if (selected === 'monterrey') return /monterrey|san pedro|santiago|apodaca|guadalupe|san nicolas/.test(text);
      return text.includes(normalize(selected).replace(/-/g, ' '));
    };

    function setBudgetOptions() {
      const select = mapControls.budget;
      const operation = mapControls.operation?.value || 'all';
      if (!select) return;
      const options = operation === 'venta'
        ? [['all', 'Cualquier presupuesto'], ['0-3000000', 'Hasta $3,000,000'], ['3000000-5000000', '$3,000,000 a $5,000,000'], ['5000000-10000000', '$5,000,000 a $10,000,000'], ['10000000', '$10,000,000 o más']]
        : operation === 'renta'
          ? [['all', 'Cualquier presupuesto'], ['0-15000', 'Hasta $15,000 / mes'], ['15000-25000', '$15,000 a $25,000 / mes'], ['25000-35000', '$25,000 a $35,000 / mes'], ['35000', '$35,000 o más']]
          : [['all', 'Elige venta o renta']];
      const previous = select.value;
      select.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
      select.value = options.some(([value]) => value === previous) ? previous : 'all';
      select.disabled = operation === 'all';
    }

    function initializeMap() {
      if (!mapElement) return;
      const loading = document.getElementById('map-loading');
      if (!window.L) {
        if (loading) loading.textContent = 'El mapa no está disponible en este momento. Puedes consultar las propiedades en el catálogo.';
        return;
      }
      map = window.L.map(mapElement, { scrollWheelZoom: false }).setView([25.6866, -100.3161], 10);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      if (loading) loading.hidden = true;
    }

    function popupFor(property) {
      const content = document.createElement('article');
      content.className = 'property-map-popup';
      const imageUrl = getImage(property);
      if (imageUrl) {
        const image = document.createElement('img');
        image.className = 'property-map-popup-image';
        image.src = imageUrl;
        image.alt = property.title || 'Propiedad';
        image.loading = 'lazy';
        content.append(image);
      }
      const body = document.createElement('div');
      body.className = 'property-map-popup-info';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'property-map-popup-eyebrow';
      eyebrow.textContent = property.operation === 'renta' ? 'DISPONIBLE EN RENTA' : 'DISPONIBLE EN VENTA';
      const title = document.createElement('strong');
      title.textContent = property.title || 'Propiedad disponible';
      const price = document.createElement('span');
      price.className = 'property-map-popup-price';
      price.textContent = getPrice(property);
      const location = document.createElement('span');
      location.className = 'property-map-popup-location';
      location.textContent = getLocation(property);
      const link = document.createElement('a');
      link.className = 'property-map-popup-link';
      link.href = `/propiedad.html?id=${encodeURIComponent(property.slug || getPropertyId(property))}`;
      link.textContent = 'Ver ficha completa';
      body.append(eyebrow, title, price, location, link);
      content.append(body);
      return content;
    }

    function createMarkers() {
      if (!map) return;
      markers = [];
      const points = [];
      for (const property of properties) {
        const latitude = Number(property.coordinates?.latitude);
        const longitude = Number(property.coordinates?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
        // Redondeo para mostrar zonas aproximadas, nunca domicilios exactos.
        const point = [Math.round(latitude * 100) / 100, Math.round(longitude * 100) / 100];
        const icon = window.L.divIcon({
          className: `property-house-marker-wrap${property.operation === 'renta' ? ' is-rent' : ''}`,
          html: `<span class="property-house-marker${property.operation === 'renta' ? ' property-house-marker-rent' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"/></svg></span>`,
          iconSize: [46, 54],
          iconAnchor: [23, 47]
        });
        const marker = window.L.marker(point, { icon, title: property.title || 'Propiedad disponible' })
          .bindPopup(popupFor(property), { className: 'property-map-leaflet-popup', maxWidth: 310, minWidth: 250 });
        markers.push({ property, marker });
        points.push(point);
      }
      if (points.length > 1) map.fitBounds(points, { padding: [36, 36], maxZoom: 12 });
      else if (points.length === 1) map.setView(points[0], 12);
    }

    function mapMatches(property) {
      if (pageOperation) return filteredProperties.includes(property);
      const operation = mapControls.operation?.value || 'all';
      const type = mapControls.type?.value || 'all';
      const neighborhood = mapControls.neighborhood?.value || 'all';
      const budget = parseRange(mapControls.budget?.value || 'all');
      if (operation !== 'all' && property.operation !== operation) return false;
      if (type !== 'all' && property.type !== type) return false;
      if (!matchesLocation(property, neighborhood)) return false;
      if (!matchesPrice(Number(property.price) || 0, budget)) return false;
        if (favoriteOnly && !isFavorite(property, favorites)) return false;
      return true;
    }

    function updateMap() {
      if (!mapElement) return;
      const visible = properties.filter(mapMatches);
      markers.forEach(({ property, marker }) => {
        if (visible.includes(property)) marker.addTo(map);
        else marker.remove();
      });
      if (count) count.textContent = String(visible.length);
      const empty = document.getElementById('map-empty');
      if (empty) empty.hidden = visible.length > 0;
    }

    function getListingResults() {
      const type = document.getElementById('filter-type')?.value || params.get('type') || 'all';
      const city = document.getElementById('filter-city')?.value || 'all';
      const price = parseRange(document.getElementById('filter-price')?.value || params.get('price') || 'all');
      const location = params.get('location') || '';
      return properties.filter(property => {
        if (pageOperation && property.operation !== pageOperation) return false;
        if (type !== 'all' && property.type !== type) return false;
        if (!matchesLocation(property, city)) return false;
        if (location && !matchesLocation(property, location)) return false;
        return matchesPrice(Number(property.price) || 0, price);
      });
    }

    function renderListing() {
      if (!mainGrid) return;
      const results = getListingResults();
      const sort = document.getElementById('sort-order')?.value || 'recommended';
      if (sort === 'price-low') results.sort((a, b) => Number(a.price) - Number(b.price));
      if (sort === 'price-high') results.sort((a, b) => Number(b.price) - Number(a.price));
      filteredProperties = results;
      mainGrid.replaceChildren(...results.map(property => makeCard(property, favorites, updateFavoriteCount)));
      if (status) status.textContent = `${results.length} ${results.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'} en el inventario.`;
      if (emptyState) emptyState.hidden = results.length > 0;
      updateMap();
    }

    function updateFavoriteCount() {
      if (favoriteCount) favoriteCount.textContent = String(favorites.size);
      if (favoriteToggle) {
        favoriteToggle.classList.toggle('is-active', favoriteOnly);
        favoriteToggle.setAttribute('aria-pressed', String(favoriteOnly));
      }
      if (featuredGrid) renderFeatured();
      if (!pageOperation) updateMap();
    }

    function renderFeatured() {
      if (!featuredGrid) return;
      let featured = properties.filter(property => property.featured);
      if (!featured.length) featured = properties;
      featured = featured.slice(0, 3);
      if (favoriteOnly) featured = featured.filter(property => isFavorite(property, favorites));
      if (!featured.length) {
        setMessage(featuredGrid, favoriteOnly ? 'Aún no tienes propiedades destacadas guardadas.' : 'No hay propiedades disponibles para mostrar.');
      } else {
        featuredGrid.replaceChildren(...featured.map(property => makeCard(property, favorites, updateFavoriteCount, true)));
      }
      updateFavoriteCountText();
    }

    function updateFavoriteCountText() {
      if (favoriteCount) favoriteCount.textContent = String(properties.filter(property => isFavorite(property, favorites)).length);
    }

    function bindFilters() {
      const typeFromUrl = params.get('type');
      const priceFromUrl = params.get('price');
      const locationFromUrl = params.get('location');
      const typeSelect = document.getElementById('filter-type');
      const priceSelect = document.getElementById('filter-price');
      const citySelect = document.getElementById('filter-city');
      if (typeSelect && typeFromUrl && Array.from(typeSelect.options).some(option => option.value === typeFromUrl)) {
        typeSelect.value = typeFromUrl;
        typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (priceSelect && priceFromUrl && Array.from(priceSelect.options).some(option => option.value === priceFromUrl)) {
        priceSelect.value = priceFromUrl;
        priceSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (citySelect && locationFromUrl) {
        const target = normalize(locationFromUrl);
        const option = Array.from(citySelect.options).find(item => item.value !== 'all' && (
          normalize(item.value).replace(/-/g, ' ').includes(target) || normalize(item.textContent).includes(target)
        ));
        if (option) {
          citySelect.value = option.value;
          citySelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const apply = () => renderListing();
      ['filter-type', 'filter-city', 'filter-price', 'sort-order'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', apply);
      });
      document.getElementById('btn-filter')?.addEventListener('click', apply);
      if (favoriteToggle) favoriteToggle.addEventListener('click', () => {
        favoriteOnly = !favoriteOnly;
        updateFavoriteCount();
      });
      mapControls.operation?.addEventListener('change', () => { setBudgetOptions(); updateMap(); });
      [mapControls.type, mapControls.neighborhood, mapControls.budget].forEach(select => select?.addEventListener('change', updateMap));
      window.addEventListener('auth-change', () => {
        favorites.clear();
        (api?.getFavoriteIds() || []).forEach(id => favorites.add(String(id)));
        updateFavoriteCount();
        if (mainGrid) renderListing();
      });
    }

    if (!api) {
      if (status) status.textContent = 'No se pudo conectar con el inventario. Intenta actualizar la página en unos momentos.';
      if (mainGrid) setMessage(mainGrid, 'El catálogo no está disponible temporalmente. Intenta de nuevo en unos momentos.', 'catalog-empty');
      if (featuredGrid) setMessage(featuredGrid, 'No pudimos consultar el inventario ahora. Vuelve a intentarlo en unos momentos.', 'catalog-empty');
      return;
    }

    initializeMap();
    setBudgetOptions();
    bindFilters();
    try {
      const result = await api.getProperties();
      properties = (Array.isArray(result?.data) ? result.data : [])
        .filter(property => property.status === 'disponible')
        .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
      createMarkers();
      if (mainGrid) renderListing();
      if (featuredGrid) renderFeatured();
      updateMap();
    } catch (error) {
      console.error('[Catálogo] No se pudo cargar el inventario:', error.message);
      if (status) status.textContent = 'No pudimos actualizar el inventario. Intenta de nuevo en unos momentos.';
      if (mainGrid) setMessage(mainGrid, 'No se pudo cargar el inventario. No mostraremos fichas desactualizadas; intenta actualizar la página.', 'catalog-empty');
      if (featuredGrid) setMessage(featuredGrid, 'No se pudo cargar el inventario. Intenta actualizar la página en unos momentos.', 'catalog-empty');
      if (count) count.textContent = '0';
    }
  });
})();
