<?php
/**
 * Bruiser Hub API Routes
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class BruiserHub_API {

    private $namespace = 'bruiser/v1';

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    public function register_routes() {
        // Ping Endpoint
        register_rest_route( $this->namespace, '/ping', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'ping_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
        ) );

        // Endpoint para obtener productos (WooCommerce)
        register_rest_route( $this->namespace, '/products', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'get_products_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
        ) );

        // Endpoint para buscar imágenes (Serper.dev Proxy)
        register_rest_route( $this->namespace, '/search-images', array(
            'methods'  => 'POST',
            'callback' => array( $this, 'search_images_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
            'args'     => array(
                'query' => array(
                    'required' => true,
                    'type'     => 'string'
                )
            )
        ) );

        // Endpoint para asignar imagen a un producto
        register_rest_route( $this->namespace, '/set-product-image', array(
            'methods'  => 'POST',
            'callback' => array( $this, 'set_product_image_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
            'args'     => array(
                'product_id' => array(
                    'required' => true,
                    'type'     => 'integer'
                ),
                'image_url' => array(
                    'required' => true,
                    'type'     => 'string',
                    'format'   => 'uri'
                )
            )
        ) );

        // Endpoint de Comparador de Precios (Serper Shopping API)
        register_rest_route( $this->namespace, '/price-check', array(
            'methods'  => 'GET',
            'callback' => array( $this, 'price_check_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
            'args'     => array(
                'product_id' => array(
                    'required' => true,
                    'type'     => 'integer'
                )
            )
        ) );

        // File Manager Endpoint
        register_rest_route( $this->namespace, '/file-manager', array(
            'methods'  => 'POST',
            'callback' => array( $this, 'file_manager_handler' ),
            'permission_callback' => array( $this, 'check_permissions' ),
            'args'     => array(
                'action' => array(
                    'required' => true,
                    'type'     => 'string',
                    'enum'     => array('read', 'write', 'create'),
                    'description' => 'The action to perform on the file.'
                ),
                'path' => array(
                    'required' => true,
                    'type'     => 'string',
                    'description' => 'Path relative to WP_CONTENT_DIR.'
                ),
                'content' => array(
                    'required' => false,
                    'type'     => 'string',
                    'description' => 'Base64 encoded content for writing or creating.'
                )
            )
        ) );
    }

    /**
     * Autenticación CRÍTICA
     * Confía en el sistema nativo de WordPress (Application Passwords / Basic Auth o Sesión de Cookie con Nonce)
     * Verifica que el usuario que está realizando la petición tenga permisos de administrador o sea el usuario 'user'
     */
    public function check_permissions( WP_REST_Request $request ) {
        if ( ! is_user_logged_in() ) {
            return new WP_Error( 'rest_not_logged_in', __( 'No estás autenticado.', 'bruiserhub' ), array( 'status' => 401 ) );
        }

        $current_user = wp_get_current_user();

        // Allow if user is exactly 'user' OR if they have manage_options (for internal UI usage with Nonce)
        if ( $current_user->user_login !== 'user' && ! current_user_can( 'manage_options' ) ) {
            return new WP_Error( 'rest_forbidden', __( 'Usuario no autorizado.', 'bruiserhub' ), array( 'status' => 403 ) );
        }

        return true;
    }

    /**
     * Validate and sanitize file path against Directory Traversal attacks
     * Must be strictly inside WP_CONTENT_DIR
     */
    private function validate_path( $path ) {
        // Bloquear intentos de retroceso de directorio
        if ( strpos( $path, '..' ) !== false ) {
            return new WP_Error( 'invalid_path', 'Directory traversal detected. Action blocked.', array( 'status' => 400 ) );
        }

        // Remover barras inclinadas iniciales para armar bien la ruta
        $path = ltrim( $path, '/' );

        $full_path = WP_CONTENT_DIR . '/' . $path;

        // Asegurarse de que después de la resolución, el archivo sigue dentro de WP_CONTENT_DIR
        $real_base = realpath( WP_CONTENT_DIR );

        // Find the deepest existing directory
        $check_path = dirname( $full_path );
        while ( ! file_exists( $check_path ) && dirname( $check_path ) !== $check_path ) {
            $check_path = dirname( $check_path );
        }

        $real_path = realpath( $check_path );

        if ( $real_base === false || $real_path === false || strpos( $real_path, $real_base ) !== 0 ) {
             return new WP_Error( 'invalid_path', 'Path is outside of allowed directory WP_CONTENT_DIR.', array( 'status' => 400 ) );
        }

        return $full_path;
    }

    /**
     * Ping Endpoint Callback
     */
    public function ping_handler( WP_REST_Request $request ) {
        return rest_ensure_response( array(
            'status' => 'success',
            'message' => 'PONG. Authentication successful for user: user.',
            'time' => current_time( 'mysql' )
        ) );
    }

    /**
     * Get Products Handler (WooCommerce)
     */
    public function get_products_handler( WP_REST_Request $request ) {
        if ( ! class_exists( 'WooCommerce' ) ) {
            return new WP_Error( 'no_woocommerce', 'WooCommerce is not installed or active.', array( 'status' => 500 ) );
        }

        $args = array(
            'post_type'      => 'product',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'fields'         => 'ids'
        );
        $products = get_posts( $args );

        $result = array();
        foreach ( $products as $product_id ) {
            $thumbnail_id = get_post_thumbnail_id( $product_id );
            $thumbnail_url = $thumbnail_id ? wp_get_attachment_image_url( $thumbnail_id, 'thumbnail' ) : '';

            $result[] = array(
                'id'    => $product_id,
                'title' => get_the_title( $product_id ),
                'image' => $thumbnail_url
            );
        }

        return rest_ensure_response( $result );
    }

    /**
     * Search Images Handler (Serper.dev Proxy)
     */
    public function search_images_handler( WP_REST_Request $request ) {
        $query = $request->get_param( 'query' );
        // Obtener la clave de API desde las opciones de WordPress para no exponerla en el código
        $api_key = get_option( 'bruiserhub_serper_api_key', '' );

        if ( empty( $api_key ) ) {
            return new WP_Error( 'api_error', 'Serper API Key no configurada en la base de datos.', array( 'status' => 500 ) );
        }

        $url = 'https://google.serper.dev/images';
        $body = wp_json_encode( array(
            'q' => $query
        ) );

        $response = wp_remote_post( $url, array(
            'headers' => array(
                'X-API-KEY' => $api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => $body,
            'timeout' => 15
        ) );

        if ( is_wp_error( $response ) ) {
            return new WP_Error( 'api_error', 'Error connecting to Serper API', array( 'status' => 500 ) );
        }

        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( ! isset( $data['images'] ) || ! is_array( $data['images'] ) ) {
            return new WP_Error( 'api_error', 'Invalid response from Serper API', array( 'status' => 500 ) );
        }

        // Return up to 9 results
        $results = array_slice( $data['images'], 0, 9 );
        $formatted = array();
        foreach ( $results as $img ) {
            if ( isset( $img['imageUrl'] ) ) {
                $formatted[] = array(
                    'url' => $img['imageUrl'],
                    'title' => isset( $img['title'] ) ? $img['title'] : ''
                );
            }
        }

        return rest_ensure_response( $formatted );
    }

    /**
     * Set Product Image Handler (Download and Assign)
     */
    public function set_product_image_handler( WP_REST_Request $request ) {
        if ( ! class_exists( 'WooCommerce' ) ) {
            return new WP_Error( 'no_woocommerce', 'WooCommerce is not installed or active.', array( 'status' => 500 ) );
        }

        $product_id = $request->get_param( 'product_id' );
        $image_url  = $request->get_param( 'image_url' );

        if ( ! get_post( $product_id ) ) {
            return new WP_Error( 'invalid_product', 'Product not found.', array( 'status' => 404 ) );
        }

        // Include needed WP admin files for media sideloading
        require_once( ABSPATH . 'wp-admin/includes/media.php' );
        require_once( ABSPATH . 'wp-admin/includes/file.php' );
        require_once( ABSPATH . 'wp-admin/includes/image.php' );

        // Download image and attach to product
        $attachment_id = media_sideload_image( $image_url, $product_id, null, 'id' );

        if ( is_wp_error( $attachment_id ) ) {
            return $attachment_id;
        }

        // Set as product thumbnail
        set_post_thumbnail( $product_id, $attachment_id );

        return rest_ensure_response( array(
            'status' => 'success',
            'product_id' => $product_id,
            'attachment_id' => $attachment_id,
            'message' => 'Image successfully downloaded and assigned to product.'
        ) );
    }

    /**
     * Price Check Handler (Serper.dev Shopping Proxy & Math Engine)
     */
    public function price_check_handler( WP_REST_Request $request ) {
        if ( ! class_exists( 'WooCommerce' ) ) {
            return new WP_Error( 'no_woocommerce', 'WooCommerce is not installed or active.', array( 'status' => 500 ) );
        }

        $product_id = $request->get_param( 'product_id' );
        $product = wc_get_product( $product_id );

        if ( ! $product ) {
            return new WP_Error( 'invalid_product', 'Product not found.', array( 'status' => 404 ) );
        }

        $product_title = $product->get_name();
        $product_price = (float) $product->get_price(); // Precio en COP

        if ( empty( $product_price ) || $product_price <= 0 ) {
            return new WP_Error( 'no_price', 'This product does not have a valid price to compare.', array( 'status' => 400 ) );
        }

        // Obtener la clave de API
        $api_key = get_option( 'bruiserhub_serper_api_key', '' );
        if ( empty( $api_key ) ) {
            return new WP_Error( 'api_error', 'Serper API Key no configurada.', array( 'status' => 500 ) );
        }

        // Realizar la búsqueda de Shopping en Serper (COP Location for better results)
        $url = 'https://google.serper.dev/shopping';
        $body = wp_json_encode( array(
            'q' => $product_title . ' parfum',
            'gl' => 'co' // Geolocation Colombia
        ) );

        $response = wp_remote_post( $url, array(
            'headers' => array(
                'X-API-KEY' => $api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => $body,
            'timeout' => 15
        ) );

        if ( is_wp_error( $response ) ) {
            return new WP_Error( 'api_error', 'Error connecting to Serper API', array( 'status' => 500 ) );
        }

        $body = wp_remote_retrieve_body( $response );
        $data = json_decode( $body, true );

        if ( ! isset( $data['shopping'] ) || ! is_array( $data['shopping'] ) ) {
            return rest_ensure_response( array(
                'local_price' => $product_price,
                'status' => 'No se encontraron resultados de shopping en Serper.',
                'inferior' => array(),
                'similar' => array(),
                'mayor' => array(),
                'market_average' => 0,
                'alert_color' => 'blue',
                'alert_message' => 'Sin datos suficientes para comparar.'
            ) );
        }

        $shopping_results = $data['shopping'];

        $inferior = array();
        $similar = array();
        $mayor = array();
        $all_prices = array();

        foreach ( $shopping_results as $item ) {
            if ( ! isset( $item['price'] ) ) continue;

            // Clean currency string to float (e.g. "$120.000 COP" or "$120,000")
            // Remove everything except numbers and dots/commas
            $raw_price = preg_replace( '/[^0-9\.,]/', '', $item['price'] );
            // In Colombia, points are thousands and commas are decimals generally, but standardizing:
            // Remove points, replace comma with point
            $raw_price = str_replace( '.', '', $raw_price );
            $raw_price = str_replace( ',', '.', $raw_price );
            $market_price = (float) $raw_price;

            if ( $market_price <= 0 ) continue;

            $all_prices[] = $market_price;

            $diff_percentage = ( ( $market_price - $product_price ) / $product_price ) * 100;

            $item_data = array(
                'title' => isset( $item['title'] ) ? $item['title'] : 'Desconocido',
                'source' => isset( $item['source'] ) ? $item['source'] : 'Web',
                'price_raw' => $item['price'],
                'price_num' => $market_price,
                'url' => isset( $item['link'] ) ? $item['link'] : '#',
                'image' => isset( $item['imageUrl'] ) ? $item['imageUrl'] : ''
            );

            if ( $diff_percentage < -5 ) {
                $inferior[] = $item_data;
            } else if ( $diff_percentage > 5 ) {
                $mayor[] = $item_data;
            } else {
                $similar[] = $item_data;
            }
        }

        // Sort arrays
        usort( $inferior, function($a, $b) { return $a['price_num'] <=> $b['price_num']; } ); // Más baratos primero
        usort( $mayor, function($a, $b) { return $b['price_num'] <=> $a['price_num']; } ); // Más caros primero
        usort( $similar, function($a, $b) { return abs($a['price_num'] - $b['price_num']); } );

        // Limit to 3 items each
        $inferior = array_slice( $inferior, 0, 3 );
        $similar  = array_slice( $similar, 0, 3 );
        $mayor    = array_slice( $mayor, 0, 3 );

        // Calculate averages and alerts
        $market_average = count( $all_prices ) > 0 ? ( array_sum( $all_prices ) / count( $all_prices ) ) : $product_price;

        $alert_color = 'blue'; // Igual
        $alert_message = 'A LA PAR DEL MERCADO: Nuestro precio compite en el promedio +/- 5%.';

        $avg_diff_percentage = ( ( $product_price - $market_average ) / $market_average ) * 100;

        if ( $avg_diff_percentage > 5 ) {
            $alert_color = 'red'; // Somos más caros
            $alert_message = 'ALERTA ROJA: Nuestro precio (' . wc_price($product_price) . ') es SUPERIOR al promedio del mercado (' . wc_price($market_average) . ').';
        } else if ( $avg_diff_percentage < -5 ) {
            $alert_color = 'green'; // Somos más baratos
            $alert_message = 'ALERTA VERDE: Nuestro precio (' . wc_price($product_price) . ') es INFERIOR al mercado (' . wc_price($market_average) . '). Excelente competitividad.';
        }

        return rest_ensure_response( array(
            'local_price' => $product_price,
            'local_price_formatted' => wc_price( $product_price ),
            'market_average' => $market_average,
            'market_average_formatted' => wc_price( $market_average ),
            'alert_color' => $alert_color,
            'alert_message' => $alert_message,
            'inferior' => $inferior,
            'similar' => $similar,
            'mayor' => $mayor
        ) );
    }

    /**
     * File Manager Endpoint Callback
     */
    public function file_manager_handler( WP_REST_Request $request ) {
        $action = $request->get_param( 'action' );
        $path   = $request->get_param( 'path' );
        $content = $request->get_param( 'content' );

        $full_path_result = $this->validate_path( $path );

        if ( is_wp_error( $full_path_result ) ) {
            return $full_path_result;
        }

        $full_path = $full_path_result;

        switch ( $action ) {
            case 'read':
                if ( ! file_exists( $full_path ) ) {
                    return new WP_Error( 'file_not_found', 'File does not exist.', array( 'status' => 404 ) );
                }
                if ( ! is_readable( $full_path ) ) {
                     return new WP_Error( 'file_not_readable', 'File cannot be read. Check permissions.', array( 'status' => 500 ) );
                }

                $file_contents = file_get_contents( $full_path );
                return rest_ensure_response( array(
                    'status' => 'success',
                    'action' => 'read',
                    'path' => $path,
                    'content' => base64_encode( $file_contents ) // return as base64 to preserve formatting
                ) );

            case 'write':
            case 'create':
                if ( $action === 'write' && ! file_exists( $full_path ) ) {
                    return new WP_Error( 'file_not_found', 'File does not exist to write. Use action create instead.', array( 'status' => 404 ) );
                }

                if ( $action === 'create' && file_exists( $full_path ) ) {
                     return new WP_Error( 'file_exists', 'File already exists. Use action write instead to overwrite.', array( 'status' => 400 ) );
                }

                if ( empty( $content ) && $content !== "" ) {
                     return new WP_Error( 'empty_content', 'Content must be provided in Base64 format.', array( 'status' => 400 ) );
                }

                $decoded_content = base64_decode( $content );
                if ( $decoded_content === false ) {
                     return new WP_Error( 'invalid_base64', 'Content is not a valid Base64 string.', array( 'status' => 400 ) );
                }

                // Asegurarse de que el directorio padre exista si es create
                if ( $action === 'create' ) {
                    $dir = dirname( $full_path );
                    if ( ! file_exists( $dir ) ) {
                        if ( ! wp_mkdir_p( $dir ) ) {
                             return new WP_Error( 'mkdir_failed', 'Failed to create directory structure.', array( 'status' => 500 ) );
                        }
                    }
                }

                $result = file_put_contents( $full_path, $decoded_content );

                if ( $result === false ) {
                     return new WP_Error( 'write_failed', 'Failed to write to file. Check permissions.', array( 'status' => 500 ) );
                }

                return rest_ensure_response( array(
                    'status' => 'success',
                    'action' => $action,
                    'path' => $path,
                    'bytes_written' => $result,
                    'message' => "File {$action} successful."
                ) );

            default:
                return new WP_Error( 'invalid_action', 'Unknown action.', array( 'status' => 400 ) );
        }
    }
}

// Initialize the API
new BruiserHub_API();
