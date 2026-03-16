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

    // When a product is selected
    const handleProductChange = (e) => {
        const productId = e.target.value;
        setSelectedProductId(productId);
        setImages([]);

        if (!productId) {
            setStatusMessage('');
            return;
        }

        const selectedProduct = products.find(p => String(p.id) === String(productId));
        if (!selectedProduct) return;

        setStatusMessage(`Buscando imágenes para "${selectedProduct.title} parfum"...`);
        setIsLoading(true);

        const query = `${selectedProduct.title} parfum`;

        fetch(`${bruiserhubData.root}bruiser/v1/search-images`, {
            method: 'POST',
            headers: {
                'X-WP-Nonce': bruiserhubData.nonce,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
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

    // When an image is clicked/selected
    const handleImageSelect = (imageUrl) => {
        if (!selectedProductId || isAssigning) return;

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
        createElement(
            'div',
            { className: 'image-search-bar' },
            createElement(
                'select',
                {
                    className: 'product-select-dropdown',
                    value: selectedProductId,
                    onChange: handleProductChange,
                    disabled: isLoading || isAssigning || products.length === 0
                },
                createElement('option', { value: '' }, products.length === 0 && isLoading ? 'Cargando productos...' : '-- Seleccione un Perfume --'),
                products.map(p => createElement('option', { key: p.id, value: p.id }, `${p.title} (ID: ${p.id})`))
            ),
            (statusMessage) && createElement('div', { className: 'search-status-message' }, statusMessage)
        ),
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
