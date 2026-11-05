import 'dotenv/config';
import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { initialProperties } from './seedData.js';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI es obligatorio para ejecutar el seed.');
}

await mongoose.connect(uri);
await Property.deleteMany({});
await Property.insertMany(initialProperties);

console.log(`Catálogo actualizado: ${initialProperties.length} propiedades.`);
await mongoose.disconnect();
