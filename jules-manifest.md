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
| `/price-check`| `GET` | `product_id` (int) | Endpoint matemático de Experto de Mercado. Filtra "decants", réplicas o muestras del JSON de Google Shopping Serper. Ignora ofertas de piratería ($50k COP menos que local) y anomalías caras (>$500k). Compara variaciones del 5% y devuelve `inferior`, `similar` y `mayor` con alerta de color global vs media. |
| `/set-serper-key` | `POST` | `api_key` (string) | Guarda la clave de la API en `wp_options` de forma segura. |

## 3. Diccionario de Funciones Principales

- **`bruiserhub_register_admin_menu()`**: Registra la página en el menú de WordPress con el título "🔥 BRUISER HUB" y un ícono SVG de fuego color gris nativo.
- **`bruiserhub_admin_enqueue_scripts()`**: Encola `wp-element` (React nativo de WP), `admin.js` y `admin.css`.
- **`BruiserHubApp` (React)**: Componente principal que administra las pestañas entre `BruiserTerminal`, `ImageSelector` y `PriceComparator`.
- **`BruiserTerminal` (React)**: Motor interactivo de comandos simulado estilo Mac. Maneja un historial en array (inputs + respuestas asíncronas). Soporta comandos como `help/ayuda`, `hora/time`, `count/cantidad` (usando la REST API para WooCommerce), `setkey` para cambiar la clave Serper, y permite cambiar colores dinámicamente (`color #hex`).
- **`ImageSelector` (React)**: Interfaz de 2 clics para WooCommerce. Lee productos (`/products`), dispara búsqueda en Serper al seleccionar producto (`/search-images`), y asigna la imagen cliqueada directamente (`/set-product-image`).
- **`PriceComparator` (React)**: Tercera pestaña aislada. Clona el UI de `ImageSelector` a la derecha. Presenta resultados matemáticos de Serper divididos en tres columnas (Baratos, Similares, Caros) con alertas de color según posición en el mercado.
- **`BruiserHub_API::get_products_handler()`**: Controlador para listar productos WP/WC (con foto).
- **`BruiserHub_API::price_check_handler()`**: Controlador lógico-matemático experto. Aplica listas negras Anti-Decants y Anti-Anomalías para el mercado de perfumes colombiano y evalúa competitividad en COP.
- **`BruiserHub_API::search_images_handler()`**: Controlador Proxy para Serper (Usa la API Key configurada en la base de datos `bruiserhub_serper_api_key`).
- **`BruiserHub_API::set_product_image_handler()`**: Controlador de ingesta de medios usando funciones nativas admin de WP.
- **`BruiserHub_API::check_permissions()`**: Validador CRÍTICO de seguridad. Comprueba `is_user_logged_in()` y que el `user_login` actual sea exactamente `user`.
- **`BruiserHub_API::validate_path()`**: Filtro de seguridad que previene retrocesos de directorio (`..`) y garantiza resoluciones dentro de `WP_CONTENT_DIR`.
- **`BruiserHub_API::file_manager_handler()`**: Lógica de enrutamiento y procesamiento (Base64 decode/encode) para la manipulación de archivos físicos.

## 4. Dependencias o Conflictos Conocidos

- **Dependencia:** Requiere que el sitio soporte Application Passwords y tenga un usuario llamado `user` con los permisos suficientes. La Application Password de este usuario debe utilizarse en los llamados.
- **Dependencia Frontend:** Usa `wp.element` de WordPress. No se requiere compilación (Webpack/Babel) para `admin.js` en esta versión inicial.
- **Riesgo/Conflicto:** Problemas de escritura pueden surgir si los permisos del servidor (www-data/nginx/apache) sobre el directorio `wp-content` no son suficientes.

## History

- **[16 Mar 2026]** Updated `price_check_handler` in `includes/api-routes.php` to improve Google Shopping Colombia results. Removed aggressive blacklisted words ('ml', 'onzas', 'oz'), updated the search query from 'parfum' to 'perfume', and made the extreme price filter dynamic (rejects if market price is < 50% of local product price instead of a hardcoded 50,000 COP difference).
