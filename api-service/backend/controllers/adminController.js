import Property from '../models/Property.js';
import User from '../models/User.js';
import Visit from '../models/Visit.js';
import Consignment from '../models/Consignment.js';
import Contact from '../models/Contact.js';
import { localStore } from '../utils/localStore.js';
import { getDBStatus } from '../config/db.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const dbStatus = getDBStatus();

    if (dbStatus.isMongoConnected) {
      const [
        totalProperties,
        totalVisits,
        pendingVisits,
        totalConsignments,
        newConsignments,
        totalUsers,
        totalContacts
      ] = await Promise.all([
        Property.countDocuments(),
        Visit.countDocuments(),
        Visit.countDocuments({ status: 'pendiente' }),
        Consignment.countDocuments(),
        Consignment.countDocuments({ status: 'nuevo' }),
        User.countDocuments(),
        Contact.countDocuments({ status: 'no_leido' })
      ]);

      const recentVisits = await Visit.find().sort({ createdAt: -1 }).limit(10);
      const recentConsignments = await Consignment.find().sort({ createdAt: -1 }).limit(10);
      const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(10);

      return res.json({
        success: true,
        dbStatus,
        metrics: {
          totalProperties,
          totalVisits,
          pendingVisits,
          totalConsignments,
          newConsignments,
          totalUsers,
          unreadContacts: totalContacts
        },
        recentVisits,
        recentConsignments,
        recentUsers
      });
    } else {
      const allProps = localStore.getProperties();
      const allVisits = localStore.getVisits();
      const allConsignments = localStore.getConsignments();
      const allUsers = localStore.data.users.map(({ password, ...u }) => u);
      const allContacts = localStore.getContacts();

      return res.json({
        success: true,
        dbStatus,
        metrics: {
          totalProperties: allProps.length,
          totalVisits: allVisits.length,
          pendingVisits: allVisits.filter(v => v.status === 'pendiente').length,
          totalConsignments: allConsignments.length,
          newConsignments: allConsignments.filter(c => c.status === 'nuevo').length,
          totalUsers: allUsers.length,
          unreadContacts: allContacts.filter(c => c.status === 'no_leido').length
        },
        recentVisits: allVisits.slice(0, 10),
        recentConsignments: allConsignments.slice(0, 10),
        recentUsers: allUsers.slice(0, 10)
      });
    }
  } catch (error) {
    console.error('Error en getDashboardSummary:', error);
    return res.status(500).json({ success: false, message: 'Error al consultar resumen administrativo.' });
  }
};
