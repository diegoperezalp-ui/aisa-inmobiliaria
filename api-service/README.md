# API de Aisa Inmobiliaria

La API de Render y MongoDB Atlas comparten el inventario de propiedades, la agenda de visitas y las cuentas. El catálogo público solo devuelve fichas disponibles y expone zona y coordenadas aproximadas; el panel administrativo conserva los datos completos.

## Despliegue en Render

1. En Render, crea un Blueprint desde el repositorio y acepta la configuración de `render.yaml`.
2. En MongoDB Atlas, crea una base de datos y un usuario de base de datos. En Network Access, permite el acceso de red requerido por el servicio de Render.
3. En los ajustes del servicio de Render, configura `MONGODB_URI` con la cadena de conexión de Atlas. No la publiques ni la agregues al repositorio.
4. Render generará `JWT_SECRET` automáticamente. No lo compartas ni lo pongas en el frontend.
5. Espera a que `/api/status` responda `200` e indique `database.isMongoConnected: true`.

En producción no se cargan fichas de demostración ni se reemplaza el catálogo al iniciar. No uses `seed` contra la base real. Para incorporar inmuebles confirmados, usa la agenda con sesión de administrador o el importador de Copilot documentado en [COPILOT-WHATSAPP.md](COPILOT-WHATSAPP.md). El importador primero muestra una vista previa y actualiza por `propertyId` estable.

## WhatsApp

El endpoint de webhook es `https://aisa-inmobiliaria-api.onrender.com/api/whatsapp/webhook`. En la app de Meta, configura ese callback, el mismo `WHATSAPP_VERIFY_TOKEN` que guardes en Render y la suscripción `messages`. Render también necesita `META_APP_SECRET` y `WHATSAPP_ACCESS_TOKEN`. Guarda estos valores únicamente como variables secretas del servicio; no los incluyas en Git ni en Copilot Chat.

El webhook verifica la firma de Meta, evita procesar dos veces el mismo mensaje y respeta solicitudes de baja. No contestará hasta que la app de Meta y las variables secretas estén configuradas.

### Sincronización del catálogo de WhatsApp

El inventario disponible de MongoDB se guarda en una cola persistente y se envía a Meta cuando se crea, edita, importa, publica o elimina una propiedad. También escucha cambios directos en la colección de MongoDB, por ejemplo cargas hechas desde Copilot; esto requiere que MongoDB admita Change Streams (como MongoDB Atlas). Las propiedades en preparación no se publican; entran al catálogo al promoverlas a Aisa. Los cambios de disponibilidad y las eliminaciones se reflejan como bajas del artículo en Meta. La cola conserva el estado y reintenta fallos temporales.

En Render agrega `META_CATALOG_ID` y `META_CATALOG_ACCESS_TOKEN` (token de Meta con permiso para administrar ese catálogo). `META_GRAPH_API_VERSION` puede usar el valor definido en `render.yaml` o una versión habilitada para tu app. Al arrancar con esas variables configuradas, la API agrega a la cola todas las propiedades actualmente disponibles.

Con una sesión de administrador se puede consultar `GET /api/whatsapp/catalog/status`, iniciar una reconciliación de propiedades disponibles con `POST /api/whatsapp/catalog/sync` y actualizar la información pública del perfil con `POST /api/whatsapp/profile/sync`. El último endpoint requiere `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_ACCESS_TOKEN`; actualiza el sitio, el correo y las descripciones tomadas de Aisa. Render debe guardar los tokens como secretos.

El catálogo debe ser el que Meta asoció a WhatsApp Business. La primera carga actualiza o crea los inmuebles disponibles en MongoDB. Si había artículos manuales antiguos en Meta que ya no existen en MongoDB, revísalos aparte en Commerce Manager: la sincronización no borra otros artículos ajenos al inventario de Aisa.

#### Alternativa sin Meta Developers ni tokens

La API también publica un feed CSV con las propiedades disponibles y sus datos públicos: `https://aisa-inmobiliaria-api.onrender.com/api/whatsapp/catalog/feed.csv`. Commerce Manager puede leerlo por URL en un horario, así que esta ruta no requiere `META_CATALOG_ACCESS_TOKEN` ni crear una app en Meta Developers. El feed omite fichas sin una imagen HTTPS pública o sin precio válido.

Para conectarlo, abre el catálogo de Aisa en Commerce Manager, agrega el feed como origen de datos con esa URL y programa la actualización. Usa el modo de reemplazo solo si ese feed debe ser la lista completa de artículos de Aisa; si el catálogo también tiene artículos manuales u otros orígenes, revisa la configuración antes de habilitar la eliminación de artículos ausentes. Después, vincula ese catálogo existente desde la aplicación WhatsApp Business. El catálogo conectado puede tardar hasta 24 horas en reflejar cambios en WhatsApp Web.

Esta alternativa actualiza el catálogo sin credenciales de desarrollador, pero la primera vinculación del feed y del catálogo se hace desde Commerce Manager y la aplicación WhatsApp Business. Para respuestas con IA sin integrar API, la agenda administrativa incluye un redactor privado: pega el mensaje, genera una respuesta basada en inventario disponible y cópiala en WhatsApp. La respuesta no se envía sola. Para automatización 24/7, puedes usar el agente nativo de WhatsApp Business si está habilitado para la cuenta o un proveedor oficial con inicio de sesión integrado; aun así requiere autorizar el negocio de Meta, aunque no tengas que crear una app en Meta Developers.

El sitio usa `https://aisa-inmobiliaria-api.onrender.com/api` como endpoint predeterminado. Si Render asigna otra URL, cambia `defaultApiBase` en `site/js/api.js` o establece `window.GK_API_BASE_URL` antes de cargar el cliente API. Para usar un dominio propio del sitio, agrega su origen a `ALLOWED_ORIGINS` en Render.
