const debug = require('debug');
const electron = require('electron');
const Positioner = require('electron-positioner');
const squirrel = require('electron-squirrel-startup');
const windowStateKeeper = require('electron-window-state');
const AutoUpdater = require('headset-autoupdater');
const path = require('path');
const { exec } = require('child_process');

const headsetTray = require('./lib/headsetTray');
const { version } = require('./package');

const logger = debug('headset');
const logPlayer2Win = debug('headset:player2Win');
const logWin2Player = debug('headset:win2Player');

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
} = electron;

let win;
let player;
let tray;

const isDev = (process.env.NODE_ENV === 'development');
logger('Running as developer: %o', isDev);

const shouldQuit = app.makeSingleInstance(() => {
  // Someone tried to run a second instance, we should focus our window.
  logger('Second instance of Headset found');
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

if (shouldQuit || squirrel) app.exit();

const start = () => {
  logger('Starting Headset');
  const mainWindowState = windowStateKeeper();

  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: 381,
    height: 696,
    resizable: false,
    title: 'Headset',
    maximizable: false,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, 'icons', 'Headset.ico'),
    frame: true,
  });

  mainWindowState.manage(win);

  if (isDev) {
    win.loadURL('http://127.0.0.1:3000');
  } else {
    win.loadURL('https://danielravina.github.io/headset/app/');
  }

  player = new BrowserWindow({
    width: 427,
    height: 300,
    minWidth: 430,
    minHeight: 310,
    title: 'Headset - Player',
    icon: path.join(__dirname, 'icons', 'Headset.ico'),
  });
  new Positioner(player).move('bottomCenter');

  new AutoUpdater();

  tray = new Tray(path.join(__dirname, 'icons', 'Headset.ico'));
  headsetTray(tray, win, player);

  win.webContents.on('did-finish-load', () => {
    logger('Main window finished loading');

    if (isDev) {
      player.loadURL('http://127.0.0.1:3001');
    } else {
      player.loadURL('http://danielravina.github.io/headset/player-v2');
    }

    win.webContents.executeJavaScript(`
      window.electronVersion = "v${version}"
    `);

    logger('Registering MediaKeys');
    globalShortcut.register('MediaPlayPause', () => {
      if (win === null) return;
      logger('Executing %o media key command', 'play-pause');
      win.webContents.executeJavaScript(`
        window.electronConnector.emit('play-pause')
      `);
    });

    globalShortcut.register('MediaNextTrack', () => {
      if (win === null) return;
      logger('Executing %o media key command', 'play-next');
      win.webContents.executeJavaScript(`
        window.electronConnector.emit('play-next')
      `);
    });

    globalShortcut.register('MediaPreviousTrack', () => {
      if (win === null) return;
      logger('Executing %o media key command', 'play-previous');
      win.webContents.executeJavaScript(`
        window.electronConnector.emit('play-previous')
      `);
    });

    if (isDev) {
      win.webContents.openDevTools();
    }
  }); // end win did-finish-load

  player.webContents.on('did-finish-load', () => {
    logger('Player window finished loading');
    win.focus();
  });

  player.on('close', (e) => {
    if (win) {
      logger('Attempted to close Player window while Headset running');
      e.preventDefault();
    } else {
      logger('Closing Player window and killing Headset');
      exec('taskkill /F /IM Headset.exe');
    }
  });

  win.on('close', () => {
    logger('Closing Headset');
    win = null;
    // after app closes in Win, the global shortcuts are still up, disabling it here.
    globalShortcut.unregisterAll();
    if (player === undefined) return;
    player.close();
  });

  win.on('restore', (e) => {
    e.preventDefault();
    win.show();
  });
}; // end start

app.on('activate', () => { win.show(); });
app.on('ready', start);

app.on('browser-window-created', (e, window) => {
  window.setMenu(null);
});
/*
 * This is the proxy between the 2 windows.
 * It receives messages from a renderer and send them to the other renderer
*/
ipcMain.on('win2Player', (e, args) => {
  logWin2Player('%O', args);

  player.webContents.send('win2Player', args);
});

ipcMain.on('player2Win', (e, args) => {
  logPlayer2Win('%o', args);

  try {
    win.webContents.send('player2Win', args);
  } catch (err) { /* window already closed */ }
});
