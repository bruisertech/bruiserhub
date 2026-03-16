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
     * Confía en el sistema nativo de WordPress (Application Passwords / Basic Auth)
     * Verifica que el usuario que está realizando la petición sea el usuario 'user'
     */
    public function check_permissions( WP_REST_Request $request ) {
        // WordPress already verified the Application Password before reaching this point.
        // `is_user_logged_in()` will be true if Basic Auth was successful.
        if ( ! is_user_logged_in() ) {
            return new WP_Error( 'rest_not_logged_in', __( 'No estás autenticado.', 'bruiserhub' ), array( 'status' => 401 ) );
        }

        $current_user = wp_get_current_user();
        if ( $current_user->user_login !== 'user' ) {
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
