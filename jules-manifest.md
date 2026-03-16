# BRUISER HUB - Jules Manifest

*Este archivo es el registro estricto e inmutable de la arquitectura del plugin "BRUISER HUB". Es obligatorio que cualquier instancia de Jules lea este documento al iniciar una sesión y lo actualice al finalizar.*

## 1. Estructura de Carpetas Actual

```text
bruiserhub/
├── bruiserhub.php              # Archivo principal del plugin (Headers, Menú Admin, Encolado)
├── jules-manifest.md           # [ESTE ARCHIVO] Registro de arquitectura e instrucciones
├── assets/                     # Recursos front-end para la consola del admin
│   ├── admin.css               # Estilos del dashboard y terminal
│   └── admin.js                # Lógica React (wp.element) para la terminal ASCII
└── includes/
    └── api-routes.php          # Controladores y rutas de la REST API
```

## 2. Lista de Endpoints y Métodos

Todos los endpoints residen bajo el namespace `/wp-json/bruiser/v1` y requieren autenticación Basic Auth mediante Application Passwords para el usuario **`user`**.

| Endpoint | Método | Parámetros | Descripción |
| :--- | :--- | :--- | :--- |
| `/ping` | `GET` | N/A | Valida la conectividad y las credenciales de autenticación. Devuelve la hora del servidor. |
| `/file-manager` | `POST` | `action` (read, write, create)<br>`path` (relativo a WP_CONTENT_DIR)<br>`content` (string Base64) | Administrador de archivos para lectura, modificación o creación dentro de wp-content. Protegido contra Directory Traversal. |
| `/products` | `GET` | N/A | Obtiene la lista de todos los productos de WooCommerce publicados (`id`, `title`). |
| `/search-images` | `POST` | `query` (string, ej: "Nombre Producto parfum") | Proxy hacia la API Serper.dev para recuperar 9 imágenes. Oculta la clave de API en el backend. |
| `/set-product-image`| `POST` | `product_id` (int)<br>`image_url` (uri string) | Descarga la imagen en servidor con `media_sideload_image` y la asocia a WooCommerce como miniatura principal en 1 paso. |

## 3. Diccionario de Funciones Principales

- **`bruiserhub_register_admin_menu()`**: Registra la página en el menú de WordPress con el título "🔥 BRUISER HUB" y un ícono SVG de fuego color gris nativo.
- **`bruiserhub_admin_enqueue_scripts()`**: Encola `wp-element` (React nativo de WP), `admin.js` y `admin.css`.
- **`BruiserHubApp` (React)**: Componente principal que administra las pestañas entre `BruiserTerminal` e `ImageSelector`.
- **`BruiserTerminal` (React)**: Consola de inyección base64 realista estilo Mac, fondo transparente, cursor siempre activo, respuesta hardcodeada.
- **`ImageSelector` (React)**: Interfaz de 2 clics para WooCommerce. Lee productos (`/products`), dispara búsqueda en Serper al seleccionar producto (`/search-images`), y asigna la imagen cliqueada directamente (`/set-product-image`).
- **`BruiserHub_API::get_products_handler()`**: Controlador para listar productos WP/WC.
- **`BruiserHub_API::search_images_handler()`**: Controlador Proxy para Serper (Usa API Key 2779d3b77de0f2b5d966b323fed4b8cb7da99cf3 de Daniel).
- **`BruiserHub_API::set_product_image_handler()`**: Controlador de ingesta de medios usando funciones nativas admin de WP.
- **`BruiserHub_API::check_permissions()`**: Validador CRÍTICO de seguridad. Comprueba `is_user_logged_in()` y que el `user_login` actual sea exactamente `user`.
- **`BruiserHub_API::validate_path()`**: Filtro de seguridad que previene retrocesos de directorio (`..`) y garantiza resoluciones dentro de `WP_CONTENT_DIR`.
- **`BruiserHub_API::file_manager_handler()`**: Lógica de enrutamiento y procesamiento (Base64 decode/encode) para la manipulación de archivos físicos.

## 4. Dependencias o Conflictos Conocidos

- **Dependencia:** Requiere que el sitio soporte Application Passwords y tenga un usuario llamado `user` con los permisos suficientes. La Application Password de este usuario debe utilizarse en los llamados.
- **Dependencia Frontend:** Usa `wp.element` de WordPress. No se requiere compilación (Webpack/Babel) para `admin.js` en esta versión inicial.
- **Riesgo/Conflicto:** Problemas de escritura pueden surgir si los permisos del servidor (www-data/nginx/apache) sobre el directorio `wp-content` no son suficientes.
