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
    const [searchTerm, setSearchTerm] = useState('');
    const [images, setImages] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        setIsSearching(true);

        // Simular búsqueda (Prototipo - En producción usarías una API real de Bing o similar)
        // Agregamos el término "parfum" al final como fue requerido
        const query = `${searchTerm.trim()} parfum`;

        setTimeout(() => {
            // Mock images representing Bing search results
            const mockResults = Array(9).fill(null).map((_, i) => ({
                id: i,
                url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/300/300`,
                title: `${query} result ${i + 1}`
            }));
            setImages(mockResults);
            setIsSearching(false);
        }, 1000);
    };

    return createElement(
        'div',
        { className: 'bruiserhub-image-selector' },
        createElement(
            'div',
            { className: 'image-search-bar' },
            createElement('input', {
                type: 'text',
                className: 'image-search-input',
                placeholder: 'Buscar nombre y marca del producto (auto-añade "parfum")...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                onKeyDown: (e) => { if (e.key === 'Enter') handleSearch(); }
            }),
            createElement(
                'button',
                { className: 'image-search-btn', onClick: handleSearch, disabled: isSearching },
                isSearching ? 'Buscando...' : 'Buscar Imágenes'
            )
        ),
        createElement(
            'div',
            { className: 'image-grid' },
            images.map((img) =>
                createElement(
                    'div',
                    { key: img.id, className: 'image-card' },
                    createElement('img', { src: img.url, alt: img.title }),
                    createElement(
                        'button',
                        {
                            className: 'image-select-btn',
                            onClick: () => alert(`Imagen seleccionada: ${img.title}\n(Aquí se integraría con el media library o WooCommerce)`)
                        },
                        'Seleccionar'
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
