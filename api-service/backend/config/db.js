import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { initialProperties } from '../seed/seedData.js';

let isMongoConnected = false;

export const connectDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://127.0.0.1:27017/inmobiliaria_greenkey');

  if (!uri) {
    throw new Error('MONGODB_URI es obligatorio en producción.');
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    });
    isMongoConnected = true;
    console.log(`\n=================================================`);
    console.log(` MongoDB CONECTADO EXITOSAMENTE`);
    console.log(`=================================================\n`);

    // Sembrar datos iniciales si la colección está vacía
    await seedDatabaseIfEmpty();

  } catch (error) {
    isMongoConnected = false;
    if (isProduction) {
      throw new Error(`No se pudo conectar a MongoDB: ${error.message}`, { cause: error });
    }

    console.warn('\n[MongoDB] No se pudo conectar a la base de datos configurada.');
    console.warn(`[MongoDB Info] ${error.message}`);
    console.log(`[Modo Local Activo] El servidor utilizará el almacenamiento local persistente (data/db_store.json) para que todas las funciones, catálogo y login sigan funcionando sin interrupción.`);
    console.log(`[Tip] Para activar MongoDB completo:`);
    console.log(`  1. Instala e inicia el servicio de MongoDB en Windows (net start MongoDB), o`);
    console.log(`  2. Coloca tu URL de MongoDB Atlas en el archivo .env (MONGODB_URI=mongodb+srv://...)\n`);

    // Intentar reconectar periódicamente en segundo plano
    scheduleReconnect();
  }
};

const seedDatabaseIfEmpty = async () => {
  try {
    const propertyCount = await Property.countDocuments();
    if (propertyCount === 0) {
      console.log('[MongoDB] Colección de propiedades vacía. Sembrando catálogo inicial de Monterrey...');
      await Property.insertMany(initialProperties);
      console.log(`[MongoDB] ${initialProperties.length} propiedades creadas exitosamente.`);
    }

  } catch (seedErr) {
    console.error('[MongoDB Error al sembrar]:', seedErr.message);
    if (process.env.NODE_ENV === 'production') {
      throw seedErr;
    }
  }
};

const scheduleReconnect = () => {
  setTimeout(async () => {
    if (!isMongoConnected) {
      try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inmobiliaria_greenkey';
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        isMongoConnected = true;
        console.log('[MongoDB] ¡Reconexión a MongoDB exitosa!');
        await seedDatabaseIfEmpty();
      } catch (e) {
        // Silencioso en reintentos periódicos
        scheduleReconnect();
      }
    }
  }, 20000);
};

export const getDBStatus = () => {
  return {
    isMongoConnected,
    mode: isMongoConnected ? 'MongoDB (Mongoose)' : 'Local Persistent Store (Fallback)',
    uriConfigured: Boolean(process.env.MONGODB_URI)
  };
};
