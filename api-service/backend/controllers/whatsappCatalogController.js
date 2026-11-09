import { getDBStatus } from '../config/db.js';
import {
  getCatalogSyncStatus,
  isCatalogSyncConfigured,
  isWhatsAppProfileSyncConfigured,
  queueAllAvailableProperties,
  retryFailedCatalogSyncJobs,
  updateWhatsAppBusinessProfile
} from '../services/whatsappCatalogSyncService.js';

const requireMongo = res => {
  if (getDBStatus().isMongoConnected) return true;
  res.status(503).json({ success: false, message: 'MongoDB no está disponible.' });
  return false;
};

export async function getWhatsAppCatalogStatus(req, res) {
  if (!requireMongo(res)) return;
  try {
    return res.json({
      success: true,
      catalog: await getCatalogSyncStatus(),
      profileConfigured: isWhatsAppProfileSyncConfigured()
    });
  } catch (error) {
    console.error('[Catálogo WhatsApp] No se pudo consultar el estado:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo consultar el estado de sincronización.' });
  }
}

export async function syncWhatsAppCatalog(req, res) {
  if (!requireMongo(res)) return;
  if (!isCatalogSyncConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Configura META_CATALOG_ID y META_CATALOG_ACCESS_TOKEN en Render para iniciar la sincronización.'
    });
  }
  try {
    const retried = await retryFailedCatalogSyncJobs();
    const queued = await queueAllAvailableProperties();
    return res.json({ success: true, queued, retried, message: 'Las propiedades disponibles quedaron en cola para sincronizar.' });
  } catch (error) {
    console.error('[Catálogo WhatsApp] No se pudo iniciar la sincronización:', error.message);
    return res.status(500).json({ success: false, message: 'No se pudo iniciar la sincronización del catálogo.' });
  }
}

export async function syncWhatsAppProfile(req, res) {
  try {
    const result = await updateWhatsAppBusinessProfile();
    return res.json({ success: true, message: 'Se actualizó el perfil de WhatsApp Business.', data: result });
  } catch (error) {
    const status = Number(error.statusCode) || 502;
    console.error('[WhatsApp] No se pudo actualizar el perfil:', error.message);
    return res.status(status).json({ success: false, message: error.message || 'No se pudo actualizar el perfil de WhatsApp Business.' });
  }
}
