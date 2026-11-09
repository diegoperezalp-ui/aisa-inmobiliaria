import User from '../models/User.js';
import Property from '../models/Property.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';
import { toPublicProperty } from '../utils/publicProperty.js';

// Alternar favorito (agregar / quitar)
export const toggleFavorite = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id || req.user.id;
    const { isMongoConnected } = getDBStatus();

    if (!propertyId) {
      return res.status(400).json({ success: false, message: 'Se requiere el ID de la propiedad.' });
    }

    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
      }

      user.favorites = user.favorites || [];
      const index = user.favorites.indexOf(propertyId);
      let isSaved = false;

      if (index > -1) {
        user.favorites.splice(index, 1);
        isSaved = false;
      } else {
        user.favorites.push(propertyId);
        isSaved = true;
      }

      await user.save();

      return res.json({
        success: true,
        isSaved,
        favorites: user.favorites,
        message: isSaved ? 'Propiedad añadida a tus favoritos.' : 'Propiedad eliminada de tus favoritos.'
      });
    } else {
      const favorites = localStore.toggleFavorite(userId, propertyId);
      const isSaved = favorites ? favorites.includes(propertyId) : false;

      return res.json({
        success: true,
        isSaved,
        favorites: favorites || [],
        message: isSaved ? 'Propiedad añadida a tus favoritos.' : 'Propiedad eliminada de tus favoritos.'
      });
    }
  } catch (error) {
    console.error('Error al alternar favorito:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar favoritos.' });
  }
};

// Obtener todas las propiedades favoritas completas del usuario
export const getMyFavorites = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { isMongoConnected } = getDBStatus();

    if (isMongoConnected) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

      // Buscar los documentos completos de las propiedades
      const properties = (await Property.find({
        status: 'disponible',
        $or: [
          { propertyId: { $in: user.favorites } },
          { slug: { $in: user.favorites } }
        ]
      })).map(toPublicProperty);

      return res.json({
        success: true,
        favorites: user.favorites,
        properties
      });
    } else {
      const user = localStore.findUserById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });

      const favIds = user.favorites || [];
      const allProps = localStore.getProperties();
      const properties = allProps
        .filter(p => p.status === 'disponible' && (favIds.includes(p.propertyId) || favIds.includes(p.slug)))
        .map(toPublicProperty);

      return res.json({
        success: true,
        favorites: favIds,
        properties
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al consultar favoritos.' });
  }
};
