/**
 * ========================================================
 * AISA INMOBILIARIA - LÓGICA Y FUNCIONALIDADES JS
 * "Tu proyecto nuestro compromiso"
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  if (window.location.hash === '#properties-grid-container') {
    const scrollToListings = () => {
      const listings = document.getElementById('properties-grid-container');
      if (!listings) return;

      const root = document.documentElement;
      const previousScrollBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      window.scrollTo(0, listings.getBoundingClientRect().top + window.scrollY - 96);
      root.style.scrollBehavior = previousScrollBehavior;
    };

    if (document.readyState === 'complete') {
      window.requestAnimationFrame(scrollToListings);
    } else {
      window.addEventListener('load', scrollToListings, { once: true });
    }
  }

  // ========================================================
  // 1. NAVEGACIÓN ACTIVA Y SOMBRA EN SCROLL
  // ========================================================
  const header = document.querySelector('.main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.style.boxShadow = '0 6px 22px rgba(22, 34, 8, 0.08)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }

  // Marcar enlace activo según la página actual (Desktop y Móvil)
  const currentPage = window.location.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/i, '') || 'index';
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-drawer a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkUrl = new URL(href, window.location.href);
    const linkPage = linkUrl.pathname.split('/').filter(Boolean).pop()?.replace(/\.html$/i, '') || 'index';
    if (!linkUrl.hash && linkPage === currentPage) {
      link.classList.add('active');
    }
  });

  // Control del Menú Móvil Hamburguesa
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileDrawer.classList.toggle('open');
      const isOpen = mobileDrawer.classList.contains('open');
      mobileToggle.innerHTML = isOpen ? '&times;' : '&#9776;';
    });

    // Cerrar menú al hacer clic en un enlace del drawer
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileToggle.innerHTML = '&#9776;';
      });
    });

    // Cerrar menú al hacer clic fuera del header
    document.addEventListener('click', (e) => {
      if (!mobileDrawer.contains(e.target) && e.target !== mobileToggle) {
        mobileDrawer.classList.remove('open');
        mobileToggle.innerHTML = '&#9776;';
      }
    });
  }

  // Búsqueda principal: conserva los filtros en la URL del catálogo.
  const homeSearchForm = document.getElementById('home-search');
  if (homeSearchForm) {
    const operationInput = homeSearchForm.querySelector('input[name="operation"]');
    const operationTabs = homeSearchForm.querySelectorAll('.home-search-tab');
    const searchCaption = homeSearchForm.querySelector('.home-search-caption');
    const submitLabel = homeSearchForm.querySelector('.home-search-submit span');
    const locationInput = homeSearchForm.querySelector('[name="location"]');
    const propertyType = homeSearchForm.querySelector('[name="type"]');
    const budgetInput = homeSearchForm.querySelector('[name="price"]');

    const setBudgetOptions = operation => {
      if (!budgetInput) return;
      const options = operation === 'renta'
        ? [['all', 'Cualquier precio'], ['0-12000', 'Hasta $12,000 / mes'], ['12000-20000', '$12,000 a $20,000 / mes'], ['20000-35000', '$20,000 a $35,000 / mes'], ['35000', '$35,000 o más']]
        : [['all', 'Cualquier precio'], ['0-3000000', 'Hasta $3,000,000'], ['3000000-5000000', '$3 a $5 millones'], ['5000000-10000000', '$5 a $10 millones'], ['10000000', '$10 millones o más']];
      budgetInput.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    };

    operationTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const operation = tab.dataset.operation || 'compra';
        const isSelling = operation === 'venta';
        operationTabs.forEach(option => {
          const isActive = option === tab;
          option.classList.toggle('is-active', isActive);
          option.setAttribute('aria-pressed', String(isActive));
        });
        if (operationInput) operationInput.value = operation;
        homeSearchForm.classList.toggle('is-selling', isSelling);
        if (searchCaption) searchCaption.textContent = isSelling ? 'Promociona tu propiedad con Aisa' : 'Encuentra tu próxima propiedad';
        if (submitLabel) submitLabel.textContent = isSelling ? 'Publicar mi propiedad' : 'Buscar propiedades';
        if (locationInput) locationInput.disabled = isSelling;
        if (propertyType) propertyType.disabled = isSelling;
        if (budgetInput) budgetInput.disabled = isSelling;
        setBudgetOptions(operation);
      });
    });

    homeSearchForm.addEventListener('submit', event => {
      event.preventDefault();
      const operation = operationInput ? operationInput.value : 'compra';
      const destination = operation === 'renta' ? 'renta.html' : operation === 'venta' ? 'venta.html' : 'compra.html';

      if (operation === 'venta') {
        window.location.href = destination;
        return;
      }

      const params = new URLSearchParams();
      const type = homeSearchForm.querySelector('[name="type"]');
      const location = homeSearchForm.querySelector('[name="location"]');
      const price = homeSearchForm.querySelector('[name="price"]');
      if (type && type.value !== 'all') params.set('type', type.value);
      if (location && location.value.trim()) params.set('location', location.value.trim());
      if (price && price.value !== 'all') params.set('price', price.value);

      const query = params.toString();
      window.location.href = query ? `${destination}?${query}` : destination;
    });
  }

  // Favoritos y mapa de propiedades de demostración de Monterrey.
  const featuredCards = Array.from(document.querySelectorAll('#propiedades .property-card'));
  const favoriteButtons = document.querySelectorAll('.property-favorite');
  const favoriteCount = document.getElementById('favorite-count');
  const favoriteFilter = document.getElementById('show-favorites');
  const resultCount = document.getElementById('map-result-count');
  const mapEmpty = document.getElementById('map-empty');
  const mapOperationFilter = document.getElementById('map-filter-operation');
  const mapTypeFilter = document.getElementById('map-filter-type');
  const mapNeighborhoodFilter = document.getElementById('map-filter-neighborhood');
  const mapBudgetFilter = document.getElementById('map-filter-budget');
  const mapElement = document.getElementById('property-map');
  const mapLoading = document.getElementById('map-loading');
  const mapSource = mapElement ? mapElement.dataset.mapSource : '';
  const mapCards = mapElement
    ? Array.from(document.querySelectorAll(mapSource || '#propiedades .property-card'))
    : [];
  const mapCatalogHref = mapElement ? mapElement.dataset.catalogHref || 'compra.html' : 'compra.html';
  const slugifyPropertyName = value => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const propertyOperation = card => card.dataset.operation
    || (card.querySelector('.badge-rent') || currentPage === 'renta.html' ? 'renta' : 'venta');
  const propertyWhatsAppUrl = (name, operation) => {
    const action = operation === 'renta' ? 'rentar' : 'comprar';
    const message = encodeURIComponent(`Hola, Aisa Inmobiliaria. Estoy interesado en ${action} ${name}. ¿Podrían compartirme más información y ayudarme a agendar una visita?`);
    return `https://wa.me/525512345678?text=${message}`;
  };
  const propertyDetailUrl = card => {
    const name = card.querySelector('.property-name')?.textContent.trim();
    const price = card.querySelector('.property-price')?.textContent.trim();
    const location = card.querySelector('.property-location')?.textContent.trim();
    const image = card.querySelector('.property-image');
    if (!name || !price || !location || !image) return null;

    const operation = propertyOperation(card);
    const propertyImages = [image.getAttribute('src')].filter(Boolean);
    const property = {
      id: slugifyPropertyName(name),
      name,
      operation,
      type: card.dataset.type || 'inmueble',
      price,
      location,
      features: Array.from(card.querySelectorAll('.property-features span')).map(feature => feature.textContent.trim()),
      images: propertyImages,
      latitude: card.dataset.lat || '',
      longitude: card.dataset.lng || ''
    };
    const params = new URLSearchParams({ id: property.id, data: JSON.stringify(property) });
    return `propiedad.html?${params}`;
  };

  document.querySelectorAll('#properties-grid-container .property-card, #propiedades .property-card').forEach(card => {
    const actions = card.querySelector('.property-actions');
    const href = propertyDetailUrl(card);
    const name = card.querySelector('.property-name')?.textContent.trim();
    if (!actions || !href || !name) return;

    if (!actions.querySelector('.property-detail-link')) {
      const detailLink = document.createElement('a');
      detailLink.href = href;
      detailLink.className = 'btn btn-outline-dark btn-sm btn-block property-detail-link';
      detailLink.textContent = 'Ver ficha completa';
      actions.prepend(detailLink);
    }

    let whatsappLink = Array.from(actions.querySelectorAll('a[href]')).find(link => link.href.includes('wa.me'));
    if (!whatsappLink) {
      whatsappLink = document.createElement('a');
      actions.append(whatsappLink);
    }
    whatsappLink.href = propertyWhatsAppUrl(name, propertyOperation(card));
    whatsappLink.classList.add('btn', 'btn-accent', 'btn-sm', 'btn-block', 'property-whatsapp-link');
    whatsappLink.target = '_blank';
    whatsappLink.rel = 'noreferrer';
    whatsappLink.textContent = 'WhatsApp';
    whatsappLink.setAttribute('aria-label', `Contactar por WhatsApp sobre ${name}`);
  });
  const storedFavorites = localStorage.getItem('aisa-favorite-properties');
  const favorites = new Set(storedFavorites ? JSON.parse(storedFavorites) : []);
  let favoritesOnly = false;
  let propertyMap = null;
  const propertyMarkers = [];

  const updateMapBudgetOptions = () => {
    if (!mapBudgetFilter || !mapOperationFilter) return;

    const operation = mapOperationFilter.value;
    const options = operation === 'venta'
      ? [['all', 'Cualquier presupuesto'], ['0-3000000', 'Hasta $3,000,000'], ['3000000-5000000', '$3,000,000 a $5,000,000'], ['5000000-10000000', '$5,000,000 a $10,000,000'], ['10000000', '$10,000,000 o más']]
      : operation === 'renta'
        ? [['all', 'Cualquier presupuesto'], ['0-15000', 'Hasta $15,000 / mes'], ['15000-25000', '$15,000 a $25,000 / mes'], ['25000-35000', '$25,000 a $35,000 / mes'], ['35000', '$35,000 o más']]
        : [['all', 'Elige venta o renta']];

    mapBudgetFilter.replaceChildren(...options.map(([value, label]) => new Option(label, value)));
    mapBudgetFilter.disabled = operation === 'all';
  };

  const matchesMapFilters = card => {
    const operation = mapOperationFilter ? mapOperationFilter.value : 'all';
    const type = mapTypeFilter ? mapTypeFilter.value : 'all';
    const neighborhood = mapNeighborhoodFilter ? mapNeighborhoodFilter.value : 'all';
    const budget = mapBudgetFilter ? mapBudgetFilter.value : 'all';
    const saveButton = card.querySelector('.property-favorite');
    const propertyId = saveButton ? saveButton.dataset.propertyId : card.dataset.propertyId;

    if (operation !== 'all' && card.dataset.operation !== operation) return false;
    if (type !== 'all' && card.dataset.type !== type) return false;
    if (neighborhood !== 'all' && card.dataset.neighborhood !== neighborhood) return false;
    if (favoritesOnly && (!propertyId || !favorites.has(propertyId))) return false;

    if (budget !== 'all') {
      const [minimum, maximum] = budget.split('-').map(Number);
      const price = Number(card.dataset.price);
      if (price < minimum || (maximum && price > maximum)) return false;
    }

    return true;
  };

  const updateMapMarkers = () => {
    if (!propertyMap) return;
    const visibleCards = mapCards.filter(matchesMapFilters);

    propertyMarkers.forEach(({ card, marker }) => {
      if (visibleCards.includes(card)) marker.addTo(propertyMap);
      else marker.remove();
    });

    if (resultCount) resultCount.textContent = String(visibleCards.length);
    if (mapEmpty) mapEmpty.hidden = visibleCards.length > 0;
  };

  const updateFeaturedProperties = () => {
    const visibleCards = featuredCards.filter(card => {
      const saveButton = card.querySelector('.property-favorite');
      const matchesFavorites = !favoritesOnly || (saveButton && favorites.has(saveButton.dataset.propertyId));
      card.hidden = !matchesFavorites;
      return matchesFavorites;
    });

    if (favoriteCount) favoriteCount.textContent = String(favorites.size);
    updateMapMarkers();
  };

  favoriteButtons.forEach(button => {
    const isSaved = favorites.has(button.dataset.propertyId);
    button.classList.toggle('is-saved', isSaved);
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', `${isSaved ? 'Quitar de favoritos' : 'Guardar'} ${button.getAttribute('aria-label').replace(/^(Guardar|Quitar de favoritos) /, '')}`);

    button.addEventListener('click', async () => {
      const propertyId = button.dataset.propertyId;

      if (window.gkApi) {
        try {
          const res = await window.gkApi.toggleFavorite(propertyId);
          if (res.isSaved) favorites.add(propertyId);
          else favorites.delete(propertyId);

          const saved = res.isSaved;
          button.classList.toggle('is-saved', saved);
          button.setAttribute('aria-pressed', String(saved));
          button.setAttribute('aria-label', `${saved ? 'Quitar de favoritos' : 'Guardar'} ${button.getAttribute('aria-label').replace(/^(Guardar|Quitar de favoritos) /, '')}`);
          updateFeaturedProperties();
          window.gkApi.showToast(res.message || (saved ? 'Propiedad agregada a favoritos' : 'Propiedad eliminada de favoritos'), 'success');
          return;
        } catch (err) {
          console.warn('Fallback a almacenamiento local para favoritos:', err);
        }
      }

      if (favorites.has(propertyId)) favorites.delete(propertyId);
      else favorites.add(propertyId);
      localStorage.setItem('aisa-favorite-properties', JSON.stringify([...favorites]));

      const saved = favorites.has(propertyId);
      button.classList.toggle('is-saved', saved);
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', `${saved ? 'Quitar de favoritos' : 'Guardar'} ${button.getAttribute('aria-label').replace(/^(Guardar|Quitar de favoritos) /, '')}`);
      updateFeaturedProperties();
    });
  });

  if (favoriteFilter) {
    favoriteFilter.addEventListener('click', () => {
      favoritesOnly = !favoritesOnly;
      favoriteFilter.classList.toggle('is-active', favoritesOnly);
      favoriteFilter.setAttribute('aria-pressed', String(favoritesOnly));
      updateFeaturedProperties();
    });
  }

  updateMapBudgetOptions();
  [mapOperationFilter, mapTypeFilter, mapNeighborhoodFilter, mapBudgetFilter].forEach(filter => {
    if (!filter) return;
    filter.addEventListener('change', () => {
      if (filter === mapOperationFilter) updateMapBudgetOptions();
      updateMapMarkers();
    });
  });

  const updateFilterFieldStates = () => {
    document.querySelectorAll('.filter-select').forEach(select => {
      const field = select.closest('.filter-group, .map-filter-field');
      if (!field) return;
      const defaultValue = select.id === 'sort-order' ? 'recommended' : 'all';
      field.classList.toggle('is-selected', select.value !== defaultValue && !select.disabled);
    });
  };

  document.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('change', updateFilterFieldStates);
  });
  updateFilterFieldStates();

  if (mapElement) {
    if (window.L) {
      propertyMap = window.L.map(mapElement, { scrollWheelZoom: false }).setView([25.6866, -100.3161], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(propertyMap);

      mapCards.forEach(card => {
        const latitude = Number(card.dataset.lat);
        const longitude = Number(card.dataset.lng);
        const name = card.querySelector('.property-name')?.textContent.trim();
        const price = card.querySelector('.property-price')?.textContent.trim();
        const location = card.querySelector('.property-location')?.textContent.trim();
        const image = card.querySelector('.property-image');
        const imageUrl = image?.getAttribute('src') || 'assets/hero-casa.jpg';
        const features = Array.from(card.querySelectorAll('.property-features span'))
          .map(feature => feature.textContent.trim());

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !name || !price || !location || !imageUrl) {
          console.error('No se pudo mostrar una propiedad en el mapa:', card);
          return;
        }

        const markerIcon = window.L.divIcon({
          className: 'property-house-marker-wrap',
          html: `<span class="property-house-marker${card.dataset.operation === 'renta' ? ' property-house-marker-rent' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"/><path d="M2 10 12 2l10 8"/></svg></span>`,
          iconSize: [46, 54],
          iconAnchor: [23, 47],
          popupAnchor: [0, -43]
        });
        const popup = document.createElement('div');
        popup.className = 'property-map-popup';
        const popupImage = document.createElement('img');
        popupImage.className = 'property-map-popup-image';
        popupImage.src = imageUrl;
        popupImage.alt = image.alt || name;
        popupImage.loading = 'lazy';
        const popupInfo = document.createElement('div');
        popupInfo.className = 'property-map-popup-info';
        const popupEyebrow = document.createElement('span');
        popupEyebrow.className = 'property-map-popup-eyebrow';
        popupEyebrow.textContent = 'PROPIEDAD DE DEMOSTRACIÓN';
        const popupName = document.createElement('strong');
        popupName.textContent = name;
        const popupPrice = document.createElement('span');
        popupPrice.className = 'property-map-popup-price';
        popupPrice.textContent = price;
        const popupLocation = document.createElement('span');
        popupLocation.className = 'property-map-popup-location';
        popupLocation.textContent = location;
        const popupFeatures = document.createElement('div');
        popupFeatures.className = 'property-map-popup-features';
        features.forEach(feature => {
          const item = document.createElement('span');
          item.textContent = feature;
          popupFeatures.append(item);
        });
        const popupLink = document.createElement('a');
        const operation = card.dataset.operation || 'venta';
        popupLink.href = propertyDetailUrl(card) || (operation === 'renta' ? 'renta.html' : mapCatalogHref);
        popupLink.className = 'property-map-popup-link';
        popupLink.textContent = 'Ver ficha completa';
        const popupWhatsApp = document.createElement('a');
        popupWhatsApp.href = propertyWhatsAppUrl(name, operation);
        popupWhatsApp.className = 'property-map-popup-whatsapp';
        popupWhatsApp.textContent = 'WhatsApp';
        popupWhatsApp.target = '_blank';
        popupWhatsApp.rel = 'noreferrer';
        popupWhatsApp.setAttribute('aria-label', `Contactar por WhatsApp sobre ${name}`);
        popupInfo.append(popupEyebrow, popupName, popupPrice, popupLocation, popupFeatures, popupLink, popupWhatsApp);
        popup.append(popupImage, popupInfo);

        const marker = window.L.marker([latitude, longitude], {
          icon: markerIcon,
          title: `Ver información de ${name}`,
          alt: `Ubicación aproximada de ${name}`
        }).bindPopup(popup, { className: 'property-map-leaflet-popup', maxWidth: 310, minWidth: 260 });
        propertyMarkers.push({ card, marker });
      });
      if (propertyMarkers.length > 1) {
        const bounds = window.L.latLngBounds(propertyMarkers.map(({ marker }) => marker.getLatLng()));
        propertyMap.fitBounds(bounds, { padding: [42, 42], maxZoom: 12 });
      }
      if (mapLoading) mapLoading.hidden = true;
    } else if (mapLoading) {
      mapLoading.textContent = 'No se pudo cargar el mapa. Puedes consultar la zona en OpenStreetMap.';
      const mapLink = document.createElement('a');
      mapLink.href = 'https://www.openstreetmap.org/#map=11/25.6866/-100.3161';
      mapLink.target = '_blank';
      mapLink.rel = 'noreferrer';
      mapLink.textContent = 'Abrir mapa de Monterrey';
      mapLoading.append(' ', mapLink);
    }
  }

  updateFeaturedProperties();
  if (mapSource) updateMapMarkers();

  // ========================================================
  // 2. FILTRO DE PROPIEDADES EN TIEMPO REAL (COMPRA Y RENTA)
  // ========================================================
  const filterBtn = document.getElementById('btn-filter');
  const searchParams = new URLSearchParams(window.location.search);
  const requestedType = searchParams.get('type');
  let requestedLocation = searchParams.get('location') || '';
  const requestedPrice = searchParams.get('price');
  const sortSelect = document.getElementById('sort-order');

  const normalizeText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (filterBtn) {
    const typeSelect = document.getElementById('filter-type');
    const citySelect = document.getElementById('filter-city');
    const priceSelect = document.getElementById('filter-price');
    if (typeSelect && requestedType && Array.from(typeSelect.options).some(option => option.value === requestedType)) {
      typeSelect.value = requestedType;
    }
    if (priceSelect && requestedPrice && Array.from(priceSelect.options).some(option => option.value === requestedPrice)) {
      priceSelect.value = requestedPrice;
    }
    if (citySelect && requestedLocation) {
      const location = normalizeText(requestedLocation);
      const matchingOption = Array.from(citySelect.options).find(option =>
        normalizeText(option.value).replace(/-/g, ' ').includes(location) ||
        normalizeText(option.textContent).includes(location)
      );
      if (matchingOption) citySelect.value = matchingOption.value;
      citySelect.addEventListener('change', () => {
        requestedLocation = '';
      });
    }

    filterBtn.addEventListener('click', filterProperties);
    if (requestedType || requestedLocation || requestedPrice) filterProperties();
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', sortProperties);
    sortProperties();
  }

  function sortProperties() {
    const grid = document.querySelector('.properties-grid');
    if (!grid || !sortSelect) return;

    const cards = Array.from(grid.querySelectorAll('.property-card'));
    if (sortSelect.value === 'price-low') {
      cards.sort((first, second) => Number(first.dataset.price) - Number(second.dataset.price));
    } else if (sortSelect.value === 'price-high') {
      cards.sort((first, second) => Number(second.dataset.price) - Number(first.dataset.price));
    }
    grid.append(...cards);
  }

  function filterProperties() {
    const typeSelect = document.getElementById('filter-type');
    const citySelect = document.getElementById('filter-city');
    const priceSelect = document.getElementById('filter-price');

    const selectedType = typeSelect ? typeSelect.value.toLowerCase() : 'all';
    const selectedCity = citySelect ? citySelect.value.toLowerCase() : 'all';
    const selectedPrice = priceSelect ? priceSelect.value : 'all';
    const normalizedLocation = normalizeText(requestedLocation);

    const cards = document.querySelectorAll('.property-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const cardType = (card.getAttribute('data-type') || '').toLowerCase();
      const cardCity = (card.getAttribute('data-city') || '').toLowerCase();
      const cardPrice = parseFloat(card.getAttribute('data-price') || '0');
      const cardSearchText = normalizeText(`${cardCity} ${card.textContent}`);

      let matchesType = (selectedType === 'all' || cardType === selectedType);
      let matchesCity = selectedCity === 'all' ||
        cardCity.includes(selectedCity) ||
        cardSearchText.includes(normalizeText(selectedCity.replace(/-/g, ' ')));
      if (normalizedLocation) matchesCity = matchesCity && cardSearchText.includes(normalizedLocation);
      let matchesPrice = true;

      if (selectedPrice !== 'all') {
        const [min, max] = selectedPrice.split('-').map(Number);
        if (max) {
          matchesPrice = (cardPrice >= min && cardPrice <= max);
        } else {
          matchesPrice = (cardPrice >= min);
        }
      }

      if (matchesType && matchesCity && matchesPrice) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const noResults = document.getElementById('no-results-msg');
    if (noResults) {
      noResults.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
    updateMapMarkers();
  }


  // ========================================================
  // 3. CALCULADORA HIPOTECARIA INTERACTIVA (COMPRA.HTML)
  // ========================================================
  const propertyValueInput = document.getElementById('calc-price');
  const downPaymentPercentInput = document.getElementById('calc-down-percent');
  const loanTermInput = document.getElementById('calc-term');
  const interestRateInput = document.getElementById('calc-rate');

  if (propertyValueInput && downPaymentPercentInput) {
    const updateMortgage = () => {
      const price = parseFloat(propertyValueInput.value) || 0;
      const downPercent = parseFloat(downPaymentPercentInput.value) || 10;
      const years = parseInt(loanTermInput ? loanTermInput.value : 20);
      const annualRate = parseFloat(interestRateInput ? interestRateInput.value : 10.5) / 100;

      // Actualizar etiquetas de rangos
      const priceLabel = document.getElementById('calc-price-val');
      const downLabel = document.getElementById('calc-down-val');
      if (priceLabel) priceLabel.textContent = formatCurrency(price);
      if (downLabel) downLabel.textContent = `${downPercent}% (${formatCurrency(price * (downPercent / 100))})`;

      // Cálculos
      const downPaymentAmount = price * (downPercent / 100);
      const loanAmount = price - downPaymentAmount;
      const monthlyRate = annualRate / 12;
      const totalMonths = years * 12;

      let monthlyPayment = 0;
      if (loanAmount > 0 && monthlyRate > 0) {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
      }

      const totalPaid = (monthlyPayment * totalMonths) + downPaymentAmount;

      // Renderizar resultados
      const displayMonthly = document.getElementById('calc-result-monthly');
      const displayLoan = document.getElementById('calc-result-loan');
      const displayDown = document.getElementById('calc-result-down');
      const displayTotal = document.getElementById('calc-result-total');

      if (displayMonthly) displayMonthly.textContent = formatCurrency(Math.round(monthlyPayment));
      if (displayLoan) displayLoan.textContent = formatCurrency(Math.round(loanAmount));
      if (displayDown) displayDown.textContent = formatCurrency(Math.round(downPaymentAmount));
      if (displayTotal) displayTotal.textContent = formatCurrency(Math.round(totalPaid));
    };

    propertyValueInput.addEventListener('input', updateMortgage);
    downPaymentPercentInput.addEventListener('input', updateMortgage);
    if (loanTermInput) loanTermInput.addEventListener('change', updateMortgage);
    if (interestRateInput) interestRateInput.addEventListener('input', updateMortgage);

    // Inicializar
    updateMortgage();
  }


  // ========================================================
  // 4. ESTIMADOR DE VALOR COMERCIAL DE PROPIEDAD (VENTA.HTML)
  // ========================================================
  const valType = document.getElementById('val-type');
  const valM2 = document.getElementById('val-m2');
  const valZone = document.getElementById('val-zone');
  const valCondition = document.getElementById('val-condition');
  const btnEstimate = document.getElementById('btn-estimate');

  if (btnEstimate && valM2) {
    btnEstimate.addEventListener('click', () => {
      const m2 = parseFloat(valM2.value) || 120;
      const type = valType ? valType.value : 'casa';
      const zoneMultiplier = parseFloat(valZone ? valZone.value : 1.0);
      const conditionMultiplier = parseFloat(valCondition ? valCondition.value : 1.0);

      // Precios base estimados por m2
      let baseM2Price = 22000; // Casa estándar
      if (type === 'departamento') baseM2Price = 28000;
      if (type === 'terreno') baseM2Price = 11000;
      if (type === 'comercial') baseM2Price = 32000;

      const estimatedCenter = m2 * baseM2Price * zoneMultiplier * conditionMultiplier;
      const minEst = Math.round((estimatedCenter * 0.92) / 10000) * 10000;
      const maxEst = Math.round((estimatedCenter * 1.08) / 10000) * 10000;

      const displayRange = document.getElementById('val-result-range');
      const displayM2 = document.getElementById('val-result-m2');
      if (displayRange) displayRange.textContent = `${formatCurrency(minEst)} - ${formatCurrency(maxEst)}`;
      if (displayM2) displayM2.textContent = `${formatCurrency(Math.round(estimatedCenter / m2))} / m² aprox.`;

      // Efecto visual
      const resultCard = document.querySelector('.valuation-estimate-card');
      if (resultCard) {
        resultCard.style.transform = 'scale(1.02)';
        setTimeout(() => resultCard.style.transform = 'scale(1)', 250);
      }
    });
  }


  // ========================================================
  // 5. EVALUADOR DE INGRESOS PARA RENTA (RENTA.HTML)
  // ========================================================
  const rentPriceInput = document.getElementById('rent-check-price');
  const tenantIncomeInput = document.getElementById('rent-check-income');
  const btnCheckRent = document.getElementById('btn-check-rent');

  if (btnCheckRent && rentPriceInput && tenantIncomeInput) {
    btnCheckRent.addEventListener('click', () => {
      const rent = parseFloat(rentPriceInput.value) || 0;
      const income = parseFloat(tenantIncomeInput.value) || 0;
      const resultBox = document.getElementById('rent-check-result');

      if (!resultBox) return;

      const requiredIncome = rent * 3;
      resultBox.style.display = 'block';

      if (income >= requiredIncome) {
        resultBox.className = 'rent-status-box rent-ok';
        resultBox.innerHTML = `
          <strong>¡Excelente perfil financiero!</strong><br>
          Tus ingresos de ${formatCurrency(income)} cubren holgadamente el criterio estándar (se requiere mínimo ${formatCurrency(requiredIncome)}, 3 veces la renta). Calificas con trámite ágil.
        `;
      } else {
        resultBox.className = 'rent-status-box rent-warn';
        resultBox.innerHTML = `
          <strong>Opción con Co-obligado o Aval</strong><br>
          Para una renta de ${formatCurrency(rent)} el ingreso recomendado es de ${formatCurrency(requiredIncome)}. Si tus ingresos personales son menores, en Aisa Inmobiliaria puedes sumar ingresos con un co-arrendatario o presentar un aval con bien raíz.
        `;
      }
    });
  }


  // ========================================================
  // 6. MODAL PARA AGENDAR VISITA A PROPIEDAD
  // ========================================================
  const modalOverlay = document.getElementById('modal-visit');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalPropertyName = document.getElementById('modal-property-name');
  const visitForm = document.getElementById('form-schedule-visit');

  // Botones para abrir el modal desde las tarjetas
  const visitBtns = document.querySelectorAll('.btn-open-visit');
  visitBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const propTitle = btn.getAttribute('data-property') || 'Propiedad de Aisa Inmobiliaria';
      if (modalPropertyName) modalPropertyName.textContent = propTitle;
      if (modalOverlay) modalOverlay.classList.add('open');
    });
  });

  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', () => modalOverlay.classList.remove('open'));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('open');
    });
  }

  // Enviar cita y registrar en la Base de Datos MongoDB
  if (visitForm) {
    visitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('visit-name')?.value || 'Interesado';
      const phone = document.getElementById('visit-phone')?.value || '';
      const date = document.getElementById('visit-date')?.value || 'Próximamente';
      const time = document.getElementById('visit-time')?.value || 'Por definir';
      const prop = modalPropertyName ? modalPropertyName.textContent : 'Propiedad';

      // 1. Guardar visita en MongoDB
      if (window.gkApi) {
        try {
          await window.gkApi.scheduleVisit({
            propertyTitle: prop,
            clientName: name,
            clientPhone: phone,
            date,
            time
          });
          window.gkApi.showToast('¡Cita agendada correctamente! Abriendo WhatsApp para tu asesor...', 'success');
        } catch (err) {
          console.warn('Error al registrar visita en API:', err);
        }
      }

      // 2. Redirección a WhatsApp para confirmación inmediata
      const message = `Hola Aisa Inmobiliaria! Quisiera agendar una visita.%0A%0A*Propiedad:* ${prop}%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Fecha deseada:* ${date}%0A*Horario preferido:* ${time}%0A%0AQuedo atento a su confirmación.`;
      const whatsappUrl = `https://wa.me/525512345678?text=${message}`;
      window.open(whatsappUrl, '_blank');
      if (modalOverlay) modalOverlay.classList.remove('open');
      visitForm.reset();
    });
  }


  // ========================================================
  // 7. FORMULARIO DE CONSIGNACIÓN / VENTA CON MONGODB
  // ========================================================
  const formListing = document.getElementById('form-seller-listing');
  if (formListing) {
    formListing.addEventListener('submit', async (e) => {
      e.preventDefault();
      const owner = document.getElementById('seller-name')?.value || '';
      const phone = document.getElementById('seller-phone')?.value || '';
      const type = document.getElementById('seller-type')?.value || '';
      const zone = document.getElementById('seller-zone')?.value || '';
      const expectedPrice = document.getElementById('seller-price')?.value || '';

      // 1. Guardar solicitud en MongoDB
      if (window.gkApi) {
        try {
          await window.gkApi.consignProperty({
            ownerName: owner,
            phone,
            propertyType: type,
            zone,
            expectedPrice
          });
          window.gkApi.showToast('¡Solicitud recibida! Abriendo WhatsApp para tu asesor...', 'success');
        } catch (err) {
          console.warn('Error al guardar consignación en API:', err);
        }
      }

      // 2. Notificar por WhatsApp
      const msg = `Hola Aisa Inmobiliaria, deseo consignar mi propiedad para venta:%0A%0A*Propietario:* ${owner}%0A*Teléfono:* ${phone}%0A*Tipo de inmueble:* ${type}%0A*Ubicación:* ${zone}%0A*Precio pretendido:* ${expectedPrice}%0A%0ASolicito una asesoría y valuación sin costo.`;
      const whatsappUrl = `https://wa.me/525512345678?text=${msg}`;
      window.open(whatsappUrl, '_blank');
      formListing.reset();
    });
  }


  // ========================================================
  // 8. PREGUNTAS FRECUENTES (FAQ ACORDEÓN)
  // ========================================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Cerrar otros
        faqItems.forEach(other => other.classList.remove('active'));
        // Alternar el actual
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });


  // ========================================================
  // 9. FUNCIÓN AUXILIAR DE MONEDA MEXICANA (MXN)
  // ========================================================
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(amount);
  }

});
