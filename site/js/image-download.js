(() => {
  const sanitizeFilename = value => String(value || 'aisa-propiedad')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'aisa-propiedad';

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
    const imageUrl = new URL(source, window.location.href);
    if (!['https:', 'http:'].includes(imageUrl.protocol)) {
      throw new Error('La dirección de esta imagen no es válida.');
    }

    const filename = sanitizeFilename(filenameBase);
    const response = await fetch(imageUrl.href, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache'
    });
    if (!response.ok) throw new Error('No se pudo descargar esta imagen. Intenta de nuevo más tarde.');

    const imageBlob = await response.blob();
    if (!imageBlob.type.startsWith('image/')) throw new Error('El archivo recibido no es una imagen descargable.');

    const extension = extensionFor(imageBlob.type, imageUrl.href);
    const objectUrl = URL.createObjectURL(imageBlob);
    triggerDownload(objectUrl, `${filename}.${extension}`);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };
})();
