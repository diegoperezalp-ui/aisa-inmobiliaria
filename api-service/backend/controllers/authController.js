import crypto from 'node:crypto';
import User from '../models/User.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { generateToken } from '../middleware/auth.js';

// Registrar nuevo usuario
export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor proporciona nombre, correo electrónico y contraseña.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres.'
      });
    }

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una cuenta registrada con este correo electrónico.'
        });
      }

      const user = new User({
        name,
        email: email.toLowerCase(),
        password,
        phone: phone || '',
        role: 'client'
      });

      await user.save();

      const token = generateToken({ id: user._id, role: user.role, email: user.email });

      return res.status(201).json({
        success: true,
        message: '¡Cuenta creada exitosamente! Bienvenido a Aisa Inmobiliaria.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          favorites: user.favorites || []
        }
      });
    } else {
      // Almacenamiento local persistente
      const existing = localStore.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una cuenta registrada con este correo electrónico.'
        });
      }

      const newUser = localStore.createUser({
        name,
        email,
        password,
        phone,
        role: 'client'
      });

      const token = generateToken({ id: newUser._id, role: newUser.role, email: newUser.email });

      return res.status(201).json({
        success: true,
        message: '¡Cuenta creada exitosamente! Bienvenido a Aisa Inmobiliaria.',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          favorites: newUser.favorites || []
        }
      });
    }
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error en el servidor al registrar usuario.'
    });
  }
};

// Iniciar sesión
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa correo y contraseña.'
      });
    }

    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos.'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos.'
        });
      }

      const token = generateToken({ id: user._id, role: user.role, email: user.email });

      return res.json({
        success: true,
        message: `¡Bienvenido de vuelta, ${user.name}!`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          favorites: user.favorites || []
        }
      });
    } else {
      // Local store
      const user = localStore.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos.'
        });
      }

      // Verificar contraseña
      let isMatch = false;
      if (user.password.includes(':')) {
        const [salt, originalHash] = user.password.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        isMatch = hash === originalHash;
      } else {
        isMatch = user.password === password;
      }

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos.'
        });
      }

      const token = generateToken({ id: user._id, role: user.role, email: user.email });

      return res.json({
        success: true,
        message: `¡Bienvenido de vuelta, ${user.name}!`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          favorites: user.favorites || []
        }
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor al iniciar sesión.'
    });
  }
};

// Obtener datos del usuario autenticado
export const getMe = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user._id || req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        favorites: req.user.favorites || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener perfil.' });
  }
};
