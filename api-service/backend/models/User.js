import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { isValidMexicanPhone } from '../utils/phoneValidation.js';
const pbkdf2 = promisify(crypto.pbkdf2);
const PBKDF2_ITERATIONS = 220000;

let bcrypt = null;
try {
  bcrypt = (await import('bcryptjs')).default;
} catch (e) {
  // Fallback a crypto nativo si bcryptjs no está instalado todavía
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre completo es obligatorio'],
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: 12,
    select: false
  },
  phone: {
    type: String,
    trim: true,
    default: '',
    validate: { validator: value => !value || isValidMexicanPhone(value), message: 'Ingresa un teléfono mexicano válido de 10 dígitos.' }
  },
  role: {
    type: String,
    enum: ['client', 'agent', 'admin'],
    default: 'client'
  },
  avatar: {
    type: String,
    default: ''
  },
  favorites: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Middleware antes de guardar: Encriptar contraseña
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  if (bcrypt) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } else {
    // Encriptación nativa con PBKDF2 (SHA-512)
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await pbkdf2(this.password, salt, PBKDF2_ITERATIONS, 64, 'sha512');
    this.password = `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash.toString('hex')}`;
  }
  next();
});

// Método para verificar la contraseña
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;

  if (bcrypt && !this.password.includes(':') && !this.password.startsWith('pbkdf2$')) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  const isCurrentHash = this.password.startsWith('pbkdf2$');
  const [salt, originalHash] = isCurrentHash
    ? this.password.split('$').slice(2)
    : this.password.split(':');
  const iterations = isCurrentHash ? Number(this.password.split('$')[1]) : 1000;
  if (!salt || !originalHash || !Number.isSafeInteger(iterations) || iterations < 1000 || iterations > 1000000) return false;
  const candidate = await pbkdf2(enteredPassword, salt, iterations, 64, 'sha512');
  const expected = Buffer.from(originalHash, 'hex');
  if (expected.length !== candidate.length || !crypto.timingSafeEqual(candidate, expected)) return false;

  if (!isCurrentHash) {
    this.password = enteredPassword;
    await this.save();
  }
  return true;

};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
