# Abrir este proyecto en VS Code

## 1. Requisitos
- **Node.js 20 o superior** -> https://nodejs.org (instálalo primero)
- **Visual Studio Code** -> https://code.visualstudio.com

## 2. Descomprimir
Descomprime el ZIP en una carpeta de tu computadora, por ejemplo:
`C:\Users\tuusuario\inmobiliaria-greenkey`

## 3. Abrir en VS Code
1. VS Code -> **Archivo -> Abrir carpeta**
2. Elige la carpeta `inmobiliaria-greenkey`
3. Si VS Code pregunta "¿Confiar en los autores?", acepta.

## 4. Instalar dependencias
Abre la terminal de VS Code (menú **Terminal -> Nuevo terminal**) y ejecuta:

```
npm install
```

## 5. Ver la página
```
npm run dev
```
VS Code mostrará una dirección como `http://localhost:8080`.
Ábrela en el navegador para ver tu página de inicio.

Para detenerla: `Ctrl + C` en la terminal.

## 6. Dónde está tu página
- `src/routes/index.tsx` -> la página de inicio (propiedades, contacto, pie de página)
- `src/styles.css` -> los colores verdes y blancos
- `src/routes/__root.tsx` -> barra superior y pie de página que se repiten en todo el sitio

## 7. Sincronizar con GitHub (opcional)
En Lovable: **Configuración del proyecto -> Git** y conecta tu cuenta de GitHub.
Se crea un repositorio privado; luego en VS Code usa **Clonar repositorio**.
Así los cambios suben y bajan solos entre Lovable y tu computadora.
