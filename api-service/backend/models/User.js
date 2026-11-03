import mongoose from 'mongoose';
import crypto from 'node:crypto';

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
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true,
    default: ''
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
    const hash = crypto.pbkdf2Sync(this.password, salt, 1000, 64, 'sha512').toString('hex');
    this.password = `${salt}:${hash}`;
  }
  next();
});

// Método para verificar la contraseña
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;

  if (bcrypt && !this.password.includes(':')) {
    return await bcrypt.compare(enteredPassword, this.password);
  }

  // Si está almacenada con el hash nativo
  if (this.password.includes(':')) {
    const [salt, originalHash] = this.password.split(':');
    const hash = crypto.pbkdf2Sync(enteredPassword, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }

  return false;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
