<?php
/**
 * Plugin Name: BRUISER HUB
 * Plugin URI: https://lhparfum.com
 * Description: REST API segura y consola de administración avanzada. Desarrollado para lhparfum.com.
 * Version: 1.0.0
 * Author: Daniel Contreras Herrera
 * Text Domain: bruiserhub
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Define plugin constants
define( 'BRUISERHUB_VERSION', '1.0.0' );
define( 'BRUISERHUB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BRUISERHUB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Include API routes
require_once BRUISERHUB_PLUGIN_DIR . 'includes/api-routes.php';

/**
 * Register Admin Menu
 */
function bruiserhub_register_admin_menu() {
    add_menu_page(
        'BRUISER HUB',
        '🔥 BRUISER HUB',
        'manage_options',
        'bruiserhub-console',
        'bruiserhub_admin_page_html',
        'data:image/svg+xml;base64,' . base64_encode('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C12 2 8 6 8 10C8 12.2091 9.79086 14 12 14C14.2091 14 16 12.2091 16 10C16 6 12 2 12 2Z" fill="#a0a5aa"/><path d="M15.5 8C17.5 10 19 12 19 15C19 18.866 15.866 22 12 22C8.13401 22 5 18.866 5 15C5 11 8 8 8 8C8 8 7 10 7 12C7 14 8 16 10 17C10 17 11 15 12 15C13 15 14 17 14 17C16 16 16.5 13 16.5 13C16.5 13 16 11 15.5 8Z" fill="#a0a5aa"/></svg>'),
        2
    );
}
add_action( 'admin_menu', 'bruiserhub_register_admin_menu' );

/**
 * Enqueue scripts and styles for the admin page
 */
function bruiserhub_admin_enqueue_scripts( $hook ) {
    if ( 'toplevel_page_bruiserhub-console' !== $hook ) {
        return;
    }

    wp_enqueue_style( 'wp-components' ); // Required for wp.components if we use them
    wp_enqueue_style( 'bruiserhub-admin-style', BRUISERHUB_PLUGIN_URL . 'assets/admin.css', array(), BRUISERHUB_VERSION );

    // Using wp-element which is WordPress's abstraction over React and ReactDOM
    wp_enqueue_script( 'bruiserhub-admin-script', BRUISERHUB_PLUGIN_URL . 'assets/admin.js', array( 'wp-element' ), BRUISERHUB_VERSION, true );

    // Localize script to pass nonce and API URL securely
    wp_localize_script( 'bruiserhub-admin-script', 'bruiserhubData', array(
        'root'  => esc_url_raw( rest_url() ),
        'nonce' => wp_create_nonce( 'wp_rest' )
    ) );
}
add_action( 'admin_enqueue_scripts', 'bruiserhub_admin_enqueue_scripts' );

/**
 * Render Admin Page HTML
 */
function bruiserhub_admin_page_html() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    // Nota: La API Key de Serper debe ser configurada manualmente por el administrador
    // en la base de datos (wp_options -> bruiserhub_serper_api_key) por razones de seguridad.
    ?>
    <div class="wrap bruiserhub-wrap">
        <pre class="bruiserhub-ascii">
                                                 )
   (                           *   )      (   ( /(
 ( )\ (     (  (       (  (  ` )  /((     )\  )\())
 )((_))(   ))\ )\ (   ))\ )(  ( )(_))\  (((_)((_)\
((_)_(()\ /((_|(_))\ /((_|()\(_(_()|(_) )\___ _((_)
 | _ )((_|_))( (_|(_|_))  ((_)_   _| __((/ __| || |
 | _ \ '_| || || (_-< -_)| '_| | | | _| | (__| __ |
 |___/_|  \_,_||_/__|___||_|   |_| |___| \___|_||_|
        </pre>
        <p><strong>Desarrollado por Daniel Contreras Herrera</strong></p>
        <p class="bruiserhub-subtitle">Consola de inyección remota de código puro base64 para wordpress, registrada y documentada 2015-2026</p>

        <!-- React App Container -->
        <div id="bruiserhub-react-root"></div>

        <!-- Footer / Credits -->
        <div class="bruiserhub-footer">
            <a href="https://instagram.com/bruiser.tech" target="_blank" rel="noopener noreferrer">bruiser tech developed</a>
        </div>
    </div>
    <?php
}
