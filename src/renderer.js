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

// City Prompt Logic
window.adhanAPI.onOpenPrompt(() => {
    document.getElementById('city-prompt').style.display = 'flex';
    document.getElementById('city-input').value = '';
    document.getElementById('prompt-error').style.display = 'none';
    setTimeout(() => document.getElementById('city-input').focus(), 100);
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    document.getElementById('city-prompt').style.display = 'none';
    window.adhanAPI.closePrompt();
});

document.getElementById('btn-submit').addEventListener('click', async () => {
    const city = document.getElementById('city-input').value.trim();
    if (!city) return;
    
    document.getElementById('btn-submit').textContent = 'Recherche...';
    document.getElementById('btn-submit').disabled = true;
    
    const success = await window.adhanAPI.submitCity(city);
    
    document.getElementById('btn-submit').textContent = 'Valider';
    document.getElementById('btn-submit').disabled = false;
    
    if (success) {
        document.getElementById('city-prompt').style.display = 'none';
    } else {
        const err = document.getElementById('prompt-error');
        err.style.display = 'block';
        err.textContent = 'Ville introuvable. Essayez "Ville, Pays".';
    }
});

document.getElementById('city-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btn-submit').click();
    }
});
