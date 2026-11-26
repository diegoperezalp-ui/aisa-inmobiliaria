(() => {
  let menuSequence = 0;
  const openMenus = new Set();
  const updateMenuLabels = new WeakMap();

  const sanitizeFilename = value => String(value || 'aisa-propiedad')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'aisa-propiedad';

  const getImageUrl = source => {
    const imageUrl = new URL(source, window.location.href);
    if (!['https:', 'http:'].includes(imageUrl.protocol)) {
      throw new Error('La dirección de esta imagen no es válida.');
    }
    return imageUrl;
  };

  const extensionFor = (mimeType, sourceUrl) => {
    const knownTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'image/gif': 'gif'
    };
    if (knownTypes[mimeType]) return knownTypes[mimeType];

    const pathExtension = new URL(sourceUrl).pathname.match(/\.([a-z0-9]{3,4})$/i)?.[1]?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(pathExtension) ? pathExtension : 'jpg';
  };

  const loadImage = async source => {
    const imageUrl = getImageUrl(source);
    const response = await fetch(imageUrl.href, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache'
    });
    if (!response.ok) throw new Error('No se pudo obtener esta imagen. Intenta de nuevo más tarde.');

    const imageBlob = await response.blob();
    if (!imageBlob.type.startsWith('image/')) throw new Error('El archivo recibido no es una imagen.');
    return { imageUrl, imageBlob };
  };

  const triggerDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
  };

  window.aisaDownloadImage = async (source, filenameBase) => {
    const { imageUrl, imageBlob } = await loadImage(source);
    const filename = sanitizeFilename(filenameBase);
    const extension = extensionFor(imageBlob.type, imageUrl.href);
    const objectUrl = URL.createObjectURL(imageBlob);
    triggerDownload(objectUrl, `${filename}.${extension}`);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const convertToPng = async imageBlob => {
    if (imageBlob.type === 'image/png') return imageBlob;
    if (typeof window.createImageBitmap !== 'function') return imageBlob;

    const bitmap = await window.createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close?.();
      throw new Error('No se pudo preparar la imagen para copiarla.');
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la imagen para copiarla.')), 'image/png');
    });
  };

  window.aisaCopyImage = async source => {
    const { imageUrl, imageBlob } = await loadImage(source);
    const clipboard = navigator.clipboard;
    if (!clipboard) throw new Error('El navegador no permite copiar desde esta página.');

    if (typeof clipboard.write === 'function' && typeof window.ClipboardItem === 'function') {
      try {
        const png = await convertToPng(imageBlob);
        await clipboard.write([new window.ClipboardItem({ [png.type]: png })]);
        return 'image';
      } catch (error) {
        if (typeof clipboard.writeText !== 'function') throw error;
      }
    }

    if (typeof clipboard.writeText === 'function') {
      await clipboard.writeText(imageUrl.href);
      return 'link';
    }
    throw new Error('El navegador no permite copiar la imagen.');
  };

  window.aisaCopyImageLink = async source => {
    const imageUrl = getImageUrl(source);
    if (typeof navigator.clipboard?.writeText !== 'function') {
      throw new Error('El navegador no permite copiar el enlace desde esta página.');
    }
    await navigator.clipboard.writeText(imageUrl.href);
  };

  const showToast = (message, type = 'info') => window.gkApi?.showToast?.(message, type);

  const closeMenu = (container, returnFocus = false) => {
    const trigger = container.querySelector('.property-image-menu-trigger');
    const panel = container.querySelector('[role="menu"]');
    if (!trigger || !panel) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    openMenus.delete(container);
    if (returnFocus) trigger.focus();
  };

  const openMenu = (container, focusFirst = false, focusLast = false) => {
    const trigger = container.querySelector('.property-image-menu-trigger');
    const panel = container.querySelector('[role="menu"]');
    if (!trigger || !panel) return;
    for (const otherMenu of openMenus) closeMenu(otherMenu);
    updateMenuLabels.get(container)?.();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    openMenus.add(container);
    if (focusFirst || focusLast) {
      const items = panel.querySelectorAll('[role="menuitem"]');
      (focusLast ? items[items.length - 1] : items[0])?.focus();
    }
  };

  document.addEventListener('pointerdown', event => {
    for (const container of openMenus) {
      if (!container.isConnected || !container.contains(event.target)) closeMenu(container);
    }
  });

  document.addEventListener('keydown', event => {
    const activeMenu = [...openMenus].find(container => container.contains(event.target));
    if (event.key === 'Escape' && activeMenu) {
      event.preventDefault();
      closeMenu(activeMenu, true);
      return;
    }

    const trigger = event.target.closest?.('.property-image-menu-trigger');
    if (trigger && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      openMenu(trigger.closest('.property-image-menu'), event.key === 'ArrowDown', event.key === 'ArrowUp');
      return;
    }

    if (!activeMenu || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = [...activeMenu.querySelectorAll('[role="menuitem"]')];
    const currentIndex = items.indexOf(event.target);
    if (currentIndex < 0 || !items.length) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex].focus();
  });

  window.aisaCreateImageMenu = ({ getSource, getFilename, getLabel } = {}) => {
    const container = document.createElement('div');
    container.className = 'property-image-menu';

    const menuId = `aisa-image-menu-${++menuSequence}`;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'property-image-menu-trigger';
    trigger.setAttribute('aria-label', `Más opciones para ${getLabel?.() || 'la foto'}`);
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', menuId);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';

    const panel = document.createElement('div');
    panel.id = menuId;
    panel.className = 'property-image-menu-panel';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', `Acciones para ${getLabel?.() || 'la foto'}`);
    panel.hidden = true;
    const updateAccessibleLabel = () => {
      const label = getLabel?.() || 'la foto';
      trigger.setAttribute('aria-label', `Más opciones para ${label}`);
      panel.setAttribute('aria-label', `Acciones para ${label}`);
    };
    updateMenuLabels.set(container, updateAccessibleLabel);

    const actions = [
      ['download', 'Descargar foto', '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'],
      ['copy-image', 'Copiar foto', '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'],
      ['copy-link', 'Copiar enlace', '<path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/>'],
      ['open', 'Abrir en otra pestaña', '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>']
    ];

    for (const [action, label, iconPath] of actions) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'property-image-menu-item';
      item.dataset.imageAction = action;
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      item.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPath}</svg><span>${label}</span>`;
      panel.append(item);
    }

    trigger.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (panel.hidden) openMenu(container);
      else closeMenu(container);
    });

    panel.addEventListener('click', async event => {
      const item = event.target.closest('[data-image-action]');
      if (!item) return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu(container, true);
      item.disabled = true;
      try {
        const source = getSource?.();
        const label = getLabel?.() || 'foto';
        if (item.dataset.imageAction === 'download') {
          await window.aisaDownloadImage(source, getFilename?.() || label);
          showToast('La descarga de la foto comenzó.', 'success');
        } else if (item.dataset.imageAction === 'copy-image') {
          const result = await window.aisaCopyImage(source);
          showToast(result === 'image' ? 'Foto copiada. Ya puedes pegarla.' : 'Tu navegador copió el enlace de la foto.', 'success');
        } else if (item.dataset.imageAction === 'copy-link') {
          await window.aisaCopyImageLink(source);
          showToast('Enlace de la foto copiado.', 'success');
        } else if (item.dataset.imageAction === 'open') {
          const imageUrl = getImageUrl(source);
          window.open(imageUrl.href, '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        showToast(error.message || 'No se pudo completar esta acción.', 'error');
      } finally {
        item.disabled = false;
      }
    });

    container.append(trigger, panel);
    return container;
  };
})();
