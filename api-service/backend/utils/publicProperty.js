export const toPublicProperty = property => {
  const record = typeof property?.toObject === 'function' ? property.toObject() : { ...property };
  const publicLocation = [record.neighborhood, record.city].filter(Boolean).join(', ');
  record.location = publicLocation || 'Monterrey y área metropolitana';
  if (record.consignmentPhotos?.length && record._id) {
    const apiBase = (process.env.AISA_API_URL || 'https://aisa-inmobiliaria-api.onrender.com').replace(/\/+$/, '');
    record.images = record.consignmentPhotos.map(fileId => `${apiBase}/api/properties/${record._id}/photos/${fileId}`);
  }

  if (record.coordinates) {
    const latitude = record.coordinates.latitude === null || record.coordinates.latitude === undefined || record.coordinates.latitude === ''
      ? NaN : Number(record.coordinates.latitude);
    const longitude = record.coordinates.longitude === null || record.coordinates.longitude === undefined || record.coordinates.longitude === ''
      ? NaN : Number(record.coordinates.longitude);
    record.coordinates = {
      latitude: Number.isFinite(latitude) ? Math.round(latitude * 100) / 100 : null,
      longitude: Number.isFinite(longitude) ? Math.round(longitude * 100) / 100 : null
    };
  }

  return record;
};
