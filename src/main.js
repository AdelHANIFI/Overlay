const { app, BrowserWindow, screen, Tray, Menu, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const axios = require('axios');
const adhan = require('adhan');
const { autoUpdater } = require('electron-updater');

// Allow the app to have transparent click-through window smoothly
app.disableHardwareAcceleration();

const store = new Store();

let mainWindow;
let tray;

function createWindow() {
    const displays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    // Use the primary display work area or full bounds
    const bounds = primary.bounds;

    mainWindow = new BrowserWindow({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false // Fixes the lag/delay issue in transparent background overlays!
        }
    });

    // Make the window ignore all mouse events, passing them to windows under it.
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

async function getCoordinates() {
    let coords = store.get('coordinates');
    if (!coords || !coords.lat) {
        try {
            // Geolocation IP simple and fast
            const res = await axios.get('http://ip-api.com/json/');
            if (res.data && res.data.status === 'success') {
                coords = { lat: res.data.lat, lon: res.data.lon };
                store.set('coordinates', coords);
            } else {
                coords = { lat: 48.8566, lon: 2.3522 }; // Fallback Paris
            }
        } catch (e) {
            coords = { lat: 48.8566, lon: 2.3522 };
        }
    }
    return coords;
}

function calculateSubliminalState(coords) {
    const date = new Date();
    const coordinates = new adhan.Coordinates(coords.lat, coords.lon);
    const params = adhan.CalculationMethod.MuslimWorldLeague();
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);
    
    const now = date.getTime();
    
    // We need tomorrow's times for Isha calculations
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = new adhan.PrayerTimes(coordinates, tomorrow, params);

    const currentPrayer = prayerTimes.currentPrayer();
    
    let state = 'normal';
    let windowEndMs = null;
    let prayerStartTimeMs = null;

    if (currentPrayer !== adhan.Prayer.None && currentPrayer !== adhan.Prayer.Sunrise) {
        prayerStartTimeMs = prayerTimes.timeForPrayer(currentPrayer).getTime();
        
        switch (currentPrayer) {
            case adhan.Prayer.Fajr:
                windowEndMs = prayerTimes.timeForPrayer(adhan.Prayer.Sunrise).getTime();
                break;
            case adhan.Prayer.Dhuhr:
                windowEndMs = prayerTimes.timeForPrayer(adhan.Prayer.Asr).getTime();
                break;
            case adhan.Prayer.Asr:
                windowEndMs = prayerTimes.timeForPrayer(adhan.Prayer.Maghrib).getTime();
                break;
            case adhan.Prayer.Maghrib:
                windowEndMs = prayerTimes.timeForPrayer(adhan.Prayer.Isha).getTime();
                break;
            case adhan.Prayer.Isha:
                windowEndMs = tomorrowTimes.timeForPrayer(adhan.Prayer.Fajr).getTime();
                break;
        }

        const minsSinceStart = (now - prayerStartTimeMs) / 60000;
        const minsUntilEnd = (windowEndMs - now) / 60000;

        if (minsSinceStart >= 0 && minsSinceStart < 1) { 
            // L'heure pile vient de rentrer, on envoie le signal vert
            state = 'active';
        } else if (minsUntilEnd <= 10 && minsUntilEnd >= 0) {
            // Il ne reste que 10 min ou moins avant la FIN de plage (Rouge)
            state = 'urgent'; 
        } else if (minsUntilEnd <= 30 && minsUntilEnd > 10) {
            // Il reste moins de 30 min avant la FIN de la plage (Orange)
            state = 'warning'; 
        }
    } else {
        // Handles exact minute triggering when outside windows
        let nextP = prayerTimes.nextPrayer();
        if (nextP !== adhan.Prayer.None) {
            let nextPMs = prayerTimes.timeForPrayer(nextP).getTime();
            if (nextPMs - now <= 60000 && nextPMs - now >= 0) {
                state = 'active';
            }
        }
    }

    const currentTheme = store.get('theme') || 'classic';

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adhan-state', { state, theme: currentTheme });
    }

    updateTrayMenu(prayerTimes, tomorrowTimes, currentPrayer, windowEndMs, currentTheme);
}

function updateTrayMenu(prayerTimes, tomorrowTimes, currentPrayerStr, windowEndMs, currentTheme) {
    if (!tray) return;

    const names = {
        fajr: 'Fajr', sunrise: 'Chourouk', dhuhr: 'Dohr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha', none: 'Aucune'
    };

    let nextPStr = prayerTimes.nextPrayer();
    let nextPDate = null;
    if (nextPStr !== adhan.Prayer.None) {
        nextPDate = prayerTimes.timeForPrayer(nextPStr);
    } else {
        nextPDate = tomorrowTimes.timeForPrayer(adhan.Prayer.Fajr);
        nextPStr = adhan.Prayer.Fajr;
    }

    const formatTime = (d) => d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    let menuTemplate = [];

    if (windowEndMs && currentPrayerStr !== adhan.Prayer.Sunrise && currentPrayerStr !== adhan.Prayer.None) {
        let endDate = new Date(windowEndMs);
        let timeOrange = new Date(windowEndMs - 30 * 60000);
        let timeRouge = new Date(windowEndMs - 10 * 60000);

        menuTemplate = [
            { label: `=== Période Actuelle : ${names[currentPrayerStr]} ===`, enabled: false },
            { label: ` Fin du temps alloué : ${formatTime(endDate)}`, enabled: false },
            { label: ` Alerte Orange (-30m) : ${formatTime(timeOrange)}`, enabled: false },
            { label: ` Alerte Rouge  (-10m) : ${formatTime(timeRouge)}`, enabled: false },
            { type: 'separator' }
        ];
    } else {
        menuTemplate = [
            { label: `=== Attente / Hors Plage ===`, enabled: false },
            { type: 'separator' }
        ];
    }

    const changeTheme = (newTheme) => {
        store.set('theme', newTheme);
        // Force refresh state immediately
        getCoordinates().then((coords) => calculateSubliminalState(coords));
    };

    menuTemplate.push(
        { label: `Prochaine Prière: ${names[nextPStr]} à ${formatTime(nextPDate)}`, enabled: false },
        { type: 'separator' },
        {
            label: '🎨 Thème de Couleurs de Cadre',
            submenu: [
                { label: 'Classique (Vert, Orange, Rouge)', type: 'radio', checked: currentTheme === 'classic', click: () => changeTheme('classic') },
                { label: 'Océan Arctique (Cyan, Bleu Royal, Violet)', type: 'radio', checked: currentTheme === 'ocean', click: () => changeTheme('ocean') },
                { label: 'Désert Sahara (Or, Cuivre, Cerise)', type: 'radio', checked: currentTheme === 'sahara', click: () => changeTheme('sahara') },
                { label: 'Aurore Boréale (Emeraude, Safran, Magenta)', type: 'radio', checked: currentTheme === 'aurore', click: () => changeTheme('aurore') }
            ]
        },
        { type: 'separator' },
        { label: 'Relancer la Geolocalisation', click: () => { store.delete('coordinates'); getCoordinates(); } },
        { label: 'Ouvrir Debug', click: () => { if(mainWindow) mainWindow.webContents.openDevTools({ mode: 'detach' }); } },
        { type: 'separator' },
        { label: 'Test : Simuler Start (1ere phase)', click: () => { if(mainWindow) mainWindow.webContents.send('adhan-state', { state: 'active', theme: currentTheme }); } },
        { label: 'Test : Simuler Alerte (-30m)', click: () => { if(mainWindow) mainWindow.webContents.send('adhan-state', { state: 'warning', theme: currentTheme }); } },
        { label: 'Test : Simuler Urgence (-10m)', click: () => { if(mainWindow) mainWindow.webContents.send('adhan-state', { state: 'urgent', theme: currentTheme }); } },
        { label: 'Test : Simuler Normal (Cacher)', click: () => { if(mainWindow) mainWindow.webContents.send('adhan-state', { state: 'normal', theme: currentTheme }); } },
        { type: 'separator' },
        { label: '☕ Soutenir le développeur', click: () => { shell.openExternal('https://www.buymeacoffee.com/'); } },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' }
    );
    
    tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));

    if (windowEndMs && currentPrayerStr !== adhan.Prayer.Sunrise && currentPrayerStr !== adhan.Prayer.None) {
        tray.setToolTip(`Actuel: ${names[currentPrayerStr]} | Fin à ${formatTime(new Date(windowEndMs))}`);
    } else {
        tray.setToolTip(`Attente | Prochaine: ${names[nextPStr]} à ${formatTime(nextPDate)}`);
    }
}

app.whenReady().then(async () => {
    createWindow();
    
    // Create an elegant custom icon to sit in the System Tray
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
    tray = new Tray(icon);
    tray.setToolTip('Calcul des horaires en cours...');

    const coords = await getCoordinates();
    
    // Send state immediately
    calculateSubliminalState(coords);

    // Recheck every minute
    setInterval(() => {
        calculateSubliminalState(coords);
    }, 60000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Configuration de la Mise à Jour Automatique (OTA)
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();
        
        // Vérifier toutes les 6 heures si on laisse l'appli allumée H24
        setInterval(() => { autoUpdater.checkForUpdatesAndNotify(); }, 6 * 60 * 60 * 1000);
    }
    
    autoUpdater.on('update-available', () => {
        if (tray) tray.displayBalloon({ icon: icon, title: 'Adhan Overlay', content: 'Une mise à jour est disponible. Téléchargement discret en fond...' });
    });

    autoUpdater.on('update-downloaded', () => {
        if (tray) tray.displayBalloon({ icon: icon, title: 'Adhan Overlay', content: 'Nouvelle version prête ! Elle s\'installera automatiquement à la prochaine fermeture de l\'appli.' });
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
