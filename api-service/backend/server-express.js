import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB, getDBStatus } from './config/db.js';

// Rutas de la API
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import consignmentRoutes from './routes/consignmentRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware global
app.use(cors({
  origin(origin, callback) {
    if (!origin || (process.env.NODE_ENV !== 'production' && !process.env.ALLOWED_ORIGINS)) {
      return callback(null, true);
    }

    return callback(null, allowedOrigins.includes(origin));
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de estado de MongoDB
app.get('/api/status', (req, res) => {
  const status = getDBStatus();
  res.status(status.isMongoConnected ? 200 : 503).json({
    success: status.isMongoConnected,
    serverTime: new Date().toISOString(),
    status: status.isMongoConnected ? 'online' : 'unavailable',
    database: status
  });
});

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/consignments', consignmentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Iniciar servidor Express
export const runExpressServer = async () => {
  await connectDB();

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
