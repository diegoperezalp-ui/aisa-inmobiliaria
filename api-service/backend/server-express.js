import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB, getDBStatus } from './config/db.js';

// Rutas de la API
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import propertyImportRoutes from './routes/propertyImportRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import consignmentRoutes from './routes/consignmentRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import appraisalRoutes from './routes/appraisalRoutes.js';
import preparationRoutes from './routes/preparationRoutes.js';
import { startWhatsAppCatalogSyncWorker } from './services/whatsappCatalogSyncService.js';
import { rateLimit } from './middleware/rateLimit.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres en producción.');
}

const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware global
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  });
  next();
});
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || (process.env.NODE_ENV !== 'production' && !process.env.ALLOWED_ORIGINS)) {
      return callback(null, true);
    }

    return callback(null, allowedOrigins.includes(origin));
  }
}));
const authLimiter = rateLimit({ limit: 10, windowMs: 15 * 60 * 1000, message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' });
const registrationLimiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000, message: 'Se alcanzó el límite de registros. Intenta más tarde.' });
const aiLimiter = rateLimit({ limit: 12, windowMs: 60 * 1000, message: 'El asistente recibió muchas consultas. Intenta de nuevo en un minuto.' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/ai/chat', aiLimiter);

app.use('/api/whatsapp/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// Endpoint de estado de MongoDB
app.get('/api/status', (req, res) => {
  const status = getDBStatus();
  res.status(status.isMongoConnected ? 200 : 503).json({
    success: status.isMongoConnected,
    status: status.isMongoConnected ? 'online' : 'unavailable'
  });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyImportRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/consignments', consignmentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/preparations', preparationRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' || error.status === 413 ? 413
    : error.code?.startsWith('LIMIT_') || error.status === 400 ? 400
      : 500;
  if (status === 500) console.error('[API] Error no controlado:', error.message);
  return res.status(status).json({
    success: false,
    message: status === 500 ? 'Ocurrió un error interno. Intenta de nuevo.' : (error.message || 'Solicitud no válida.')
  });
});

// Iniciar servidor Express
export const runExpressServer = async () => {
  await connectDB();
  startWhatsAppCatalogSyncWorker();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`   SISTEMA INMOBILIARIO GREENKEY / AISA (EXPRESS + MONGO) `);
    console.log(`======================================================`);
    console.log(`  🌐 Servidor Web:      http://localhost:${PORT}`);
    console.log(`  📊 API Catálogo:      http://localhost:${PORT}/api/properties`);
    console.log(`  🔐 API Autenticación: http://localhost:${PORT}/api/auth`);
    console.log(`  🩺 Estado de MongoDB: http://localhost:${PORT}/api/status`);
    console.log(`======================================================\n`);
  });
};

runExpressServer();
