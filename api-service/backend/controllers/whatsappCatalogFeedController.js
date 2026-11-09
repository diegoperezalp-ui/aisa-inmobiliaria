import mongoose from 'mongoose';
import Property from '../models/Property.js';

const SITE_URL = 'https://aisa-inmobiliaria.vercel.app';
const excludedImage = 'photo-1600585154340-be6161a56a0c';

const csvCell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const plainText = value => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim();

const catalogDescription = property => {
  const parts = [plainText(property.description)];
  const publicLocation = [property.neighborhood, property.city].filter(Boolean).join(', ');
  if (publicLocation) parts.push(`Ubicación: ${publicLocation}.`);
  if (property.type) parts.push(`Tipo: ${property.type}.`);
  if (property.operation) parts.push(`Operación: ${property.operation === 'renta' ? 'renta' : 'venta'}.`);
  if (Number(property.bedrooms) > 0) parts.push(`Recámaras: ${property.bedrooms}.`);
  if (Number(property.bathrooms) > 0) parts.push(`Baños: ${property.bathrooms}.`);
  const area = Number(property.constructionAreaM2 || property.areaM2);
  if (area > 0) parts.push(`Construcción: ${area} m².`);
  if (Number(property.landAreaM2) > 0) parts.push(`Terreno: ${Number(property.landAreaM2)} m².`);
  if (Array.isArray(property.features) && property.features.length) {
    parts.push(`Características: ${property.features.filter(Boolean).join(', ')}.`);
  }
  const description = parts.filter(Boolean).join('\n').slice(0, 5000);
  return description || 'Propiedad disponible en Aisa Inmobiliaria. Solicita información y confirma la disponibilidad con un asesor.';
};

const catalogCondition = property => {
  const condition = String(property.condition || '').toLowerCase();
  if (/nuevo|nueva|estrenar/.test(condition)) return 'new';
  if (/reacondicion/.test(condition)) return 'refurbished';
  return 'used';
};

export async function getWhatsAppCatalogFeed(req, res) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).type('text/plain').send('El inventario de Aisa no está disponible.');
  }

  try {
    const properties = await Property.find({ status: 'disponible' })
      .select('title slug propertyId description neighborhood city type operation bedrooms bathrooms constructionAreaM2 areaM2 landAreaM2 features condition price images')
      .sort({ updatedAt: -1, _id: 1 })
      .lean();
    const siteUrl = process.env.AISA_PUBLIC_URL || SITE_URL;
    const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'product_type'];
    const rows = properties.flatMap(property => {
      const retailerId = String(property.propertyId || property._id || '').trim().slice(0, 100);
      const image = Array.isArray(property.images)
        ? property.images.find(value => typeof value === 'string'
          && /^https:\/\//i.test(value.trim())
          && !value.includes(excludedImage))
        : '';
      if (!retailerId || !image || !Number.isFinite(Number(property.price)) || Number(property.price) <= 0) return [];

      const slug = String(property.slug || retailerId);
      const link = new URL(`/propiedad.html?id=${encodeURIComponent(slug)}`, siteUrl).toString();
      const price = `${Number(property.price).toFixed(2)} MXN`;
      const productType = [property.operation === 'renta' ? 'Renta' : 'Venta', property.type]
        .filter(Boolean).join(' > ');
      return [[
        retailerId,
        String(property.title || 'Propiedad Aisa').slice(0, 200),
        catalogDescription(property),
        'in stock',
        catalogCondition(property),
        price,
        link,
        image.trim(),
        'Aisa Inmobiliaria',
        productType
      ]];
    });

    const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
    res.set({
      'Cache-Control': 'public, max-age=300',
      'Content-Disposition': 'inline; filename="aisa-properties.csv"',
      'Content-Type': 'text/csv; charset=utf-8'
    });
    return res.status(200).send(csv);
  } catch (error) {
    console.error('[Catálogo WhatsApp] No se pudo generar el feed:', error.message);
    return res.status(500).type('text/plain').send('No se pudo generar el feed del catálogo.');
  }
}
