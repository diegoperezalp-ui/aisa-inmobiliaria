# API de Aisa Inmobiliaria

## Despliegue en Render

1. En Render, crea un Blueprint desde el repositorio y acepta la configuración de `render.yaml`.
2. En MongoDB Atlas, crea una base de datos y un usuario de base de datos. En Network Access, permite el acceso de red requerido por el servicio de Render.
3. En los ajustes del servicio de Render, configura `MONGODB_URI` con la cadena de conexión de Atlas. No la publiques ni la agregues al repositorio.
4. Render generará `JWT_SECRET` automáticamente. No lo compartas ni lo pongas en el frontend.
5. Espera a que `/api/status` responda `200` e indique `database.isMongoConnected: true`.

El catálogo de propiedades se inicializa automáticamente si Atlas está vacío. Las cuentas de demostración no se crean en producción; registra una cuenta desde `/login?tab=register`.

El sitio usa `https://aisa-inmobiliaria-api.onrender.com/api` como endpoint predeterminado. Si Render asigna otra URL, cambia `defaultApiBase` en `site/js/api.js` o establece `window.GK_API_BASE_URL` antes de cargar el cliente API. Para usar un dominio propio del sitio, agrega su origen a `ALLOWED_ORIGINS` en Render.
