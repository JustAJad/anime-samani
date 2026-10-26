// SPDX-License-Identifier: MPL-2.0
const api = window.samani;

// Constant local SVG icons avoid emoji rendering differences across Windows versions.
const iconPaths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
  catalogue: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  planning: 'M4 5h16v16H4zM8 2v6M16 2v6M4 10h16',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2',
  library:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
  back: 'm14 5-7 7 7 7M7 12h14',
  forward: 'm10 5 7 7-7 7M17 12H3',
  reload: 'M20 8a8 8 0 1 0 0 8M20 3v5h-5',
  browser: 'M14 3h7v7M21 3l-12 12M10 3H3v18h18v-7',
  cinema: 'M3 5h18v14H3zM8 22h8',
};
const svg = path =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
for (const button of document.querySelectorAll('.sidebar nav button')) {
  const name = button.dataset.route || button.dataset.panel;
  if (iconPaths[name]) button.querySelector('.nav-icon').innerHTML = svg(iconPaths[name]);
}
for (const button of document.querySelectorAll('.toolbar .icon-button')) {
  const name = button.dataset.action || button.dataset.panel;
  if (iconPaths[name]) button.innerHTML = svg(iconPaths[name]);
}

let state,
  activePanel = '',
  quickOpen = false,
  currentTab = 'general',
  initialized = false,
  toastTimer,
  pendingPatch = {},
  preferenceTimer;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let backgroundRetries = 0,
  backgroundRetryTimer;
let guideBusy = false,
  libraryKey = '',
  domainKey = '',
  updateKey = '',
  guideOpen = false,
  guideIndex = 0,
  transitionId = 0,
  previousFocus;
const guideSteps = ['Welcome', 'Browse', 'Library', 'Appearance', 'Discord', 'Watch', 'Updates'];
const t = key => state?.dictionary[key] || key;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($('#toast').hidden = true), 5000);
}
async function call(promise) {
  try {
    return await promise;
  } catch (error) {
    // Electron prefixes errors from the main process; only the message is for the user.
    const message = String(error.message || '').replace(
      /^Error invoking remote method '[^']+': (?:Error: )?/,
      ''
    );
    toast(message || t('problem'));
  }
}
function translate() {
  document.documentElement.lang = state.preferences.language;
  $$('[data-i18n]').forEach(element => (element.textContent = t(element.dataset.i18n)));
  $$('[data-title]').forEach(element => {
    element.title = t(element.dataset.title);
    element.setAttribute('aria-label', t(element.dataset.title));
  });
  $$('.sidebar nav button').forEach(button => {
    button.title = t(button.dataset.route || button.dataset.panel);
    button.setAttribute('aria-label', button.title);
  });
  $$('.sidebar .brand').forEach(button => (button.title = 'Anime Samani'));
  $('#quick-button').title = t('quick') + ' · Ctrl+K';
  $('#quick-input').closest('[role=dialog]').setAttribute('aria-label', t('quick'));
  $('#guide-language').setAttribute('aria-label', t('language'));
  $$('[data-placeholder]').forEach(
    element => (element.placeholder = t(element.dataset.placeholder))
  );
}
function media() {
  const p = state.preferences,
    root = document.documentElement.style;
  for (const [key, value] of Object.entries({
    '--a': p.colorA,
    '--b': p.colorB,
    '--angle': p.angle + 'deg',
    '--surface': p.surface / 100,
    '--blur': p.blur + 'px',
    '--brightness': p.brightness / 100,
  }))
    root.setProperty(key, value);
  const gradient = $('#gradient-wall');
  gradient.style.background =
    p.background === 'solid'
      ? '#0b0c10'
      : `linear-gradient(${p.angle}deg,${p.colorA}23,${p.colorB}15),#0b0c10`;
  const image = $('#image-wall'),
    video = $('#video-wall');
  image.hidden = p.background !== 'image' || !state.mediaUrl;
  video.hidden = p.background !== 'video' || !state.mediaUrl;
  if (!image.hidden && image.getAttribute('src') !== state.mediaUrl) image.src = state.mediaUrl;
  if (!video.hidden && video.getAttribute('src') !== state.mediaUrl) {
    clearTimeout(backgroundRetryTimer);
    backgroundRetries = 0;
    video.src = state.mediaUrl;
    video.load();
  }
  syncBackground();
  document.body.classList.toggle('reduce-motion', p.reducedMotion);
}
function backgroundShouldPlay() {
  return (
    state &&
    state.preferences.background === 'video' &&
    Boolean(state.mediaUrl) &&
    !state.preferences.reducedMotion &&
    !(state.preferences.pauseBackground && state.page.playing)
  );
}
function syncBackground() {
  const video = $('#video-wall');
  if (!backgroundShouldPlay()) {
    if (!video.paused) video.pause();
    return;
  }
  if (video.paused && !video.error)
    video
      .play()
      .then(() => {
        if (!backgroundShouldPlay()) video.pause();
      })
      .catch(() => {});
}
function animate(element, kind = 'in') {
  if (state?.preferences.reducedMotion || !element) return Promise.resolve();
  return element
    .animate(
      kind === 'out'
        ? [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(8px)' },
          ]
        : [
            { opacity: 0, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
      { duration: kind === 'out' ? 130 : 240, easing: 'cubic-bezier(.2,.8,.2,1)' }
    )
    .finished.catch(() => {});
}
function reveal(element, visible) {
  if (element.hidden === !visible) return;
  element.hidden = !visible;
  if (visible) animate(element);
}
function preferences() {
  $$('[data-pref]').forEach(input => {
    const value = state.preferences[input.dataset.pref];
    if (input.type === 'checkbox') input.checked = value;
    else if (document.activeElement !== input) input.value = value;
  });
  $$('[data-output]').forEach(output => {
    const key = output.dataset.output;
    output.textContent =
      state.preferences[key] + (key === 'angle' ? '°' : key === 'blur' ? ' px' : '%');
  });
  $$('[data-preset]').forEach(button =>
    button.classList.toggle(
      'active',
      Object.entries(state.presets[button.dataset.preset]).every(
        ([key, value]) => state.preferences[key] === value
      )
    )
  );
  $$('[data-background]').forEach(button =>
    button.classList.toggle('active', button.dataset.background === state.preferences.background)
  );
  const statusKeys = {
    disabled: 'rpcDisabled',
    unconfigured: 'rpcUnconfigured',
    connecting: 'rpcConnecting',
    unavailable: 'rpcUnavailable',
    connected: 'rpcConnected',
    error: 'rpcError',
  };
  const rpcText = t(statusKeys[state.rpcStatus] || 'rpcDisabled');
  $('#rpc-status').textContent = rpcText;
  $('#rpc-sidebar-status').textContent = rpcText;
  $('#rpc-pill').title = rpcText;
  $('#rpc-dot').classList.toggle('connected', state.rpcStatus === 'connected');
  const p = state.preferences,
    page = state.page,
    values = {
      title: p.rpcShowTitle ? page.title : 'Anime Samani',
      episode: p.rpcShowEpisode ? page.episode : '',
      season: p.rpcShowEpisode ? page.season : '',
      language: page.language,
    };
  $('#rpc-preview-title').textContent =
    page.playing || page.duration > 0 || page.hasPlayback ? values.title : t('browsing');
  $('#rpc-preview-state').textContent = [
    page.playing
      ? t('playing')
      : page.duration > 0 || page.hasPlayback
        ? t('paused')
        : t('browsing'),
    values.season,
    values.episode,
  ]
    .filter(Boolean)
    .join(' · ');
  const small = $('#rpc-preview-icon');
  small.hidden = !(page.playing || page.duration > 0 || page.hasPlayback);
  small.src = '../assets/branding/rpc-' + (page.playing ? 'play' : 'pause') + '.png';
}
function library() {
  const fingerprint = JSON.stringify([state.favorites, state.recent, state.preferences.language]);
  if (fingerprint === libraryKey) return;
  libraryKey = fingerprint;
  const resume = state.recent.find(item => item.episode),
    banner = $('#resume-episode');
  banner.hidden = !resume;
  if (resume) {
    const image = $('#resume-image');
    image.src = resume.image || coverUrl(resume.url);
    image.onerror = () => {
      image.hidden = true;
    };
    image.hidden = false;
    $('#resume-title').textContent = resume.title;
    $('#resume-detail').textContent = [resume.season, resume.episode].filter(Boolean).join(' · ');
    banner.setAttribute('aria-label', t('resume') + ' · ' + resume.title);
  }
  for (const [key, items] of [
    ['favorites', state.favorites],
    ['recent', state.recent],
  ]) {
    const container = $(`#${key}-list`);
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = t(key === 'favorites' ? 'noFavorites' : 'noRecent');
      container.append(empty);
    }
    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'library-card';
      const image = document.createElement('img');
      image.className = 'library-cover';
      image.alt = '';
      image.loading = 'lazy';
      image.src = item.image || coverUrl(item.url);
      image.onerror = () => (image.hidden = true);
      const copy = document.createElement('div');
      copy.className = 'library-copy';
      const title = document.createElement('h3');
      title.textContent = item.title;
      title.title = item.title;
      const detail = document.createElement('p');
      detail.textContent = item.episode || t('anime');
      const open = document.createElement('button');
      open.textContent = t('open');
      open.onclick = () => navigate(item.url);
      copy.append(title, detail, open);
      card.append(image, copy);
      if (key === 'favorites') {
        const remove = document.createElement('button');
        remove.className = 'icon-button remove-favorite';
        remove.textContent = '×';
        remove.title = t('remove');
        remove.setAttribute('aria-label', t('remove') + ' · ' + item.title);
        remove.onclick = () => call(api.library('favorite', item.url));
        card.append(remove);
      }
      container.append(card);
    }
  }
  $('#favorite-count').textContent = state.favorites.length;
}
function coverUrl(url) {
  try {
    const slug = new URL(url).pathname.split('/').filter(Boolean)[1];
    return slug
      ? 'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/' +
          encodeURIComponent(slug) +
          '.jpg'
      : '';
  } catch {
    return '';
  }
}
function panels() {
  if (activePanel || guideOpen)
    $$('[data-route]').forEach(button => button.classList.remove('active'));
  for (const name of ['library', 'settings', 'about'])
    reveal($(`#${name}-panel`), activePanel === name);
  $('#error-panel').hidden = !state.error || Boolean(activePanel);
  $('#site-slot').style.visibility = state.error || activePanel ? 'hidden' : 'visible';
  $$('[data-panel]').forEach(button =>
    button.classList.toggle('active', button.dataset.panel === activePanel)
  );
  $$('[data-tab]').forEach(button =>
    button.classList.toggle('active', button.dataset.tab === currentTab)
  );
  for (const name of ['general', 'appearance', 'desktop', 'discord', 'updates'])
    reveal($(`#${name}-tab`), currentTab === name);
  if (state.error?.kind === 'domain') {
    $('#error-code').textContent = `${t('domainMoved')} → ${state.error.code}`;
  } else if (state.error) {
    $('#error-code').textContent =
      `${state.error.kind === 'http' ? 'HTTP' : t('network')} ${state.error.code}`;
  }
  $('#error-domain').hidden = state.error?.kind !== 'domain';
  reportBounds();
}
function render(next) {
  state = next;
  if (activePanel && state.panel === false && !quickOpen && !guideOpen) activePanel = '';
  translate();
  media();
  preferences();
  library();
  domains();
  panels();
  $('#version').textContent = state.displayVersion;
  document.body.classList.toggle('sidebar-collapsed', state.preferences.sidebarCollapsed);
  $('#sidebar-toggle').setAttribute('aria-expanded', String(!state.preferences.sidebarCollapsed));
  const updateKeys = {
    unsupported: 'updateUnsupported',
    checking: 'updateChecking',
    available: 'updateAvailable',
    downloading: 'updateDownloading',
    downloaded: 'updateDownloaded',
    current: 'updateCurrent',
    error: 'updateError',
  };
  const nextUpdateKey = state.update?.status;
  const busy = ['checking', 'downloading'].includes(nextUpdateKey);
  $('#update-spinner').hidden = !busy;
  $('#check-update').disabled = busy || nextUpdateKey === 'unsupported';
  $('#download-update').disabled = busy;
  $('#update-feedback').setAttribute('aria-busy', String(busy));
  if (updateKey !== nextUpdateKey) {
    updateKey = nextUpdateKey;
    animate($('#update-status'));
  }
  $('#update-status').textContent =
    t(updateKeys[state.update?.status] || 'updateIdle') +
    (state.update?.percent ? ' ' + state.update.percent + '%' : '');
  $('#download-update').hidden = state.update?.status !== 'available';
  $('#install-update').hidden = state.update?.status !== 'downloaded';
  const cover = document.querySelector('.presence-preview img');
  cover.onerror = () => {
    cover.onerror = null;
    cover.src = '../assets/branding/app-mark.png';
  };
  cover.src =
    (state.page.playing || state.page.duration > 0) &&
    state.preferences.rpcShowTitle &&
    state.page.image
      ? state.page.image
      : '../assets/branding/app-mark.png';
  $('#page-title').textContent = state.page.title || state.domain;
  $('#page-status').textContent = state.error
    ? t('errorTitle')
    : state.loading
      ? t('loading')
      : t('ready');
  $('#play-status').textContent = state.page.playing ? '● ' + t('nowPlaying') : '';
  $('#progress').classList.toggle('loading', state.loading && !state.error);
  const showId = state.page.url.split('/').filter(Boolean)[3];
  const favorite = state.favorites.some(item => item.id === showId);
  $('#favorite-button').hidden = !state.canFavorite || Boolean(activePanel) || guideOpen;
  $('#favorite-button').textContent = favorite ? '★' : '☆';
  $('#favorite-button').classList.toggle('active', favorite);
  $('#favorite-button').title = t(favorite ? 'favorited' : 'favorite');
  $('#favorite-button').setAttribute('aria-label', t(favorite ? 'favorited' : 'favorite'));
  $('#cinema-control').hidden = !state.canCinema || Boolean(activePanel) || guideOpen;
  document.body.classList.toggle('cinema', state.cinema);
  let path = '';
  try {
    path = new URL(state.page.url).pathname;
  } catch {}
  $$('[data-route]').forEach(button =>
    button.classList.toggle(
      'active',
      !activePanel &&
        !guideOpen &&
        (button.dataset.route === 'home'
          ? path === '/'
          : path.startsWith(
              { catalogue: '/catalogue', planning: '/planning', profile: '/profil' }[
                button.dataset.route
              ]
            ))
    )
  );
  if (quickOpen) quickResults();
  if (guideOpen) renderGuide();
  if (!initialized) {
    initialized = true;
    intro();
  }
  requestAnimationFrame(reportBounds);
}
function reportBounds() {
  const rect = $('#site-slot').getBoundingClientRect();
  api.bounds({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
}
async function setPanel(name = '') {
  const id = ++transitionId;
  if (activePanel && activePanel !== name) await animate($(`#${activePanel}-panel`), 'out');
  if (id !== transitionId) return;
  activePanel = name;
  quickOpen = false;
  $('#quick-overlay').hidden = true;
  await call(api.panel(Boolean(name) || guideOpen));
  panels();
  if (name === 'library') library();
  $('#favorite-button').hidden = !state.canFavorite || Boolean(name);
  $('#cinema-control').hidden = !state.canCinema || Boolean(name);
}
async function navigate(route) {
  await setPanel('');
  await call(api.navigate(route));
}
async function patch(value) {
  const next = await call(api.preferences(value));
  if (next) render(next);
}
function queuePatch(key, value) {
  pendingPatch[key] = value;
  clearTimeout(preferenceTimer);
  preferenceTimer = setTimeout(() => {
    const value = pendingPatch;
    pendingPatch = {};
    patch(value);
  }, 130);
}
function quickResults() {
  const search = $('#quick-input').value.toLocaleLowerCase(state.preferences.language);
  const routes = ['home', 'catalogue', 'planning', 'profile', 'library', 'settings'];
  const entries = [
    ...routes.map(route => ({ title: t(route), route })),
    ...state.favorites.map(item => ({ title: item.title, route: item.url })),
    ...state.recent.slice(0, 8).map(item => ({ title: item.title, route: item.url })),
  ];
  const container = $('#quick-results');
  container.replaceChildren();
  const unique = [...new Map(entries.map(entry => [entry.route, entry])).values()];
  for (const entry of unique
    .filter(item => item.title.toLocaleLowerCase(state.preferences.language).includes(search))
    .slice(0, 9)) {
    const button = document.createElement('button');
    button.className = 'quick-result';
    button.textContent = entry.title;
    button.onclick = () =>
      entry.route === 'library' || entry.route === 'settings'
        ? setPanel(entry.route)
        : navigate(entry.route);
    container.append(button);
  }
}
async function showQuick() {
  if (guideOpen) return;
  previousFocus = document.activeElement;
  quickOpen = true;
  await call(api.panel(true));
  reveal($('#quick-overlay'), true);
  $('#quick-input').value = '';
  quickResults();
  $('#quick-input').focus();
}
async function closeQuick() {
  await animate($('.quick-dialog'), 'out');
  quickOpen = false;
  $('#quick-overlay').hidden = true;
  await call(api.panel(Boolean(activePanel)));
  reportBounds();
  previousFocus?.focus();
}
function intro() {
  const element = $('#intro');
  if (!state.preferences.intro) {
    element.hidden = true;
    api.action('intro-done');
    if (state.needsGuide) openGuide();
    return;
  }
  const end = () => {
    element.classList.add('leaving');
    setTimeout(
      () => {
        element.hidden = true;
        api.action('intro-done');
        if (state.needsGuide) openGuide();
      },
      state.preferences.reducedMotion ? 0 : 450
    );
  };
  setTimeout(end, state.preferences.intro ? (state.preferences.reducedMotion ? 180 : 1600) : 0);
}
$$('[data-route]').forEach(button => (button.onclick = () => navigate(button.dataset.route)));
$$('[data-panel]').forEach(
  button =>
    (button.onclick = () =>
      button.dataset.panel === 'quick' ? showQuick() : setPanel(button.dataset.panel))
);
$$('.close-panel').forEach(button => (button.onclick = () => setPanel('')));
$$('[data-action]').forEach(
  button =>
    (button.onclick = () =>
      button.dataset.action === 'home' ? navigate('home') : call(api.action(button.dataset.action)))
);
$$('[data-tab]').forEach(
  button =>
    (button.onclick = () => {
      currentTab = button.dataset.tab;
      panels();
    })
);
$$('[data-pref]').forEach(input =>
  input.addEventListener('input', () => {
    const value =
      input.type === 'checkbox'
        ? input.checked
        : input.type === 'range'
          ? Number(input.value)
          : input.value;
    queuePatch(input.dataset.pref, value);
  })
);
$$('[data-preset]').forEach(
  button =>
    (button.onclick = () =>
      patch({ theme: button.dataset.preset, ...state.presets[button.dataset.preset] }))
);
$$('[data-background]').forEach(
  button => (button.onclick = () => patch({ background: button.dataset.background }))
);
$('#choose-image').onclick = () => call(api.media('image'));
$('#choose-video').onclick = () => call(api.media('video'));
$('#favorite-button').onclick = () => call(api.library('favorite'));
$('#clear-recent').onclick = () => call(api.library('clear-recent'));
$('#quick-button').onclick = showQuick;
$('#close-quick').onclick = closeQuick;
$('#quick-input').oninput = quickResults;
$('#quick-input').onkeydown = event => {
  if (event.key === 'Enter') $('#quick-results button')?.click();
};
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (guideOpen) {
      finishGuide();
      return;
    }
    if (quickOpen) closeQuick();
    else if (activePanel) setPanel('');
  }
});
document.addEventListener('visibilitychange', () => state && media());
$('#video-wall').addEventListener('error', () => {
  const video = $('#video-wall');
  if (video.hidden || video.getAttribute('src') !== state.mediaUrl || video.error?.code === 1)
    return;
  if (video.error?.code === 2 && backgroundRetries < 2) {
    const source = state.mediaUrl,
      time = video.currentTime;
    backgroundRetries++;
    clearTimeout(backgroundRetryTimer);
    backgroundRetryTimer = setTimeout(() => {
      if (state.mediaUrl !== source) return;
      video.addEventListener(
        'loadedmetadata',
        () => {
          if (Number.isFinite(time) && time > 0)
            video.currentTime = Math.min(time, video.duration || time);
          syncBackground();
        },
        { once: true }
      );
      video.load();
    }, backgroundRetries * 350);
    return;
  }
  toast(t('backgroundError'));
});
new ResizeObserver(reportBounds).observe($('#site-slot'));
api.onState(render);
api.onCommand(command =>
  command === 'quick' ? showQuick() : command === 'sidebar' ? toggleSidebar() : setPanel(command)
);
call(api.bootstrap()).then(next => {
  if (next) render(next);
});

$('#check-update').onclick = () => call(api.update('check'));
$('#scan-domains').onclick = () => call(api.domains());
$('#apply-domain').onclick = () => setDomain($('#domain-input').value);
$('#domain-input').onkeydown = event => {
  if (event.key === 'Enter') setDomain($('#domain-input').value);
};
$('#error-domain').onclick = () => setDomain(state.error?.code);
$('#download-update').onclick = () => call(api.update('download'));
$('#install-update').onclick = () => call(api.update('install'));

$('#resume-episode').onclick = () => navigate('resume');

const domainStatusKeys = {
  online: 'domainOnline',
  redirect: 'domainRedirect',
  offline: 'domainOffline',
  unknown: 'domainUnknown',
};
async function setDomain(value) {
  const next = await call(api.domain(value));
  if (next) $('#domain-input').value = next.domain;
}
function domainOption({ domain, status }, official) {
  const button = document.createElement('button');
  button.className = 'domain-option';
  button.classList.toggle('active', domain === state.domain);
  button.setAttribute('aria-pressed', String(domain === state.domain));
  const name = document.createElement('span');
  name.className = 'domain-name';
  name.textContent = domain;
  button.append(name);
  if (domain === official) {
    const tag = document.createElement('small');
    tag.textContent = t('domainOfficial');
    button.append(tag);
  }
  const badge = document.createElement('span');
  badge.className = `status-badge domain-${status}`;
  badge.textContent = t(domainStatusKeys[status] || 'domainUnknown');
  button.append(badge);
  button.onclick = () => setDomain(domain);
  const item = document.createElement('li');
  item.append(button);
  return item;
}
function domains() {
  const scan = state.domainScan;
  $('#domain-current').textContent = state.domain;
  const input = $('#domain-input');
  if (document.activeElement !== input) input.value = state.domain;
  $('#scan-domains').disabled = state.domainScanning;
  $('#domain-scan-status').textContent = state.domainScanning
    ? t('domainScanning')
    : state.domainScanError
      ? t('domainScanError')
      : scan
        ? `${t('domainLastScan')} ${new Date(scan.ts).toLocaleString(state.preferences.language)}`
        : '';
  const suggested = scan?.results?.find(
    result => result.domain === scan.official && ['online', 'redirect'].includes(result.status)
  )?.domain;
  const showSuggestion = Boolean(suggested && suggested !== state.domain);
  $('#domain-suggestion').textContent = showSuggestion
    ? `${t('domainSuggested')} ${suggested}`
    : '';
  $('#use-suggested-domain').hidden = !showSuggestion;
  $('#use-suggested-domain').onclick = () => setDomain(suggested);
  const key = JSON.stringify([scan?.ts, state.domain, state.preferences.language]);
  if (key === domainKey) return;
  domainKey = key;
  $('#domain-list').replaceChildren(
    ...(scan?.results || []).map(result => domainOption(result, scan.official))
  );
}
function toggleSidebar() {
  patch({ sidebarCollapsed: !state.preferences.sidebarCollapsed });
}
$('#sidebar-toggle').onclick = toggleSidebar;
$('#quick-overlay').addEventListener('click', event => {
  if (event.target === $('#quick-overlay')) closeQuick();
});
for (const event of ['canplay', 'loadeddata', 'playing'])
  $('#video-wall').addEventListener(event, syncBackground);
$('#video-wall').addEventListener('pause', () => {
  if (backgroundShouldPlay()) setTimeout(syncBackground, 0);
});
function renderGuide() {
  const name = guideSteps[guideIndex];
  $('#guide-language').value = state.preferences.language;
  $('#guide-title').textContent = t('guide' + name + 'Title');
  $('#guide-description').textContent = t('guide' + name + 'Body');
  $('#guide-step').textContent = guideIndex + 1 + ' / ' + guideSteps.length;
  $('#guide-back').hidden = guideIndex === 0;
  $('#guide-next').textContent = t(
    guideIndex === guideSteps.length - 1 ? 'guideDone' : 'guideNext'
  );
  $('#guide-symbol').textContent = ['✦', '⌕', '♡', '◈', '◉', '▷', '↻'][guideIndex];
  const progress = $('#guide-progress');
  progress.replaceChildren();
  guideSteps.forEach((_name, i) => {
    const dot = document.createElement('span');
    dot.classList.toggle('complete', i <= guideIndex);
    progress.append(dot);
  });
}
async function openGuide() {
  previousFocus = document.activeElement;
  guideIndex = 0;
  guideOpen = true;
  await call(api.action('guide-open'));
  await call(api.panel(true));
  renderGuide();
  reveal($('#guide-overlay'), true);
  $('#guide-next').focus();
}
async function finishGuide() {
  await animate($('.guide-dialog'), 'out');
  guideOpen = false;
  $('#guide-overlay').hidden = true;
  await call(api.action('guide-complete'));
  await call(api.panel(Boolean(activePanel)));
  previousFocus?.focus();
}
async function guideMove(offset) {
  if (guideBusy) return;
  guideBusy = true;
  await animate($('#guide-content'), 'out');
  guideIndex = Math.max(0, Math.min(guideSteps.length - 1, guideIndex + offset));
  renderGuide();
  await animate($('#guide-content'));
  guideBusy = false;
}
$('#guide-skip').onclick = finishGuide;
$('#guide-back').onclick = () => guideMove(-1);
$('#guide-next').onclick = () =>
  guideIndex === guideSteps.length - 1 ? finishGuide() : guideMove(1);
$('#guide-language').onchange = event => patch({ language: event.target.value });
document.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || (!guideOpen && !quickOpen)) return;
  const root = guideOpen ? $('.guide-dialog') : $('.quick-dialog');
  const focusable = [...root.querySelectorAll('button,input,select')].filter(
    el => !el.hidden && !el.disabled && el.getClientRects().length
  );
  const first = focusable[0],
    last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
