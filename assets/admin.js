/**
 * Bruiser Hub - Admin React Interface
 */
const { createElement, useState, useEffect, useRef } = wp.element;

function BruiserTerminal() {
    const [cursorVisible, setCursorVisible] = useState(true);
    const [history, setHistory] = useState([]);
    const [inputValue, setInputValue] = useState('');
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            const command = inputValue.trim();
            if (command) {
                setHistory((prev) => [
                    ...prev,
                    { type: 'command', text: command },
                    { type: 'response', text: 'command not found, contact the coder on WhatsApp 3053862774' }
                ]);
            } else {
                setHistory((prev) => [
                    ...prev,
                    { type: 'command', text: '' }
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
                        createElement('span', { className: 'terminal-prompt' }, 'bruiser@lhparfum:~$ '),
                        createElement('span', null, item.text)
                    );
                } else {
                    return createElement(
                        'div',
                        { key: index, className: 'terminal-response' },
                        item.text
                    );
                }
            }),
            // Current Input Line
            createElement(
                'div',
                { className: 'terminal-line' },
                createElement('span', { className: 'terminal-prompt' }, 'bruiser@lhparfum:~$ '),
                createElement('input', {
                    ref: inputRef,
                    type: 'text',
                    className: 'terminal-input',
                    value: inputValue,
                    onChange: (e) => setInputValue(e.target.value),
                    onKeyDown: handleKeyDown,
                    spellCheck: false,
                    autoComplete: "off"
                }),
                createElement(
                    'span',
                    {
                        className: 'terminal-cursor',
                        style: { opacity: cursorVisible && !inputValue ? 1 : 0, marginLeft: '-1ch', pointerEvents: 'none' }
                    },
                    '█'
                )
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
                'Buscador de Imágenes (WooCommerce)'
            )
        ),
        activeTab === 'terminal' ? createElement(BruiserTerminal) : createElement(ImageSelector)
    );
}

// Render the app when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const rootElement = document.getElementById('bruiserhub-react-root');
    if (rootElement) {
        wp.element.render(createElement(BruiserHubApp), rootElement);
    }
});
