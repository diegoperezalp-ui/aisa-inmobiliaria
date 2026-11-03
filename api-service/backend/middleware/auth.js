import crypto from 'node:crypto';
import User from '../models/User.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

let jwt = null;
try {
  jwt = (await import('jsonwebtoken')).default;
} catch (e) {
  // Fallback a token nativo si jsonwebtoken no está instalado
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('JWT_SECRET es obligatorio en producción.');
  }
  return secret || 'greenkey_super_secret_jwt_key_2026';
};

// Generar Token
export const generateToken = (payload) => {
  const jwtSecret = getJwtSecret();
  if (jwt) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
  }

  // Token nativo seguro HMAC-SHA256 codificado en base64url
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) })).toString('base64url');
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

// Verificar Token
export const verifyToken = (token) => {
  if (!token) return null;
  const jwtSecret = getJwtSecret();

  if (jwt) {
    try {
      return jwt.verify(token, jwtSecret);
    } catch (e) {
      // Intentar decodificación manual si fue emitido con formato nativo
    }
  }

  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expirado
    }
    return payload;
  } catch (err) {
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
