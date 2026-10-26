// SPDX-License-Identifier: MPL-2.0
const query = new URLSearchParams(location.search);
const language = ['fr', 'en', 'ja'].includes(query.get('lang'))
  ? query.get('lang')
  : (navigator.language || 'fr').slice(0, 2);
const text =
  {
    fr: {
      title: 'On ouvre Samani ?',
      opening:
        'Samani va s’ouvrir si l’app est installée. Sinon, tu retrouveras Anime Sama dans ton navigateur.',
      app: 'Ouvrir Samani',
      web: 'Continuer sur le site',
      hint: 'Ton navigateur peut te demander d’autoriser l’ouverture de l’app.',
      invalid: 'Ce lien ne mène pas à Anime Sama.',
    },
    en: {
      title: 'Open Samani?',
      opening:
        'Samani will open if it’s installed. Otherwise, we’ll take you to Anime Sama in your browser.',
      app: 'Open Samani',
      web: 'Continue on the website',
      hint: 'Your browser may ask permission to open the app.',
      invalid: 'This link does not lead to Anime Sama.',
    },
    ja: {
      title: 'Samaniを開きますか？',
      opening:
        'インストール済みならSamaniを開きます。アプリがなければ、ブラウザーでAnime Samaに移動します。',
      app: 'Samaniを開く',
      web: 'サイトで続ける',
      hint: 'ブラウザーからアプリを開く許可を求められる場合があります。',
      invalid: 'Anime Samaへのリンクではありません。',
    },
  }[language] || null;
const t = text || {
  title: 'Open Samani?',
  opening: 'Opening Samani, or Anime Sama in your browser.',
  app: 'Open Samani',
  web: 'Continue on the website',
  hint: 'Your browser may ask permission to open the app.',
  invalid: 'Invalid Anime Sama link.',
};
document.documentElement.lang = text ? language : 'en';
document.querySelector('#title').textContent = t.title;
document.querySelector('#message').textContent = t.opening;
document.querySelector('#app').textContent = t.app;
document.querySelector('#web').textContent = t.web;
document.querySelector('#hint').textContent = t.hint;
// Official domains listed on anime-sama.pw; the app rewrites them to the user's chosen one.
const OFFICIAL_DOMAINS = [
  'anime-sama.si',
  'anime-sama.tv',
  'anime-sama.to',
  'anime-sama.org',
  'anime-sama.fr',
  'anime-sama.eu',
];
let target;
try {
  target = new URL(query.get('url'));
  if (
    target.protocol !== 'https:' ||
    !OFFICIAL_DOMAINS.includes(target.hostname.replace(/^www\./, '')) ||
    target.username ||
    target.password ||
    target.port
  )
    target = null;
} catch {}
if (!target) {
  document.querySelector('#message').textContent = t.invalid;
  document.querySelector('#app').hidden = true;
  // The portal always links to the domain currently in use.
  document.querySelector('#web').href = 'https://anime-sama.pw/';
} else {
  const params = new URLSearchParams({ url: target.href });
  const episode = query.get('episode');
  if (episode) params.set('episode', episode.slice(0, 160));
  const app = document.querySelector('#app'),
    web = document.querySelector('#web');
  app.href = 'anime-samani://open?' + params;
  web.href = target.href;
  let left = false,
    timer;
  const cancel = () => {
    left = true;
    clearTimeout(timer);
  };
  addEventListener('pagehide', cancel);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
  });
  const fallback = () => {
    if (!left && !document.hidden) {
      if (!document.hasFocus()) {
        timer = setTimeout(fallback, 500);
        return;
      }
      location.replace(target.href);
    }
  };
  const attempt = () => {
    left = false;
    clearTimeout(timer);
    timer = setTimeout(fallback, 4000);
  };
  app.addEventListener('click', attempt);
  web.addEventListener('click', () => clearTimeout(timer));
  attempt();
  location.href = app.href;
}
