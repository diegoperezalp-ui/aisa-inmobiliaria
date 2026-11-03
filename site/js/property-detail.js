document.addEventListener('DOMContentLoaded', () => {
  const detail = document.getElementById('property-detail');
  const errorPanel = document.getElementById('property-detail-error');
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id') || '';
  let property = null;

  const slugify = value => value
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
    window.L.marker([latitude, longitude], { title: `Zona aproximada de ${property.name}` })
      .addTo(map)
      .bindPopup('Ubicación aproximada de demostración');
    window.L.control.scale({ imperial: false }).addTo(map);
  };

  const renderGallery = () => {
    const mainImage = document.getElementById('property-main-image');
    const thumbnails = document.getElementById('property-gallery-thumbnails');
    const images = [...new Set((property.images || []).filter(Boolean))].slice(0, 1);
    if (!images.length) {
      showError('La ficha no contiene fotografías de referencia.');
      return;
    }

    thumbnails.hidden = images.length < 2;
    mainImage.src = images[0];
    mainImage.alt = `Fotografía ilustrativa de ${property.name}`;
    mainImage.onerror = () => {
      mainImage.onerror = null;
      mainImage.src = 'assets/hero-casa.jpg';
    };

    images.forEach((source, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `property-gallery-thumbnail${index === 0 ? ' is-active' : ''}`;
      button.setAttribute('aria-label', `Mostrar foto ilustrativa ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === 0));
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = () => { button.hidden = true; };
      button.append(image);
      button.addEventListener('click', () => {
        mainImage.src = source;
        mainImage.alt = `Fotografía ilustrativa ${index + 1} de ${property.name}`;
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
    if (!detail || !errorPanel || !property || slugify(property.name) !== requestedId) {
      showError('No se encontró una propiedad que coincida con el identificador solicitado.');
      return;
    }

    const typeLabels = {
      casa: 'Casa',
      departamento: 'Departamento',
      loft: 'Loft / estudio',
      terreno: 'Terreno'
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
    document.getElementById('property-operation').textContent = `${sale ? 'En venta' : 'En renta'} · ${typeLabels[property.type] || 'Inmueble'} de demostración`;

    const stats = document.getElementById('property-stats');
    addStat(stats, 'Superficie', featureValue(features, /m²/i, 'No especificada'), '⌂');
    addStat(stats, 'Recámaras', featureValue(features, /rec\./i, isLand ? 'No aplica' : property.type === 'loft' ? 'Estudio' : 'No especificado'), '▦');
    addStat(stats, 'Baños', featureValue(features, /baño/i, isLand ? 'No aplica' : 'No especificado'), '◌');
    addStat(stats, 'Estacionamiento', featureValue(features, /auto|cajón/i, 'No especificado'), '▣');

    document.getElementById('property-description').textContent = isLand
      ? `Terreno de demostración en ${property.location}. La superficie, uso de suelo, servicios y condiciones deben confirmarse con el responsable de un anuncio real.`
      : `Propiedad de demostración en ${property.location}. Las medidas, distribución y características se presentan como referencia y deben verificarse antes de tomar cualquier decisión.`;
    const featureList = document.getElementById('property-feature-list');
    features.forEach(feature => {
      const chip = document.createElement('span');
      chip.textContent = feature;
      featureList.append(chip);
    });

    const operation = property.operation === 'renta' ? 'rentar' : 'comprar';
    const message = encodeURIComponent(`Hola, Aisa Inmobiliaria. Estoy interesado en ${operation} ${property.name} (${property.price}). ¿Podrían compartirme más información y ayudarme a agendar una visita?`);
    document.getElementById('property-whatsapp').href = `https://wa.me/525512345678?text=${message}`;
    document.getElementById('property-whatsapp').setAttribute('aria-label', `Contactar por WhatsApp a Aisa Inmobiliaria sobre ${property.name}`);
    const favoriteButton = document.getElementById('property-favorite');
    const favoriteLabel = document.getElementById('property-favorite-label');
    const propertyId = property.favoriteId || slugify(property.name);
    if (!window.AisaFavorites) {
      console.error('No se pudo inicializar el guardado de favoritos.');
      favoriteButton.disabled = true;
    } else {
      const updateFavoriteButton = saved => {
        favoriteButton.classList.toggle('is-saved', saved);
        favoriteButton.setAttribute('aria-pressed', String(saved));
        favoriteButton.setAttribute('aria-label', `${saved ? 'Quitar' : 'Guardar'} ${property.name} ${saved ? 'de' : 'en'} favoritos`);
        favoriteLabel.textContent = saved ? 'Guardada en favoritos' : 'Guardar en favoritos';
      };
      updateFavoriteButton(window.AisaFavorites.has(propertyId));
      favoriteButton.addEventListener('click', () => {
        updateFavoriteButton(window.AisaFavorites.toggle(propertyId));
      });
    }
    renderGallery();
    renderMap();
    detail.hidden = false;
  };

  const encodedProperty = params.get('data');
  if (encodedProperty) {
    try {
      property = JSON.parse(encodedProperty);
      render();
    } catch (error) {
      showError(`No se pudo leer la ficha de la propiedad: ${error.message}`);
    }
    return;
  }

  Promise.all(['index.html', 'compra.html', 'renta.html'].map(async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`No se pudo cargar ${path} (${response.status}).`);
    return { path, markup: await response.text() };
  }))
    .then(pages => {
      const entries = pages.flatMap(({ path, markup }) => {
        const source = new DOMParser().parseFromString(markup, 'text/html');
        return Array.from(source.querySelectorAll('#map-property-data .property-card, #propiedades .property-card, #properties-grid-container .property-card'))
          .map(card => ({ card, path }));
      });
      const matchingEntries = entries.filter(({ card }) => slugify(card.querySelector('.property-name')?.textContent.trim() || '') === requestedId);
      matchingEntries.sort((first, second) =>
        second.card.querySelectorAll('.property-features span').length - first.card.querySelectorAll('.property-features span').length
      );
      const entry = matchingEntries[0];
      if (!entry) throw new Error('No se encontró una propiedad que coincida con el identificador solicitado.');

      const { card, path } = entry;
      const image = card.querySelector('.property-image');
      property = {
        id: requestedId,
        name: card.querySelector('.property-name').textContent.trim(),
        operation: card.dataset.operation || (path === 'renta.html' ? 'renta' : 'venta'),
        type: card.dataset.type || 'inmueble',
        price: card.querySelector('.property-price').textContent.trim(),
        location: card.querySelector('.property-location').textContent.trim(),
        features: Array.from(card.querySelectorAll('.property-features span')).map(feature => feature.textContent.trim()),
        images: [image?.getAttribute('src')].filter(Boolean),
        favoriteId: card.querySelector('.property-favorite')?.dataset.propertyId || requestedId,
        latitude: card.dataset.lat || '',
        longitude: card.dataset.lng || ''
      };
      render();
    })
    .catch(error => showError(`No se pudo cargar la ficha: ${error.message}`));
});
