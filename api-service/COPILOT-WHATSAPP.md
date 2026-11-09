# Integración Copilot y WhatsApp

## Importar una ficha desde VS Code Copilot

La aplicación tiene un endpoint de importación en el backend de Render, protegido con sesión de administrador. El formato aceptado y el script de terminal están en `COPILOT-WHATSAPP.md` y `scripts/import-properties.mjs`.

1. Pide a Copilot que genere `work/property-import.json` únicamente con los datos que le proporcionaste. Cada ficha necesita `propertyId` estable, operación, tipo, precio, ciudad/zona, ubicación, imágenes y coordenadas reales.
2. En terminal, define el JWT de administrador vigente en `AISA_ADMIN_TOKEN`; no lo pegues en el chat ni lo escribas en archivos versionados.
3. Ejecuta `npm run import:properties -- work/property-import.json` para obtener una vista previa.
4. Tras revisar el conteo y registros, si el contenido es correcto, ejecuta el mismo comando con `--apply`.

La importación actualiza por `propertyId`; nunca elimina registros que falten en el archivo.

## WhatsApp Cloud API / Meta Business Agent

Render: `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN` y (si se elige proveedor IA externo) `OPENAI_API_KEY`. Configura `https://aisa-inmobiliaria-api.onrender.com/api/whatsapp/webhook` y suscríbete a `messages`. No introduzcas estos valores en el repositorio o en este chat.

Para mantener el catálogo de WhatsApp alineado con MongoDB, Render también requiere `META_CATALOG_ID` y `META_CATALOG_ACCESS_TOKEN` con acceso al catálogo de Aisa. La API sincroniza altas, cambios, importaciones, promociones desde Agenda y bajas, mediante una cola persistente. Además vigila cambios directos hechos por Copilot mediante MongoDB Change Streams; esto requiere un clúster MongoDB con soporte de Change Streams. Al iniciar con estas credenciales agrega las propiedades disponibles actuales. El panel de administración puede usar `GET /api/whatsapp/catalog/status` y `POST /api/whatsapp/catalog/sync` con el token de sesión de administrador.

La información pública del sitio se puede copiar al perfil de WhatsApp Business mediante `POST /api/whatsapp/profile/sync` (sesión de administrador), después de configurar `WHATSAPP_PHONE_NUMBER_ID` además del token de WhatsApp. El endpoint usa `https://aisa-inmobiliaria.vercel.app` y `aisainmobiliaria9@gmail.com`; no publica dirección postal ni fotografía porque el sitio no proporciona datos confirmados para esos campos.

La política vigente de WhatsApp exige escalación humana accesible y limita el uso de proveedores de IA cuando la IA es la función principal. En México, no actives una oferta de chatbot IA de propósito general sin confirmación de elegibilidad. Aisa es una agencia; su caso debería presentarse como soporte y catálogo inmobiliario, con transferencia a un asesor. La decisión final de elegibilidad corresponde a Meta. Una alternativa nativa es Meta Business Agent/Business Agent Platform, sujeto a disponibilidad y términos de la cuenta.

Para completar el enlace hacen falta: (a) App Secret de la app existente **Aisa Agent**; (b) token de acceso de WhatsApp Business con permiso para mensajería; (c) Verify Token elegido por la cuenta; (d) confirmar el número/WABA asociado; (e) confirmar que Meta acepta el caso como atención inmobiliaria con IA auxiliar. Agrega valores como secretos en Render y verifica `/api/status`, que indica si las integraciones están configuradas sin revelar secretos.

No se enviaron mensajes de prueba ni se cambió la base real.
