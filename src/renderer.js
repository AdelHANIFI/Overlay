let currentTimeout = null;
let lastState = null;
let lastTheme = null;

window.adhanAPI.onStateChange((data) => {
    const { state, theme, force } = data;
    
    // Ignore duplicate 1-minute polling updates unless manually forced 
    if (!force && state === lastState && theme === lastTheme) {
        return;
    }
    
    lastState = state;
    lastTheme = theme;
    
    const frame = document.getElementById('oriental-frame');
    
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }
    
    document.documentElement.setAttribute('data-theme', theme || 'classic');
    
    if (state === 'normal') {
        frame.classList.add('fade-out');
        return;
    }

    frame.className = 'frame';
    
    // Hack: Force un repaint immédiat pour éviter le lag d'affichage Chromium
    void frame.offsetWidth;
    
    if (state === 'active') frame.classList.add('glow-active');
    else if (state === 'urgent') frame.classList.add('glow-urgent');
    else if (state === 'warning') frame.classList.add('glow-warning');

    // All states now disappear completely after 15 seconds!
    currentTimeout = setTimeout(() => {
        frame.classList.add('fade-out');
    }, 15000);
});
