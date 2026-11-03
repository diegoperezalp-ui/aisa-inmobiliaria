/**
 * Datos semilla iniciales para MongoDB
 * Contiene todas las propiedades del catálogo de Monterrey
 */

export const initialProperties = [
  {
    title: "Casa Los Pinos",
    slug: "casa-los-pinos",
    operation: "venta",
    type: "casa",
    price: 3850000,
    priceFormatted: "$3,850,000",
    city: "monterrey cumbres",
    neighborhood: "cumbres",
    location: "Cumbres, Monterrey, N.L.",
    description: "Excelente residencia familiar en fraccionamiento privado con vigilancia 24/7. Cuenta con acabados de primera calidad, cocina integral equipada con barra de cuarzo, amplio patio con asador y cochera techada.",
    features: ["3 recámaras", "2.5 baños", "195 m²", "2 autos"],
    amenities: ["Vigilancia 24/7", "Cocina equipada", "Patio con asador", "Cochera techada", "Parque privado"],
    bedrooms: 3,
    bathrooms: 2.5,
    areaM2: 195,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.7380,
      longitude: -100.3760
    },
    featured: true,
    status: "disponible",
    propertyId: "home-casa-cumbres"
  },
  {
    title: "Casa Las Puentes",
    slug: "casa-las-puentes",
    operation: "venta",
    type: "casa",
    price: 5250000,
    priceFormatted: "$5,250,000",
    city: "monterrey san-nicolas",
    neighborhood: "san-nicolas",
    location: "San Nicolás de los Garza, N.L.",
    description: "Espectacular casa remodelada con diseño contemporáneo en una de las mejores zonas de San Nicolás. Espacios abiertos, iluminación natural, jardín posterior y cercanía a centros educativos y comerciales.",
    features: ["3 recámaras", "3 baños", "240 m²", "2 autos"],
    amenities: ["Clima central", "Jardín posterior", "Estudio para home office", "Alacena amplia"],
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 240,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.7570,
      longitude: -100.2910
    },
    featured: true,
    status: "disponible",
    propertyId: "home-casa-san-nicolas"
  },
  {
    title: "Residencia Carretera Nacional",
    slug: "residencia-carretera-nacional",
    operation: "venta",
    type: "casa",
    price: 7200000,
    priceFormatted: "$7,200,000",
    city: "monterrey carretera-nacional",
    neighborhood: "carretera-nacional",
    location: "Carretera Nacional, Monterrey, N.L.",
    description: "Residencia de lujo con vistas espectaculares hacia la Sierra Madre. Diseño arquitectónico premium con doble altura, alberca privada, paneles solares y terraza panorámica.",
    features: ["4 recámaras", "4.5 baños", "340 m²", "3 autos"],
    amenities: ["Alberca privada", "Paneles solares", "Terraza panorámica", "Doble altura", "Cuarto de servicio"],
    bedrooms: 4,
    bathrooms: 4.5,
    areaM2: 340,
    parking: 3,
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.5650,
      longitude: -100.2580
    },
    featured: true,
    status: "disponible",
    propertyId: "home-casa-carretera-nacional"
  },
  {
    title: "Depto. Jardín Central",
    slug: "depto-jardin-central",
    operation: "venta",
    type: "departamento",
    price: 2490000,
    priceFormatted: "$2,490,000",
    city: "monterrey obispado",
    neighborhood: "obispado",
    location: "Obispado, Monterrey, N.L.",
    description: "Departamento moderno en torre con amenidades exclusivas en el tradicional sector del Obispado. Excelente conectividad a avenidas principales como Constitución y Morones Prieto.",
    features: ["2 recámaras", "2 baños", "95 m²", "1 auto"],
    amenities: ["Gimnasio", "Alberca en roof", "Elevador", "Lobby con seguridad"],
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 95,
    parking: 1,
    images: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6769,
      longitude: -100.3478
    },
    featured: true,
    status: "disponible",
    propertyId: "home-depto-obispado"
  },
  {
    title: "Villa Encino",
    slug: "villa-encino",
    operation: "venta",
    type: "casa",
    price: 4150000,
    priceFormatted: "$4,150,000",
    city: "monterrey apodaca",
    neighborhood: "apodaca",
    location: "Apodaca, N.L.",
    description: "Casa en privada exclusiva frente a parque. Amplias recámaras cada una con baño y vestidor. Ubicación estratégica a pocos minutos de parques industriales y aeropuerto.",
    features: ["3 recámaras", "3 baños", "210 m²", "2 autos"],
    amenities: ["Frente a parque", "Palapa social", "Juegos infantiles", "Acceso controlado"],
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 210,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.7806,
      longitude: -100.1881
    },
    featured: true,
    status: "disponible",
    propertyId: "home-casa-apodaca"
  },
  {
    title: "Loft Valle Oriente",
    slug: "loft-valle-oriente",
    operation: "venta",
    type: "loft",
    price: 2980000,
    priceFormatted: "$2,980,000",
    city: "monterrey san-pedro valle-oriente",
    neighborhood: "valle-oriente",
    location: "San Pedro Garza García, N.L.",
    description: "Loft estilo contemporáneo neoyorquino en la zona financiera de Valle Oriente. Ideal para ejecutivos o inversión de alta plusvalía y rentabilidad en plataformas.",
    features: ["1 recámara", "1.5 baños", "78 m²", "1 cajón"],
    amenities: ["Coworking", "Sky lounge", "Gimnasio", "Seguridad 24 hrs"],
    bedrooms: 1,
    bathrooms: 1.5,
    areaM2: 78,
    parking: 1,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6485,
      longitude: -100.3300
    },
    featured: true,
    status: "disponible",
    propertyId: "home-loft-valle-oriente"
  },
  {
    title: "Casa Residencial Contry",
    slug: "casa-residencial-contry",
    operation: "venta",
    type: "casa",
    price: 6450000,
    priceFormatted: "$6,450,000",
    city: "monterrey contry",
    neighborhood: "contry",
    location: "Contry, Monterrey, N.L.",
    description: "Hermosa propiedad tradicional con amplios jardines y arquitectura sólida en zona de alta plusvalía en el sur de Monterrey. Cerca del Tec de Monterrey.",
    features: ["3 recámaras", "3 baños", "280 m²", "2 autos"],
    amenities: ["Jardín amplio", "Terraza", "Bodega", "Estudio"],
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 280,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6550,
      longitude: -100.2780
    },
    featured: true,
    status: "disponible",
    propertyId: "home-casa-contry"
  },
  {
    title: "Terreno Campestre El Barro",
    slug: "terreno-campestre-el-barro",
    operation: "venta",
    type: "terreno",
    price: 1890000,
    priceFormatted: "$1,890,000",
    city: "monterrey santiago el-barro",
    neighborhood: "el-barro",
    location: "El Barro, Santiago, N.L.",
    description: "Excelente lote residencial campestre completamente plano, listo para construir casa de descanso o quinta familiar. Entorno natural rodeado de montañas.",
    features: ["Terreno plano", "500 m²", "Servicios a pie de lote"],
    amenities: ["Servicios subterráneos", "Vistas a la sierra", "Caseta de control"],
    bedrooms: 0,
    bathrooms: 0,
    areaM2: 500,
    parking: 0,
    images: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.5200,
      longitude: -100.2200
    },
    featured: false,
    status: "disponible",
    propertyId: "home-terreno-el-barro"
  },
  {
    title: "Casa en Cerradas de Cumbres",
    slug: "casa-cerradas-de-cumbres",
    operation: "renta",
    type: "casa",
    price: 24000,
    priceFormatted: "$24,000 / mes",
    city: "monterrey cumbres",
    neighborhood: "cumbres",
    location: "Cumbres, Monterrey, N.L.",
    description: "Casa semi-amueblada en privada cerrada con control de acceso y parque central. Cuenta con cocina integral, minisplits inverter en todas las áreas y closets.",
    features: ["3 recámaras", "2.5 baños", "175 m²", "2 autos"],
    amenities: ["Semi-amueblada", "Minisplits inverter", "Acceso controlado", "Parque infantil"],
    bedrooms: 3,
    bathrooms: 2.5,
    areaM2: 175,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.7390,
      longitude: -100.4000
    },
    featured: true,
    status: "disponible",
    propertyId: "rent-casa-cumbres"
  },
  {
    title: "Studio Loft Centro",
    slug: "studio-loft-centro",
    operation: "renta",
    type: "loft",
    price: 14000,
    priceFormatted: "$14,000 / mes",
    city: "monterrey centro",
    neighborhood: "centro",
    location: "Centro de Monterrey, N.L.",
    description: "Estudio moderno totalmente amueblado y equipado en el corazón de Monterrey. Ideal para profesionistas o estudiantes, a pasos de estaciones de metro y rutas de transporte.",
    features: ["1 recámara", "1 baño", "50 m²", "Terraza"],
    amenities: ["Totalmente amueblado", "Internet incluido", "Lavandería en torre", "Terraza con asador"],
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 50,
    parking: 0,
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6800,
      longitude: -100.3130
    },
    featured: true,
    status: "disponible",
    propertyId: "rent-loft-centro"
  },
  {
    title: "Departamento Nuevo Sur",
    slug: "departamento-nuevo-sur",
    operation: "renta",
    type: "departamento",
    price: 18500,
    priceFormatted: "$18,500 / mes",
    city: "monterrey nuevo-sur",
    neighborhood: "nuevo-sur",
    location: "Nuevo Sur, Monterrey, N.L.",
    description: "Departamento con acabados modernos en desarrollo mixto con centro comercial, restaurantes y cines integrados. Gran seguridad y estilo de vida inigualable.",
    features: ["2 recámaras", "2 baños", "105 m²", "2 cajones"],
    amenities: ["Alberca", "Gimnasio", "Acceso directo a plaza comercial", "Pet friendly"],
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 105,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6420,
      longitude: -100.2850
    },
    featured: true,
    status: "disponible",
    propertyId: "rent-depto-nuevosur"
  },
  {
    title: "Casa Contry",
    slug: "casa-contry",
    operation: "renta",
    type: "casa",
    price: 12500,
    priceFormatted: "$12,500 / mes",
    city: "monterrey contry",
    neighborhood: "contry",
    location: "Contry, Monterrey, N.L.",
    description: "Casa cómoda y funcional en privada tranquila. Cercana a centros educativos, hospitales y transporte público.",
    features: ["3 recámaras", "1.5 baños", "130 m²", "1 auto"],
    amenities: ["Patio trasero", "Cochera techada", "Protecciones de herrería"],
    bedrooms: 3,
    bathrooms: 1.5,
    areaM2: 130,
    parking: 1,
    images: [
      "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6500,
      longitude: -100.2700
    },
    featured: true,
    status: "disponible",
    propertyId: "rent-casa-contry"
  },
  {
    title: "Penthouse Valle Oriente",
    slug: "penthouse-valle-oriente",
    operation: "renta",
    type: "departamento",
    price: 32000,
    priceFormatted: "$32,000 / mes",
    city: "monterrey san-pedro valle-oriente",
    neighborhood: "valle-oriente",
    location: "Valle Oriente, San Pedro Garza García",
    description: "Exclusivo penthouse con terraza privada y vista panorámica 360° a toda la ciudad y las montañas. Acabados de lujo, piso de mármol y amenidades tipo resort.",
    features: ["3 recámaras", "3 baños", "190 m²", "2 cajones"],
    amenities: ["Terraza privada 360°", "Alberca semi-olímpica", "Spa & Sauna", "Cancha de pádel"],
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 190,
    parking: 2,
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80"
    ],
    coordinates: {
      latitude: 25.6505,
      longitude: -100.3320
    },
    featured: true,
    status: "disponible",
    propertyId: "rent-ph-valleoriente"
  }
];
