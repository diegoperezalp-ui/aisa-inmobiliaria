# Guía de Copilot para Aisa Inmobiliaria

Al registrar o modificar una propiedad, usa el endpoint administrativo de la aplicación. Nunca conectes Copilot directamente a MongoDB ni incluyas credenciales en archivos versionados, prompts o chats.

1. Usa solo los datos confirmados por el usuario o por una fuente que este haya indicado. No inventes precio, ubicación, coordenadas, imágenes, disponibilidad ni características. Deja fuera del lote los campos faltantes y pide aclaración si son obligatorios.
2. Prepara el archivo `api-service/work/property-import.json` con el formato descrito en `api-service/COPILOT-WHATSAPP.md`. La carpeta `work/` está excluida de Git.
3. Conserva un `propertyId` estable por inmueble. La importación crea o actualiza por ese identificador y no elimina propiedades omitidas.
4. Ejecuta primero la vista previa: `npm --prefix api-service run import:properties -- work/property-import.json`.
5. Guarda cambios en producción solo cuando el usuario lo pida claramente y haya revisado la vista previa: añade `--apply` al comando. El script requiere un token JWT vigente de administrador en `AISA_ADMIN_TOKEN`; no lo imprimas ni lo guardes en el repositorio.
6. Si faltan el token o datos obligatorios, detente y explica qué hace falta. No intentes conectarte directamente a MongoDB ni sortear permisos.

El frontend publicado está en Vercel. La API y MongoDB están conectados a Render; `render.yaml` define el backend con raíz `api-service`.
