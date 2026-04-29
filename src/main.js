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
    let isManual = store.get('isManualLocation') === true;

    if (!coords || !coords.lat || !isManual) {
        try {
            // Geolocation IP simple and fast
            const res = await axios.get('http://ip-api.com/json/');
            if (res.data && res.data.status === 'success') {
                coords = { lat: res.data.lat, lon: res.data.lon };
                store.set('coordinates', coords);
                store.set('cityName', res.data.city);
                store.set('isManualLocation', false);
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

    // Méthode de calcul "Full Auto" (Calquée sur Mawaqit France / UOIF à 12°)
    const params = adhan.CalculationMethod.MuslimWorldLeague();
    params.fajrAngle = 12;
    params.ishaAngle = 12;

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

        if (minsSinceStart >= 0 && minsSinceStart < 5) {
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
            label: '🕒 Horaires du Jour',
            submenu: [
                { label: `Fajr : ${formatTime(prayerTimes.fajr)}`, enabled: false },
                { label: `Chourouk : ${formatTime(prayerTimes.sunrise)}`, enabled: false },
                { label: `Dohr : ${formatTime(prayerTimes.dhuhr)}`, enabled: false },
                { label: `Asr : ${formatTime(prayerTimes.asr)}`, enabled: false },
                { label: `Maghrib : ${formatTime(prayerTimes.maghrib)}`, enabled: false },
                { label: `Isha : ${formatTime(prayerTimes.isha)}`, enabled: false }
            ]
        },
        { type: 'separator' },
        {
            label: '🎨 Thème de Couleurs de Cadre',
            submenu: [
                { label: 'Classique (Vert, Orange, Rouge)', type: 'radio', checked: currentTheme === 'classic', click: () => changeTheme('classic') },
                { label: 'Océan Arctique (Cyan, Bleu Royal, Violet)', type: 'radio', checked: currentTheme === 'ocean', click: () => changeTheme('ocean') },
                { label: 'Désert Sahara (Or, Cuivre, Cerise)', type: 'radio', checked: currentTheme === 'sahara', click: () => changeTheme('sahara') },
                { label: 'Aurore Boréale (Emeraude, Safran, Magenta)', type: 'radio', checked: currentTheme === 'aurore', click: () => changeTheme('aurore') },
                { label: 'Oasis Lumineuse (Turquoise, Sable, Corail)', type: 'radio', checked: currentTheme === 'oasis', click: () => changeTheme('oasis') }
            ]
        },
        { type: 'separator' },
        { label: `📍 Ville Actuelle : ${store.get('cityName') || 'Automatique'}`, enabled: false },
        {
            label: '🔄 Forcer une autre ville ', click: () => {
                if (mainWindow) {
                    mainWindow.setIgnoreMouseEvents(false);
                    mainWindow.webContents.send('open-city-prompt');
                }
            }
        },
        {
            label: '🌎 Revenir à la géolocalisation IP', click: () => {
                store.delete('coordinates');
                store.delete('isManualLocation');
                store.delete('cityName');
                getCoordinates().then((coords) => calculateSubliminalState(coords));
            }
        },
        { type: 'separator' },
        {
            label: '👀 Tester les couleurs du thème',
            submenu: [
                { label: 'Simuler : Début de prière', click: () => { if (mainWindow) mainWindow.webContents.send('adhan-state', { state: 'active', theme: currentTheme, force: true }); } },
                { label: 'Simuler : Alerte (-30m)', click: () => { if (mainWindow) mainWindow.webContents.send('adhan-state', { state: 'warning', theme: currentTheme, force: true }); } },
                { label: 'Simuler : Urgence (-10m)', click: () => { if (mainWindow) mainWindow.webContents.send('adhan-state', { state: 'urgent', theme: currentTheme, force: true }); } },
                { type: 'separator' },
                { label: 'Cacher le cadre de test', click: () => { if (mainWindow) mainWindow.webContents.send('adhan-state', { state: 'normal', theme: currentTheme, force: true }); } }
            ]
        },
        { type: 'separator' },
        { label: '☕ Soutenir le développeur', click: () => { shell.openExternal('https://buymeacoffee.com/overlayprayers'); } },
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
    // Activer silencieusement le démarrage automatique de l'application au démarrage de Windows
    app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe')
    });

    createWindow();

    // Create an elegant custom icon to sit in the System Tray
    const iconPath = path.join(__dirname, 'icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
    tray = new Tray(icon);
    tray.setToolTip('Calcul des horaires en cours...');

    const coords = await getCoordinates();

    // IPC Listeners pour la localisation manuelle
    ipcMain.handle('submit-city', async (event, cityName) => {
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, {
                headers: { 'User-Agent': 'AdhanDesktopOverlay/1.0' }
            });

            if (res.data && res.data.length > 0) {
                const lat = parseFloat(res.data[0].lat);
                const lon = parseFloat(res.data[0].lon);
                const formattedName = res.data[0].display_name.split(',')[0];

                store.set('coordinates', { lat, lon });
                store.set('cityName', formattedName);
                store.set('isManualLocation', true);

                if (mainWindow) mainWindow.setIgnoreMouseEvents(true, { forward: true });

                getCoordinates().then((c) => calculateSubliminalState(c));
                return true;
            }
        } catch (e) {
            console.error("Geocoding error", e);
        }
        return false;
    });

    ipcMain.on('close-prompt', () => {
        if (mainWindow) mainWindow.setIgnoreMouseEvents(true, { forward: true });
    });

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
