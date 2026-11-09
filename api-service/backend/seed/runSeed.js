import 'dotenv/config';
import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { initialProperties } from './seedData.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('El seed de demostración está deshabilitado en producción.');
}
if (process.env.CONFIRM_DEMO_SEED !== 'true') {
  throw new Error('Para cargar datos de demostración local, confirma con CONFIRM_DEMO_SEED=true.');
}
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI es obligatorio para ejecutar el seed.');
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const count = await Property.countDocuments();
  if (count > 0) {
    console.log(`Seed omitido: la colección ya contiene ${count} propiedades. No se modificó ningún registro.`);
  } else {
    await Property.insertMany(initialProperties, { ordered: false });
    console.log(`Catálogo de demostración cargado: ${initialProperties.length} propiedades.`);
  }
} finally {
  await mongoose.disconnect();
}
