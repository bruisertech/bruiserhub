/**
 * Bruiser Hub - Admin React Interface
 */
const { createElement, useState, useEffect } = wp.element;

function BruiserTerminal() {
    const [cursorVisible, setCursorVisible] = useState(true);

    // Blinking cursor effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible((prev) => !prev);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return createElement(
        'div',
        { className: 'bruiserhub-terminal-container' },
        createElement(
            'div',
            { className: 'bruiserhub-terminal-header' },
            createElement('span', { className: 'terminal-btn close' }),
            createElement('span', { className: 'terminal-btn minimize' }),
            createElement('span', { className: 'terminal-btn maximize' })
        ),
        createElement(
            'div',
            { className: 'bruiserhub-terminal-body' },
            createElement('span', { className: 'terminal-prompt' }, 'bruiser@lhparfum:~$ '),
            createElement(
                'span',
                {
                    className: 'terminal-cursor',
                    style: { opacity: cursorVisible ? 1 : 0 }
                },
                '█'
            )
        )
    );
}

// Render the app when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    const rootElement = document.getElementById('bruiserhub-react-root');
    if (rootElement) {
        wp.element.render(createElement(BruiserTerminal), rootElement);
    }
});
