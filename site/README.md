# Sitio estático de Aisa Inmobiliaria

Este directorio contiene las páginas HTML y recursos que Vercel publica como el sitio principal de Aisa.

El catálogo de inicio, compra y renta se carga desde la API de Render. La agenda también consume esa API, por lo que fichas y citas usan el mismo MongoDB Atlas. Si la API no responde, las páginas muestran un aviso y no sustituyen el inventario con tarjetas de ejemplo.

El proyecto de Vercel usa este directorio como raíz. `build.mjs` copia HTML, estilos, scripts e imágenes a `dist/` para publicación.

Vercel publica las paginas HTML con rutas limpias (por ejemplo, `/compra`) mediante `vercel.json`; los enlaces internos usan esas rutas y `/` como inicio.
