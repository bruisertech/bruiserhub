/**
 * Bruiser Hub - Admin React Interface
 */
const { createElement, useState, useEffect, useRef } = wp.element;

function BruiserTerminal() {
    const [cursorVisible, setCursorVisible] = useState(true);
    const [history, setHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [terminalColor, setTerminalColor] = useState('#00ff00');
    const inputRef = useRef(null);
    const bodyRef = useRef(null);

    // Blinking cursor effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible((prev) => !prev);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom when history changes
    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [history]);

    const handleContainerClick = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleCommand = async (command) => {
        const lowerCmd = command.toLowerCase().trim();
        const args = lowerCmd.split(' ');
        const baseCmd = args[0];

        let response = '';

        if (baseCmd === 'help') {
            response = 'Available commands:\n' +
                       '  time    - Shows current server time\n' +
                       '  count   - Counts total WooCommerce products\n' +
                       '  color   - Changes terminal color (e.g. color red, color #00ff00)\n' +
                       '  clear   - Clears the terminal screen\n' +
                       '  ping    - Pings the server\n' +
                       '  whoami  - Displays current user context\n' +
                       '  status  - Shows system status\n' +
                       '  setkey  - Sets the Serper.dev API Key (Usage: setkey <api_key>)';
        } else if (baseCmd === 'ayuda') {
            response = 'Comandos disponibles:\n' +
                       '  hora    - Muestra la hora actual del servidor\n' +
                       '  cantidad- Cuenta el total de productos de WooCommerce\n' +
                       '  color   - Cambia el color de la terminal (ej: color red, color #00ff00)\n' +
                       '  limpiar - Limpia la pantalla de la terminal\n' +
                       '  ping    - Hace ping al servidor\n' +
                       '  quiensoy- Muestra el contexto del usuario actual\n' +
                       '  estado  - Muestra el estado del sistema\n' +
                       '  setkey  - Configura la API Key de Serper.dev (Uso: setkey <api_key>)';
        } else if (baseCmd === 'time' || baseCmd === 'hora') {
            response = new Date().toLocaleString();
        } else if (baseCmd === 'clear' || baseCmd === 'limpiar') {
            setHistory([]);
            return; // Exit early so we don't add the command to history after clearing
        } else if (baseCmd === 'ping') {
            response = 'PONG!';
        } else if (baseCmd === 'whoami' || baseCmd === 'quiensoy') {
            response = 'root (simulated) - BRUISER HUB Administrator';
        } else if (baseCmd === 'status' || baseCmd === 'estado') {
            response = 'System: Online\nAPI: Connected\nWooCommerce: Active\nSerper: Ready';
        } else if (baseCmd === 'color') {
            if (args[1]) {
                setTerminalColor(args[1]);
                response = `Terminal color set to ${args[1]}`;
            } else {
                response = 'Usage: color [color_name_or_hex]\nUso: color [nombre_o_hex]';
            }
        } else if (baseCmd === 'count' || baseCmd === 'cantidad') {
            // Async API Call
            setHistory((prev) => [
                ...prev,
                { type: 'command', text: command, color: terminalColor },
                { type: 'response', text: 'Counting products in WooCommerce database...' }
            ]);

            try {
                const res = await fetch(`${bruiserhubData.root}bruiser/v1/products`, {
                    headers: { 'X-WP-Nonce': bruiserhubData.nonce }
                });
                const data = await res.json();

                if (Array.isArray(data)) {
                    setHistory((prev) => [
                        ...prev,
                        { type: 'response', text: `Result: ${data.length} published products found.` }
                    ]);
                } else {
                    throw new Error('Invalid response');
                }
            } catch (err) {
                setHistory((prev) => [
                    ...prev,
                    { type: 'response', text: 'Error fetching products from database.' }
                ]);
            }
            return; // Handled asynchronously
        } else if (baseCmd === 'setkey') {
            if (args[1]) {
                setHistory((prev) => [
                    ...prev,
                    { type: 'command', text: command, color: terminalColor },
                    { type: 'response', text: 'Saving API Key to secure database...' }
                ]);

                try {
                    const res = await fetch(`${bruiserhubData.root}bruiser/v1/set-serper-key`, {
                        method: 'POST',
                        headers: {
                            'X-WP-Nonce': bruiserhubData.nonce,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ api_key: args[1] })
                    });
                    const data = await res.json();

                    if (data.status === 'success') {
                        setHistory((prev) => [
                            ...prev,
                            { type: 'response', text: `Success: ${data.message}` }
                        ]);
                    } else {
                        throw new Error(data.message || 'Error saving key');
                    }
                } catch (err) {
                    setHistory((prev) => [
                        ...prev,
                        { type: 'response', text: `Failed: ${err.message}` }
                    ]);
                }
                return;
            } else {
                response = 'Error: Missing API Key. Usage: setkey <api_key>';
            }
        } else {
            response = "type help for help in english, escribe ayuda para ayuda en español\ncontact developer WhatsApp: '573053862774";
        }

        setHistory((prev) => [
            ...prev,
            { type: 'command', text: command, color: terminalColor },
            { type: 'response', text: response, multiline: true }
        ]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const command = inputValue.trim();
            if (command) {
                handleCommand(command);
            } else {
                setHistory((prev) => [
                    ...prev,
                    { type: 'command', text: '', color: terminalColor }
                ]);
            }
            setInputValue('');
        }
    };

    return createElement(
        'div',
        { className: 'bruiserhub-terminal-container', onClick: handleContainerClick },
        createElement(
            'div',
            { className: 'bruiserhub-terminal-header' },
            createElement('span', { className: 'terminal-btn close' }),
            createElement('span', { className: 'terminal-btn minimize' }),
            createElement('span', { className: 'terminal-btn maximize' })
        ),
        createElement(
            'div',
            { className: 'bruiserhub-terminal-body', ref: bodyRef },
            // Render History
            history.map((item, index) => {
                if (item.type === 'command') {
                    return createElement(
                        'div',
                        { key: index, className: 'terminal-line' },
                        createElement('span', { className: 'terminal-prompt', style: { color: item.color || terminalColor } }, 'bruiser@lhparfum:~$ '),
                        createElement('span', { style: { color: item.color || terminalColor } }, item.text)
                    );
                } else {
                    return createElement(
                        'pre',
                        { key: index, className: 'terminal-response' },
                        item.text
                    );
                }
            }),
            // Current Input Line (True Mac Terminal style)
            createElement(
                'div',
                { className: 'terminal-line terminal-input-container', style: { color: terminalColor } },
                createElement('span', { className: 'terminal-prompt', style: { color: terminalColor } }, 'bruiser@lhparfum:~$ '),

                // Visible text span exactly followed by cursor
                createElement('span', { className: 'terminal-visible-text' }, inputValue),
                createElement(
                    'span',
                    {
                        className: 'terminal-cursor',
                        style: { opacity: cursorVisible ? 1 : 0, color: terminalColor }
                    },
                    '█'
                ),

                // Hidden invisible input taking the keystrokes over the whole line
                createElement('input', {
                    ref: inputRef,
                    type: 'text',
                    className: 'terminal-hidden-input',
                    value: inputValue,
                    onChange: (e) => setInputValue(e.target.value),
                    onKeyDown: handleKeyDown,
                    spellCheck: false,
                    autoComplete: "off"
                })
            )
        )
    );
}

function ImageSelector() {
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [images, setImages] = useState([]);
    const [statusMessage, setStatusMessage] = useState('Cargando productos de WooCommerce...');
    const [isLoading, setIsLoading] = useState(true);
    const [isAssigning, setIsAssigning] = useState(false);

    // Initial load: Fetch WooCommerce products
    useEffect(() => {
        fetch(`${bruiserhubData.root}bruiser/v1/products`, {
            headers: {
                'X-WP-Nonce': bruiserhubData.nonce
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code && data.message) {
                setStatusMessage('Error: ' + data.message);
                setIsLoading(false);
                return;
            }
            setProducts(data);
            setStatusMessage('');
            setIsLoading(false);
        })
        .catch(error => {
            setStatusMessage('Error cargando productos.');
            setIsLoading(false);
        });
    }, []);

    // Perform Search Action
    const doSearch = (queryStr) => {
        if (!queryStr.trim()) return;

        setImages([]);
        setStatusMessage(`Buscando imágenes para "${queryStr}"...`);
        setIsLoading(true);

        fetch(`${bruiserhubData.root}bruiser/v1/search-images`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': bruiserhubData.nonce,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: queryStr })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code && data.message) {
                setStatusMessage('Error: ' + data.message);
                setIsLoading(false);
                return;
            }
            if (!Array.isArray(data) || data.length === 0) {
                 setStatusMessage('No se encontraron imágenes en alta calidad.');
            } else {
                 setImages(data);
                 setStatusMessage('');
            }
            setIsLoading(false);
        })
        .catch(error => {
            setStatusMessage('Error buscando imágenes.');
            setIsLoading(false);
        });
    };

    // When a product is clicked from the list
    const handleProductSelect = (product) => {
        if (isAssigning) return;

        setSelectedProductId(product.id);
        const autoQuery = `${product.title} parfum`;
        setSearchTerm(autoQuery);
        doSearch(autoQuery);
    };

    // When an image is clicked/selected
    const handleImageSelect = (imageUrl) => {
        if (!selectedProductId || isAssigning) {
            alert("Por favor selecciona un producto de la lista primero.");
            return;
        }

        setIsAssigning(true);
        setStatusMessage('Descargando y asignando imagen a WooCommerce mágicamente...');

        fetch(`${bruiserhubData.root}bruiser/v1/set-product-image`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': bruiserhubData.nonce,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: parseInt(selectedProductId), image_url: imageUrl })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setStatusMessage('¡Imagen asignada con éxito al producto!');
                // Update local product image to reflect the change immediately
                setProducts(prevProducts => prevProducts.map(p => {
                    if (p.id === selectedProductId) {
                        return { ...p, image: imageUrl }; // Optimistic update
                    }
                    return p;
                }));
            } else {
                setStatusMessage('Error al asignar la imagen: ' + (data.message || 'Desconocido'));
            }
            setIsAssigning(false);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setStatusMessage('');
            }, 3000);
        })
        .catch(error => {
            setStatusMessage('Error fatal al asignar la imagen.');
            setIsAssigning(false);
        });
    };

    return createElement(
        'div',
        { className: 'bruiserhub-image-selector' },
        // LEFT PANEL (Search Box & Grid)
        createElement(
            'div',
            { className: 'selector-left-panel' },
            createElement(
                'div',
                { className: 'image-search-bar' },
                createElement('input', {
                    type: 'text',
                    className: 'image-search-input',
                    placeholder: 'Selecciona un producto o busca manualmente...',
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    onKeyDown: (e) => { if (e.key === 'Enter') doSearch(searchTerm); }
                }),
                createElement(
                    'button',
                    {
                        className: 'image-search-btn',
                        onClick: () => doSearch(searchTerm),
                        disabled: isLoading
                    },
                    isLoading ? '...' : 'Buscar'
                )
            ),
            (statusMessage) && createElement('div', { className: 'search-status-message' }, statusMessage),
            createElement(
                'div',
                { className: 'image-grid' },
                images.map((img, idx) =>
                    createElement(
                        'div',
                        { key: idx, className: 'image-card' },
                        createElement('img', { src: img.url, alt: img.title }),
                        createElement(
                            'button',
                            {
                                className: 'image-select-btn',
                                onClick: () => handleImageSelect(img.url),
                                disabled: isAssigning
                            },
                            isAssigning ? 'Asignando...' : 'Seleccionar'
                        )
                    )
                )
            )
        ),
        // RIGHT PANEL (Product List)
        createElement(
            'div',
            { className: 'selector-right-panel' },
            products.map((p) =>
                createElement(
                    'div',
                    {
                        key: p.id,
                        className: `product-list-item ${selectedProductId === p.id ? 'active' : ''}`,
                        onClick: () => handleProductSelect(p)
                    },
                    p.image
                        ? createElement('img', { src: p.image, className: 'product-list-item-img', alt: '' })
                        : createElement('div', { className: 'product-list-item-no-img' }, 'NO IMG'),
                    createElement('span', null, p.title)
                )
            )
        )
    );
}

function PriceComparator() {
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedProductData, setSelectedProductData] = useState(null);
    const [report, setReport] = useState(null);
    const [statusMessage, setStatusMessage] = useState('Cargando productos...');
    const [isLoading, setIsLoading] = useState(true);
    const [newPrice, setNewPrice] = useState('');
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

    // Initial load: Fetch WooCommerce products (Reusing the same endpoint)
    useEffect(() => {
        fetch(`${bruiserhubData.root}bruiser/v1/products`, {
            headers: { 'X-WP-Nonce': bruiserhubData.nonce }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code && data.message) {
                setStatusMessage('Error: ' + data.message);
                setIsLoading(false);
                return;
            }
            setProducts(data);
            setStatusMessage('');
            setIsLoading(false);
        })
        .catch(error => {
            setStatusMessage('Error cargando productos.');
            setIsLoading(false);
        });
    }, []);

    const handleProductSelect = (product) => {
        if (isLoading) return;

        setSelectedProductId(product.id);
        setSelectedProductData(product);
        setReport(null);
        setStatusMessage(`Analizando mercado para "${product.title}"...`);
        setIsLoading(true);

        fetch(`${bruiserhubData.root}bruiser/v1/price-check?product_id=${product.id}`, {
            method: 'GET',
            headers: { 'X-WP-Nonce': bruiserhubData.nonce }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code && data.message) {
                setStatusMessage('Error: ' + data.message);
                setIsLoading(false);
                return;
            }
            if (data.status) { // It's a string message when no results found
                setStatusMessage(data.status);
                setIsLoading(false);
                return;
            }

            setReport(data);
            setNewPrice(data.local_price); // Pre-fill current price
            setStatusMessage('');
            setIsLoading(false);
        })
        .catch(error => {
            setStatusMessage('Error al consultar el mercado.');
            setIsLoading(false);
        });
    };

    const handlePriceUpdate = () => {
        if (!selectedProductId || !newPrice) return;

        setIsUpdatingPrice(true);
        setStatusMessage('Actualizando precio en WooCommerce...');

        fetch(`${bruiserhubData.root}bruiser/v1/update-price`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': bruiserhubData.nonce,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_id: parseInt(selectedProductId), price: parseFloat(newPrice) })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                setStatusMessage('¡Precio actualizado con éxito! Recargando comparador...');
                // Refresh the report to show new local price and margins
                handleProductSelect(selectedProductData);
            } else {
                setStatusMessage('Error al actualizar: ' + (data.message || 'Desconocido'));
            }
            setIsUpdatingPrice(false);
        })
        .catch(error => {
            setStatusMessage('Error crítico al actualizar el precio.');
            setIsUpdatingPrice(false);
        });
    };

    const renderColumnItems = (items) => {
        if (!items || items.length === 0) return createElement('div', { className: 'price-comp-item' }, 'No hay resultados');
        return items.map((item, idx) =>
            createElement(
                'div',
                { key: idx, className: 'price-comp-item' },
                createElement('div', { className: 'price-comp-item-price' }, item.price_raw),
                createElement('div', { className: 'price-comp-item-source' }, item.source),
                createElement('a', { href: item.url, target: '_blank', rel: 'noopener noreferrer' }, 'Ver oferta →')
            )
        );
    };

    return createElement(
        'div',
        { className: 'price-comp-container' },
        // MAIN PANEL (Report)
        createElement(
            'div',
            { className: 'price-comp-main-panel' },
            (statusMessage) && createElement('div', { className: 'search-status-message' }, statusMessage),

            report && createElement(
                'div',
                null,
                // NUEVA CABECERA DE PRODUCTO
                createElement(
                    'div',
                    { className: 'price-comp-product-header', style: { display: 'flex', alignItems: 'center', background: '#2c2c2c', padding: '15px', borderRadius: '8px', marginBottom: '20px' } },
                    selectedProductData?.image ? createElement('img', { src: selectedProductData.image, style: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', marginRight: '20px' } }) : createElement('div', { style: { width: '80px', height: '80px', background: '#444', marginRight: '20px', borderRadius: '4px'} }),
                    createElement(
                        'div',
                        null,
                        createElement('h2', { style: { margin: '0 0 10px 0', color: '#fff' } }, selectedProductData?.title),
                        createElement('div', { style: { fontSize: '18px', color: '#00ff00', fontWeight: 'bold' } }, `Precio Actual: ${report.local_price_formatted.replace(/<[^>]*>?/gm, '')}`) // Strip HTML just in case
                    )
                ),
                // ALERTA
                createElement(
                    'div',
                    { className: `price-comp-alert ${report.alert_color}` },
                    report.alert_message
                ),
                // PANEL DE ACTUALIZACIÓN DE PRECIO WOOCOMMERCE
                createElement(
                    'div',
                    { className: 'price-comp-update-panel', style: { marginTop: '20px', padding: '15px', background: '#1e1e1e', borderRadius: '8px', borderLeft: '4px solid #00ff00' } },
                    createElement('h3', { style: { margin: '0 0 10px 0', color: '#fff' } }, 'Ajustar Precio Manualmente'),
                    createElement(
                        'div',
                        { style: { display: 'flex', gap: '10px' } },
                        createElement('input', {
                            type: 'number',
                            value: newPrice,
                            onChange: (e) => setNewPrice(e.target.value),
                            placeholder: 'Nuevo precio...',
                            style: { padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#333', color: '#fff', flex: '1' }
                        }),
                        createElement(
                            'button',
                            {
                                onClick: handlePriceUpdate,
                                disabled: isUpdatingPrice,
                                style: { padding: '8px 16px', background: '#00ff00', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }
                            },
                            isUpdatingPrice ? 'Guardando...' : 'Actualizar WooCommerce'
                        )
                    )
                ),
                createElement(
                    'div',
                    { className: 'price-comp-columns', style: { marginTop: '20px' } },
                    // Left Column (Inferior - Baratos)
                    createElement(
                        'div',
                        { className: 'price-comp-col inferior' },
                        createElement('h3', null, '🟢 Más Baratos'),
                        renderColumnItems(report.inferior)
                    ),
                    // Center Column (Similares - A la par)
                    createElement(
                        'div',
                        { className: 'price-comp-col similar' },
                        createElement('h3', null, '🟡 A la par (+/- 5%)'),
                        renderColumnItems(report.similar)
                    ),
                    // Right Column (Mayor - Caros)
                    createElement(
                        'div',
                        { className: 'price-comp-col mayor' },
                        createElement('h3', null, '🔴 Más Caros'),
                        renderColumnItems(report.mayor)
                    )
                )
            )
        ),
        // RIGHT PANEL (Product List - Cloned Structure)
        createElement(
            'div',
            { className: 'selector-right-panel' },
            products.map((p) =>
                createElement(
                    'div',
                    {
                        key: p.id,
                        className: `product-list-item ${selectedProductId === p.id ? 'active' : ''}`,
                        onClick: () => handleProductSelect(p)
                    },
                    p.image
                        ? createElement('img', { src: p.image, className: 'product-list-item-img', alt: '' })
                        : createElement('div', { className: 'product-list-item-no-img' }, 'NO IMG'),
                    createElement('span', null, p.title)
                )
            )
        )
    );
}

function BruiserHubApp() {
    const [activeTab, setActiveTab] = useState('terminal');

    return createElement(
        'div',
        null,
        createElement(
            'div',
            { className: 'bruiserhub-tabs' },
            createElement(
                'button',
                {
                    className: `bruiserhub-tab ${activeTab === 'terminal' ? 'active' : ''}`,
                    onClick: () => setActiveTab('terminal')
                },
                'Consola / Terminal'
            ),
            createElement(
                'button',
                {
                    className: `bruiserhub-tab ${activeTab === 'images' ? 'active' : ''}`,
                    onClick: () => setActiveTab('images')
                },
                'Buscador de Imágenes'
            ),
            createElement(
                'button',
                {
                    className: `bruiserhub-tab ${activeTab === 'prices' ? 'active' : ''}`,
                    onClick: () => setActiveTab('prices')
                },
                'Comparador de Precios'
            )
        ),
        activeTab === 'terminal' ? createElement(BruiserTerminal) : (activeTab === 'images' ? createElement(ImageSelector) : createElement(PriceComparator))
    );
}

// Render the app when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const rootElement = document.getElementById('bruiserhub-react-root');
    if (rootElement) {
        wp.element.render(createElement(BruiserHubApp), rootElement);
    }
});
