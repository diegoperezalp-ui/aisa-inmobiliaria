import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

const developmentSecret = crypto.randomBytes(32).toString('hex');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'production' && !secret) return developmentSecret;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET debe configurarse con al menos 32 caracteres.');
  }
  return secret;
};

// Generar Token
export const generateToken = (payload) => {
  const jwtSecret = getJwtSecret();
  return jwt.sign(payload, jwtSecret, { algorithm: 'HS256', expiresIn: '1d' });
};

// Verificar Token
export const verifyToken = (token) => {
  if (!token) return null;
  const jwtSecret = getJwtSecret();

  try {
    return jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
};

// Middleware para Proteger Rutas
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado. Se requiere iniciar sesión.' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ success: false, message: 'Sesión inválida o expirada. Inicia sesión nuevamente.' });
  }

  try {
    const { isMongoConnected } = getDBStatus();
    let user = null;

    if (isMongoConnected) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = localStore.findUserById(decoded.id);
      if (user) {
        const { password, ...safeUser } = user;
        user = safeUser;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'El usuario ya no existe en el sistema.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'La cuenta está suspendida. Contacta a Aisa Inmobiliaria.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al verificar autenticación.' });
  }
};

// Middleware para verificar rol de Administrador
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Permiso denegado. Se requieren privilegios de administrador.' });
};
