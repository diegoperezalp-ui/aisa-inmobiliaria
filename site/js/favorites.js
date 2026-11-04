document.addEventListener('DOMContentLoaded', loadFavorites);

async function loadFavorites() {
  const message = document.getElementById('favorites-message');
  const count = document.getElementById('favorites-count');
  const grid = document.getElementById('favorites-grid');

  if (!window.gkApi?.isAuthenticated()) {
    showFavoritesMessage(message, 'Inicia sesión para consultar tus propiedades guardadas.', 'Iniciar sesión', '/login');
    return;
  }

  try {
    const result = await window.gkApi.getMyFavorites();
    const properties = Array.isArray(result.properties) ? result.properties : [];
    const favoriteIds = Array.isArray(result.favorites) ? result.favorites.map(String) : [];

    grid.replaceChildren();
    if (!properties.length) {
      count.hidden = true;
      showFavoritesMessage(message, 'Todavía no tienes propiedades favoritas.', 'Explorar propiedades', '/compra');
      return;
    }

    message.hidden = true;
    count.hidden = false;
    count.textContent = `${properties.length} ${properties.length === 1 ? 'propiedad guardada' : 'propiedades guardadas'}`;
    properties.forEach(property => grid.append(createFavoriteCard(property, favoriteIds)));
  } catch (error) {
    count.hidden = true;
    showFavoritesMessage(message, error.message || 'No se pudieron cargar tus favoritos.', 'Reintentar', '#');
    message.querySelector('a')?.addEventListener('click', event => {
      event.preventDefault();
      message.hidden = false;
      message.textContent = 'Cargando tus favoritos...';
      loadFavorites();
    });
  }
}

function showFavoritesMessage(container, text, actionLabel, href) {
  container.hidden = false;
  container.replaceChildren();

  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  container.append(paragraph);

  if (actionLabel) {
    const action = document.createElement('a');
    action.className = 'btn btn-primary';
    action.href = href;
    action.textContent = actionLabel;
    container.append(action);
  }
}

function createFavoriteCard(property, favoriteIds) {
  const identifiers = [property.propertyId, property.slug, property._id].filter(Boolean).map(String);
  const favoriteId = identifiers.find(identifier => favoriteIds.includes(identifier)) || identifiers[0];
  const title = property.title || 'Propiedad';
  const operation = property.operation === 'renta' ? 'renta' : 'venta';
  const card = document.createElement('article');
  card.className = 'property-card favorite-property-card';

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'property-image-wrapper';
  const image = document.createElement('img');
  image.className = 'property-image';
  image.src = property.images?.[0] || 'assets/hero-casa.jpg';
  image.alt = title;
  image.loading = 'lazy';
  image.onerror = () => { image.src = 'assets/hero-casa.jpg'; };

  const badge = document.createElement('span');
  badge.className = `badge ${operation === 'renta' ? 'badge-rent' : 'badge-sale'}`;
  badge.textContent = operation === 'renta' ? 'Renta' : 'Venta';
  const badgeOverlay = document.createElement('div');
  badgeOverlay.className = 'property-badge-overlay';
  badgeOverlay.append(badge);
  imageWrapper.append(image, badgeOverlay);

  const info = document.createElement('div');
  info.className = 'property-info';
  const price = document.createElement('p');
  price.className = 'property-price';
  price.textContent = property.priceFormatted || `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(property.price || 0)}${operation === 'renta' ? ' / mes' : ''}`;
  const name = document.createElement('h2');
  name.className = 'property-name';
  name.textContent = title;
  const location = document.createElement('p');
  location.className = 'property-location';
  location.textContent = property.location || [property.neighborhood, property.city].filter(Boolean).join(', ');

  const features = document.createElement('div');
  features.className = 'property-features';
  (Array.isArray(property.features) ? property.features : []).forEach(feature => {
    const item = document.createElement('span');
    item.textContent = feature;
    features.append(item);
  });

  const actions = document.createElement('div');
  actions.className = 'property-actions';
  const details = document.createElement('a');
  details.className = 'btn btn-outline-dark btn-sm btn-block';
  details.href = `propiedad?id=${encodeURIComponent(property.slug || property.propertyId || property._id)}`;
  details.textContent = 'Ver propiedad';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-outline-dark btn-sm btn-block favorite-remove-button';
  remove.textContent = 'Quitar de favoritos';
  remove.setAttribute('aria-label', `Quitar ${title} de favoritos`);
  remove.addEventListener('click', async () => {
    remove.disabled = true;
    try {
      await window.gkApi.toggleFavorite(favoriteId);
      card.remove();
      const remaining = document.querySelectorAll('.favorite-property-card').length;
      const count = document.getElementById('favorites-count');
      count.textContent = `${remaining} ${remaining === 1 ? 'propiedad guardada' : 'propiedades guardadas'}`;
      if (!remaining) {
        count.hidden = true;
        showFavoritesMessage(document.getElementById('favorites-message'), 'Todavía no tienes propiedades favoritas.', 'Explorar propiedades', '/compra');
      }
      window.gkApi.showToast('Propiedad eliminada de tus favoritos.', 'success');
    } catch (error) {
      remove.disabled = false;
      window.gkApi.showToast(error.message || 'No se pudo quitar la propiedad.', 'error');
    }
  });

  actions.append(details, remove);
  info.append(price, name, location, features, actions);
  card.append(imageWrapper, info);
  return card;
}