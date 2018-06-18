const i18next = require('i18next');
const nodeRemoteBackend = require('i18next-node-remote-backend');

i18next
  .use(nodeRemoteBackend)
  .init({
    fallbackLng: 'en',
    ns: ['wrapper'],
    defaultNS: 'wrapper',
    debug: false,
    backend: {
      loadPath: 'https://raw.githubusercontent.com/headsetapp/headset-electron/locales/locales/{{ns}}/{{lng}}.json',
    },
  });

module.exports = i18next;
