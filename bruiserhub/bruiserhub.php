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
        'dashicons-terminal',
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
}
add_action( 'admin_enqueue_scripts', 'bruiserhub_admin_enqueue_scripts' );

/**
 * Render Admin Page HTML
 */
function bruiserhub_admin_page_html() {
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }
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

        <!-- React App Container -->
        <div id="bruiserhub-react-root"></div>
    </div>
    <?php
}
