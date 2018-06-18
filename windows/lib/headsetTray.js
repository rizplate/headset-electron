const debug = require('debug');
const { Menu } = require('electron');

const logger = debug('headset:tray');

const executeTrayCommand = (win, key) => {
  logger('Executing %o command from tray', key);
  win.webContents.executeJavaScript(`
    window.electronConnector.emit('${key}')
  `);
};

module.exports = (tray, win, player, i18n) => {
  logger('Setting tray');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: i18n.t('Minimize'),
      click: () => {
        logger('Minimizing to tray');
        win.isVisible() ? win.hide() : win.show();
        player.isVisible() ? player.hide() : player.show();
      },
    },
    { type: 'separator' },
    { label: i18n.t('Play/Pause'), click: () => { executeTrayCommand(win, 'play-pause'); } },
    { label: i18n.t('Next'), click: () => { executeTrayCommand(win, 'play-next'); } },
    { label: i18n.t('Previous'), click: () => { executeTrayCommand(win, 'play-previous'); } },
    { type: 'separator' },
    { label: i18n.t('Like'), click: () => { executeTrayCommand(win, 'like'); } },
    { type: 'separator' },
    { label: i18n.t('Exit'), role: 'quit' },
  ]);

  tray.setToolTip('Headset');
  tray.setContextMenu(contextMenu);
};
