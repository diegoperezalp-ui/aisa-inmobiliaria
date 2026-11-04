import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { initialProperties } from '../seed/seedData.js';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db_store.json');

class LocalStore {
  constructor() {
    this.data = {
      properties: [],
      users: [],
      visits: [],
      consignments: [],
      contacts: []
    };
    if (process.env.NODE_ENV !== 'production') {
      this.init();
    }
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (e) {
        console.error('Error al leer db_store.json, regenerando con datos iniciales:', e);
        this.seedInitial();
      }
    } else {
      this.seedInitial();
    }
  }

  seedInitial() {
    this.data.properties = initialProperties.map((p, index) => ({
      _id: `prop_${Date.now()}_${index}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...p
    }));

    this.data.users = [];
    this.data.visits = [];
    this.data.consignments = [];
    this.data.contacts = [];
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error al guardar en db_store.json:', e);
    }
  }

  // Colección de Propiedades
  getProperties(filter = {}) {
    let result = [...this.data.properties];

    if (filter.operation && filter.operation !== 'all') {
      result = result.filter(p => p.operation === filter.operation);
    }
    if (filter.type && filter.type !== 'all') {
      result = result.filter(p => p.type === filter.type);
    }
    if (filter.city && filter.city !== 'all') {
      const queryCity = filter.city.toLowerCase().replace(/-/g, ' ');
      result = result.filter(p => (p.city || '').toLowerCase().includes(queryCity) || (p.location || '').toLowerCase().includes(queryCity));
    }
    if (filter.minPrice) {
      result = result.filter(p => p.price >= Number(filter.minPrice));
    }
    if (filter.maxPrice) {
      result = result.filter(p => p.price <= Number(filter.maxPrice));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    if (filter.sort === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (filter.sort === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else {
      // Recientes
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }

  getPropertyByIdOrSlug(idOrSlug) {
    return this.data.properties.find(p =>
      p._id === idOrSlug ||
      p.slug === idOrSlug ||
      p.propertyId === idOrSlug
    ) || null;
  }

  createProperty(propData) {
    const slug = propData.slug || propData.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const newProp = {
      _id: `prop_${Date.now()}`,
      slug,
      propertyId: `custom-${Date.now()}`,
      status: 'disponible',
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...propData
    };

    this.data.properties.unshift(newProp);
    this.save();
    return newProp;
  }

  updateProperty(id, updateData) {
    const index = this.data.properties.findIndex(p => p._id === id || p.slug === id);
    if (index === -1) return null;

    this.data.properties[index] = {
      ...this.data.properties[index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.properties[index];
  }

  deleteProperty(id) {
    const index = this.data.properties.findIndex(p => p._id === id || p.slug === id);
    if (index === -1) return false;

    this.data.properties.splice(index, 1);
    this.save();
    return true;
  }

  // Colección de Usuarios
  findUserByEmail(email) {
    if (!email) return null;
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findUserById(id) {
    return this.data.users.find(u => u._id === id) || null;
  }

  createUser(userData) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(userData.password, salt, 1000, 64, 'sha512').toString('hex');

    const newUser = {
      _id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: `${salt}:${hash}`,
      role: userData.role || 'client',
      phone: userData.phone || '',
      favorites: userData.favorites || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  toggleFavorite(userId, propertyId) {
    const user = this.findUserById(userId);
    if (!user) return null;

    if (!user.favorites) user.favorites = [];
    const index = user.favorites.indexOf(propertyId);
    if (index > -1) {
      user.favorites.splice(index, 1);
    } else {
      user.favorites.push(propertyId);
    }
    user.updatedAt = new Date().toISOString();
    this.save();
    return user.favorites;
  }

  // Colección de Visitas
  createVisit(visitData) {
    const newVisit = {
      _id: `visit_${Date.now()}`,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      ...visitData
    };
    this.data.visits.unshift(newVisit);
    this.save();
    return newVisit;
  }

  getVisits(userId = null) {
    if (userId) {
      return this.data.visits.filter(v => v.userId === userId);
    }
    return this.data.visits;
  }

  updateVisitStatus(id, updates) {
    const visit = this.data.visits.find(v => v._id === id);
    if (!visit) return null;
    Object.assign(visit, updates);
    visit.updatedAt = new Date().toISOString();
    this.save();
    return visit;
  }

  // Colección de Consignaciones
  createConsignment(consignData) {
    const newConsignment = {
      _id: `consign_${Date.now()}`,
      status: 'nuevo',
      createdAt: new Date().toISOString(),
      ...consignData
    };
    this.data.consignments.unshift(newConsignment);
    this.save();
    return newConsignment;
  }

  getConsignments() {
    return this.data.consignments;
  }

  updateConsignmentStatus(id, status) {
    const item = this.data.consignments.find(c => c._id === id);
    if (!item) return null;
    item.status = status;
    item.updatedAt = new Date().toISOString();
    this.save();
    return item;
  }

  // Colección de Contactos
  createContact(contactData) {
    const newContact = {
      _id: `contact_${Date.now()}`,
      status: 'no_leido',
      createdAt: new Date().toISOString(),
      ...contactData
    };
    this.data.contacts.unshift(newContact);
    this.save();
    return newContact;
  }

  getContacts() {
    return this.data.contacts;
  }
}

export const localStore = new LocalStore();
