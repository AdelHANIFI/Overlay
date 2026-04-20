let currentTimeout = null;

window.adhanAPI.onStateChange((data) => {
    const { state, theme } = data;
    const frame = document.getElementById('oriental-frame');
    
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }
    
    document.documentElement.setAttribute('data-theme', theme || 'classic');
    frame.className = 'frame';
    
    // Hack: Force un repaint immédiat pour éviter le lag d'affichage Chromium
    void frame.offsetWidth;
    
    if (state === 'active') {
        frame.classList.add('glow-active');
        
        currentTimeout = setTimeout(() => {
            if (frame.classList.contains('glow-active')) {
                frame.className = 'frame glow-idle';
            }
        }, 15000);
        
    } else if (state === 'urgent') {
        frame.classList.add('glow-urgent');
    } else if (state === 'warning') {
        frame.classList.add('glow-warning');
    } else {
        frame.classList.add('glow-idle');
    }
});
