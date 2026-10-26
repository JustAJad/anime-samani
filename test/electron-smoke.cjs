// Real desktop + native website view, with local fixtures and no live site dependency.
const { app, BrowserWindow, session, dialog, shell } = require('electron');
const { join } = require('node:path');
const {
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} = require('node:fs');
const assert = require('node:assert/strict');
const root = join(__dirname, '..');
process.env.SAMANI_TEST_PROFILE = join(root, 'artifacts', 'samani-smoke');
rmSync(process.env.SAMANI_TEST_PROFILE, { recursive: true, force: true });
app.disableHardwareAcceleration();
let mode = 'server-error';
const problems = [],
  openedLinks = [];
shell.openExternal = async url => openedLinks.push(url);
process.on('unhandledRejection', error => problems.push(String(error)));
process.on('uncaughtException', error => {
  console.error(error);
  app.exit(1);
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, label) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await Promise.race([Promise.resolve().then(check), wait(1000).then(() => false)])) return;
    await wait(100);
  }
  throw new Error('Timed out: ' + label);
}
const fixtureReady = app.whenReady().then(() => {
  session.defaultSession.protocol.handle('https', request => {
    if (request.url.includes('/contenu/'))
      return new Response(
        readFileSync(
          join(
            root,
            existsSync(join(root, 'artifacts/fixture-cover.jpg'))
              ? 'artifacts/fixture-cover.jpg'
              : 'assets/branding/app-mark.png'
          )
        ),
        {
          headers: {
            'content-type': existsSync(join(root, 'artifacts/fixture-cover.jpg'))
              ? 'image/jpeg'
              : 'image/png',
          },
        }
      );
    if (new URL(request.url).pathname === '/failed-frame') return Response.error();
    const requestUrl = new URL(request.url);
    if (requestUrl.hostname === 'anime-sama.pw') {
      const check = requestUrl.searchParams.get('check');
      if (check)
        return Response.json({ status: check === 'anime-sama.to' ? 'online' : 'redirect' });
      return new Response(
        `<a class="btn-primary" href="https://anime-sama.si">Anime-Sama</a><script>const domains=[{ name: 'anime-sama.si' },{ name: 'anime-sama.to' }];</script>`,
        { headers: { 'content-type': 'text/html;charset=utf-8' } }
      );
    }
    if (requestUrl.pathname === '/moved') {
      return new Response(null, {
        status: 302,
        headers: { location: 'https://anime-sama.si/catalogue/frieren/saison1/vostfr/' },
      });
    }
    if (mode === 'server-error')
      return new Response('Error', {
        status: 500,
        headers: { 'content-type': 'text/html;charset=utf-8' },
      });
    if (mode === 'offline') return Response.error();
    if (request.url.includes('/scan/'))
      return new Response('<h1>Scan fixture</h1>', {
        headers: { 'content-type': 'text/html;charset=utf-8' },
      });
    return new Response(
      '<!doctype html><title>Anime fixture</title><body style="background:#181b20"><main id="main" style="background:#181b20"><h1>Frieren</h1><div class="asn-ad" id="fixture-ad">Publicité <a href="https://example.test/ad">Sponsor</a></div><div class="bg-slate-900" id="fixture-card">Card</div></main><select id="selectEpisodes"><option>Épisode 7</option></select><iframe src="/failed-frame"></iframe>',
      { headers: { 'content-type': 'text/html;charset=utf-8' } }
    );
  });
});
require('../index');
(async () => {
  await fixtureReady;
  let window;
  await until(() => {
    window = BrowserWindow.getAllWindows().find(item =>
      item.webContents.getURL().includes('/desktop/index.html')
    );
    return window;
  }, 'desktop window');
  const ui = code => window.webContents.executeJavaScript(code);
  await until(
    async () =>
      await ui(
        'Boolean(window.samani && document.querySelector("#error-code")?.textContent.includes("500"))'
      ),
    'localized startup HTTP 500'
  );
  assert.equal(await ui('document.documentElement.lang'), 'fr');
  assert.match(await ui('document.querySelector("#error-panel").innerText'), /chargée/);
  await until(
    async () => await ui('document.querySelector("#intro").hidden'),
    'animated intro finishes'
  );
  assert.equal(window.isVisible(), true);
  console.log('PASS French default, logo intro and actual startup HTTP 500 recovery');
  await until(
    async () => await ui('!document.querySelector("#guide-overlay").hidden'),
    'first launch guide'
  );
  assert.match(await ui('document.querySelector("#guide-title").textContent'), /Bienvenue/);
  await ui('window.samani.preferences({language:"ja"})');
  await until(
    async () => await ui('document.querySelector("#guide-title").textContent.includes("ようこそ")'),
    'Japanese guide'
  );
  await ui('window.samani.preferences({language:"en"})');
  await until(
    async () => await ui('document.querySelector("#guide-title").textContent.includes("Welcome")'),
    'English guide'
  );
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  await wait(400);
  writeFileSync(
    join(root, 'artifacts', 'samani-guide.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  await ui('window.samani.preferences({language:"fr"})');
  await ui('document.querySelector("#guide-skip").click()');
  await until(
    async () => !(await ui('window.samani.bootstrap()')).needsGuide,
    'guide completion saved'
  );
  assert.equal(
    JSON.parse(
      readFileSync(join(process.env.SAMANI_TEST_PROFILE, 'samani-preferences.json'), 'utf8')
    ).guideV1Complete,
    true
  );
  assert.equal(
    await ui('document.querySelector(".brand img").getAttribute("src")'),
    '../assets/branding/mark.png'
  );
  assert.equal(
    await ui('document.querySelector("#version").textContent'),
    require('../lib/version').displayVersion(require('../package.json').version)
  );
  assert.equal(
    await ui(
      'Boolean(document.querySelector(".toolbar-actions .icon-button[data-action=cinema]"))'
    ),
    false
  );
  console.log(
    'PASS skippable first-run guide in three languages, saved completion, V1 and preserved sidebar logo'
  );

  mode = 'healthy';
  await ui('window.samani.navigate("https://anime-sama.to/catalogue/frieren/saison1/vostfr/")');
  await until(async () => {
    const s = await ui('window.samani.bootstrap()');
    return s.page.title === 'Frieren' && s.page.episode.includes('7') && !s.loading && !s.error;
  }, 'site metadata');
  let state = await ui('window.samani.bootstrap()');
  assert.ok(state.recent.some(item => item.title === 'Frieren'));
  assert.equal(state.preferences.rpcClientId, undefined);
  assert.equal(state.preferences.rpcTemplate, undefined);
  await ui('window.samani.library("favorite")');
  state = await ui('window.samani.bootstrap()');
  assert.equal(state.favorites.length, 1);
  console.log(
    'PASS native website view, episode observer, recent history, favorites and owned Discord ID'
  );
  const content = window.contentView.children.find(
    view => view.webContents && view.webContents !== window.webContents
  ).webContents;
  await content.executeJavaScript(
    `(()=>{const b=document.createElement('button');b.id='addFavoris';b.setAttribute('aria-pressed','false');b.onclick=()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));document.body.append(b);})()`
  );
  await ui('window.samani.library("favorite")');
  await ui('window.samani.library("favorite")');
  await until(
    async () =>
      await content.executeJavaScript(
        'document.querySelector("#addFavoris").getAttribute("aria-pressed")==="true"'
      ),
    'desktop favorite reaches website'
  );
  await content.executeJavaScript('document.querySelector("#addFavoris").click()');
  await until(
    async () => (await ui('window.samani.bootstrap()')).favorites.length === 0,
    'website favorite reaches desktop'
  );
  await until(
    async () =>
      await content.executeJavaScript(
        '[...document.fonts].some(font=>font.family==="Beckman"&&font.status==="loaded")'
      ),
    'bundled website font'
  );
  const { sampleFrames, seekFrame } = require('../lib/playback');
  await content.executeJavaScript(
    `(()=>{const v=document.createElement('video');Object.defineProperty(v,'duration',{value:1440});Object.defineProperty(v,'paused',{value:false});v.currentTime=120;document.body.append(v);})()`
  );
  let snapshot = await sampleFrames(content);
  assert.equal(snapshot.value.time, 120);
  assert.equal(await seekFrame(snapshot.frame, 420), true);
  snapshot = await sampleFrames(content);
  assert.equal(snapshot.value.time, 420);
  await until(
    async () => (await ui('window.samani.bootstrap()')).page.time === 420,
    'main process reads playback'
  );
  await ui('window.samani.navigate("resume")');
  await until(
    async () => !(await ui('window.samani.bootstrap()')).loading,
    'resume reopens the episode'
  );
  await content.executeJavaScript(
    `(()=>{const v=document.createElement('video');Object.defineProperty(v,'duration',{value:1440});Object.defineProperty(v,'paused',{value:true});document.body.append(v);})()`
  );
  await until(
    async () =>
      await content.executeJavaScript('document.querySelector("video").currentTime===420'),
    'saved playback position restored'
  );
  await content.executeJavaScript('document.querySelector("video").remove()');
  content.emit('media-paused');
  console.log('PASS bidirectional favorite clicks, bundled Beckman and player sampling/seeking');

  await ui('document.querySelector("[data-panel=settings]").click()');
  await until(
    async () => await ui('!document.querySelector("#settings-panel").hidden'),
    'settings panel'
  );
  await ui(
    'window.samani.preferences({language:"en",alwaysOnTop:true,colorA:"#38bdf8",colorB:"#818cf8",blur:21,reducedMotion:true})'
  );
  await until(() => window.isAlwaysOnTop(), 'always on top');
  await until(async () => await ui('document.documentElement.lang === "en"'), 'English switch');
  assert.match(await ui('document.querySelector("#settings-panel").innerText'), /Personalization/);
  assert.equal(
    await ui('getComputedStyle(document.documentElement).getPropertyValue("--a").trim()'),
    '#38bdf8'
  );
  await ui('window.samani.preferences({language:"ja"})');
  await until(async () => await ui('document.documentElement.lang === "ja"'), 'Japanese switch');
  assert.match(await ui('document.querySelector("#settings-panel").innerText'), /カスタマイズ/);
  await ui('window.samani.preferences({language:"fr",alwaysOnTop:false})');
  await until(() => !window.isAlwaysOnTop(), 'always on top disabled');
  assert.equal(await ui('getComputedStyle(document.querySelector("h1")).fontWeight'), '700');
  assert.equal(await ui('getComputedStyle(document.querySelector(".hint")).fontWeight'), '400');
  assert.ok(
    !(await ui('getComputedStyle(document.querySelector(".hint")).fontFamily')).startsWith(
      'Beckman'
    )
  );
  console.log(
    'PASS instant French/English/Japanese, bold headings/buttons, regular body and native window setting'
  );

  await until(
    async () =>
      await content.executeJavaScript(
        'getComputedStyle(document.querySelector("#fixture-ad")).display === "none"'
      ),
    'website ads hidden'
  );
  assert.equal(
    await content.executeJavaScript('getComputedStyle(document.body).backgroundColor'),
    'rgba(0, 0, 0, 0)'
  );
  await ui('window.samani.preferences({blockAds:false,websiteTheme:false})');
  await until(
    async () =>
      await content.executeJavaScript(
        'getComputedStyle(document.querySelector("#fixture-ad")).display !== "none"'
      ),
    'ad filter can be disabled'
  );
  await until(
    async () =>
      await content.executeJavaScript(
        'getComputedStyle(document.body).backgroundColor === "rgb(24, 27, 32)"'
      ),
    'original website background restored'
  );
  await ui('window.samani.preferences({blockAds:true,websiteTheme:true})');
  await until(
    async () =>
      await content.executeJavaScript(
        'getComputedStyle(document.body).backgroundColor === "rgba(0, 0, 0, 0)"'
      ),
    'website theme restored'
  );
  console.log('PASS website theme and ad filtering can be toggled independently');

  dialog.showOpenDialog = async () => ({
    canceled: false,
    filePaths: [join(root, 'assets', 'branding', 'mark.png')],
  });
  await ui('window.samani.media("image")');
  await until(
    async () => await ui('document.querySelector("#image-wall").naturalWidth > 0'),
    'custom image protocol'
  );
  assert.equal(await ui('document.querySelector("#image-wall").hidden'), false);
  dialog.showOpenDialog = async () => ({
    canceled: false,
    filePaths: [join(root, 'test', 'fixtures', 'background.webm')],
  });
  await ui('window.samani.preferences({reducedMotion:false,pauseBackground:true})');
  await ui('window.samani.media("video")');
  await until(
    async () =>
      await ui(
        'document.querySelector("#video-wall").readyState >= 2 && !document.querySelector("#video-wall").paused'
      ),
    'custom video playback'
  );
  assert.equal(
    readdirSync(join(process.env.SAMANI_TEST_PROFILE, 'samani-media')).length,
    1,
    'replaced backgrounds are deleted'
  );
  const website = window.contentView.children.find(
    view => view.webContents && view.webContents !== window.webContents
  );
  website.webContents.emit('media-started-playing');
  await until(
    async () => await ui('document.querySelector("#video-wall").paused'),
    'background pauses during playback'
  );
  website.webContents.emit('media-paused');
  await until(
    async () => await ui('!document.querySelector("#video-wall").paused'),
    'background resumes'
  );
  await ui('window.samani.preferences({reducedMotion:true})');
  await until(
    async () => await ui('document.querySelector("#video-wall").paused'),
    'reduced motion pauses video'
  );

  await ui('window.samani.preferences({reducedMotion:false,pauseBackground:false})');
  website.webContents.emit('media-started-playing');
  await until(
    async () => await ui('!document.querySelector("#video-wall").paused'),
    'pause option disabled during playback'
  );
  const backgroundBefore = await ui('document.querySelector("#video-wall").currentTime');
  for (const tab of ['general', 'appearance', 'desktop', 'discord', 'updates']) {
    await ui(`document.querySelector('[data-tab=${tab}]').click()`);
    await wait(150);
    assert.equal(await ui('document.querySelector("#video-wall").paused'), false);
  }
  await ui('document.querySelector("[data-panel=library]").click()');
  await wait(500);
  await ui('document.querySelector("[data-panel=settings]").click()');
  await wait(500);
  assert.equal(await ui('document.querySelector("#video-wall").paused'), false);
  assert.notEqual(await ui('document.querySelector("#video-wall").currentTime'), backgroundBefore);
  await ui('document.querySelector("#sidebar-toggle").click()');
  await until(
    async () => (await ui('window.samani.bootstrap()')).preferences.sidebarCollapsed,
    'sidebar collapses'
  );
  assert.equal(await ui('document.body.classList.contains("sidebar-collapsed")'), true);
  await ui('document.querySelector("#sidebar-toggle").click()');
  await until(
    async () => !(await ui('window.samani.bootstrap()')).preferences.sidebarCollapsed,
    'sidebar expands'
  );
  await ui('document.querySelector("#quick-button").click()');
  await until(
    async () => await ui('!document.querySelector("#quick-overlay").hidden'),
    'quick access'
  );
  await ui('document.querySelector("#quick-overlay").click()');
  await until(
    async () => await ui('document.querySelector("#quick-overlay").hidden'),
    'outside click closes quick access'
  );
  await ui('document.querySelector("[data-panel=settings]").click()');
  await until(
    async () => await ui('!document.querySelector("#settings-panel").hidden'),
    'settings reopen'
  );
  assert.equal(await ui('Boolean(document.querySelector("#replay-guide"))'), false);
  await ui('window.samani.action("guide-open")');
  assert.equal(await ui('document.querySelector("#guide-overlay").hidden'), true);
  assert.equal(
    await ui(
      'Boolean(document.querySelector("[data-pref=rpcClientId],[data-pref=rpcTemplate],[data-action=discord-portal]"))'
    ),
    false
  );
  await ui('document.querySelector("[data-tab=appearance]").click()');
  console.log(
    'PASS video keeps playing across menus with pause disabled, sidebar collapse, outside-click quick access and first-run-only guide'
  );

  const { net } = require('electron');
  const media = (await ui('window.samani.bootstrap()')).mediaUrl;
  const sourceBytes = readFileSync(join(root, 'test', 'fixtures', 'background.webm'));
  for (const start of [0, 32, sourceBytes.length - 32]) {
    const response = await net.fetch(media, {
      headers: { Range: `bytes=${start}-${Math.min(sourceBytes.length - 1, start + 15)}` },
    });
    assert.equal(response.status, 206);
    assert.deepEqual(
      Buffer.from(await response.arrayBuffer()),
      sourceBytes.subarray(start, Math.min(sourceBytes.length, start + 16))
    );
  }
  await ui('window.samani.preferences({pauseBackground:false,reducedMotion:false})');
  await ui('document.querySelector("#video-wall").playbackRate=4');
  await wait(10000);
  assert.equal(await ui('document.querySelector("#video-wall").error'), null);
  assert.equal(await ui('document.querySelector("#video-wall").paused'), false);
  assert.equal(await ui('document.querySelector("#toast").hidden'), true);
  console.log(
    'PASS byte-range media reads, tail reads and repeated video looping without invalid-file errors'
  );
  await ui(
    'window.samani.preferences({theme:"samani",colorA:"#ffb45f",colorB:"#ff91a8",background:"gradient",blur:12,reducedMotion:false})'
  );
  mkdirSync(join(root, 'artifacts'), { recursive: true });
  await wait(250);
  writeFileSync(
    join(root, 'artifacts', 'samani-personalization.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  await ui('window.samani.preferences({language:"en"})');
  await wait(200);
  writeFileSync(
    join(root, 'artifacts', 'samani-personalization-en.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  // Capture the final Discord controls in every language with a representative paused episode.
  await ui('document.querySelector("[data-tab=discord]").click()');
  for (const language of ['fr', 'en', 'ja']) {
    await ui(`window.samani.preferences({language:"${language}"})`);
    const rpcState = await ui('window.samani.bootstrap()');
    window.webContents.send('samani:state', {
      ...rpcState,
      page: {
        ...rpcState.page,
        duration: 1440,
        time: 420,
        playing: false,
        hasPlayback: true,
        image: 'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/frieren.jpg',
      },
      rpcStatus: 'connected',
    });
    await wait(400);
    assert.equal(await ui('document.querySelector("#rpc-preview-icon").hidden'), false);
    assert.equal(
      await ui('document.querySelector("#rpc-preview-icon").getAttribute("src")'),
      '../assets/branding/rpc-pause.png'
    );
    writeFileSync(
      join(root, 'artifacts', 'samani-discord-' + language + '.png'),
      (await window.webContents.capturePage()).toPNG()
    );
  }
  await ui('document.querySelector("[data-tab=appearance]").click()');

  await ui('window.samani.preferences({language:"fr"})');
  await ui('document.querySelector("#settings-panel .close-panel").click()');
  await ui('window.samani.action("cinema")');
  await until(async () => await ui('document.body.classList.contains("cinema")'), 'cinema');
  await ui('window.samani.action("cinema")');
  await ui('window.samani.action("intro-done")');
  mode = 'offline';
  await ui('window.samani.action("reload")');
  await until(async () => {
    const s = await ui('window.samani.bootstrap()');
    return s.error?.kind === 'network';
  }, 'actual network error');
  state = await ui('window.samani.bootstrap()');
  assert.notEqual(state.error.code, '500');
  console.log('PASS cinema mode, iframe failures and network errors without false 500');
  mode = 'healthy';
  await ui('window.samani.navigate("home")');
  await until(async () => !(await ui('window.samani.bootstrap()')).loading, 'home loaded');
  await ui('window.samani.library("favorite")');
  assert.equal((await ui('window.samani.bootstrap()')).favorites.length, 0);
  assert.equal(await ui('document.querySelector("#favorite-button").hidden'), true);
  await ui('window.samani.action("cinema")');
  assert.equal((await ui('window.samani.bootstrap()')).cinema, false);
  await ui('window.samani.navigate("https://anime-sama.to/catalogue/paper/scan/vf/")');
  await until(
    async () => (await ui('window.samani.bootstrap()')).page.title === 'Scan fixture',
    'scan loaded'
  );
  await ui('window.samani.library("favorite")');
  assert.equal((await ui('window.samani.bootstrap()')).favorites.length, 0);
  await ui('window.samani.navigate("https://anime-sama.to/catalogue/frieren/saison1/vostfr/")');
  await until(async () => (await ui('window.samani.bootstrap()')).canFavorite, 'anime loaded');
  await ui('window.samani.library("favorite")');
  await ui('document.querySelector("[data-panel=library]").click()');
  await until(
    async () => await ui('!document.querySelector("#library-panel").hidden'),
    'library opens'
  );
  assert.equal(await ui('document.querySelectorAll("#favorites-list .library-cover").length'), 1);
  assert.equal(await ui('document.querySelector("#resume-episode").hidden'), false);
  await until(
    async () => await ui('document.querySelector("#favorites-list img").naturalWidth>0'),
    'favorite cover loaded'
  );
  await wait(400);
  writeFileSync(
    join(root, 'artifacts', 'samani-library.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  const beforeState = await ui('window.samani.bootstrap()');
  window.webContents.send('samani:state', {
    ...beforeState,
    update: { status: 'checking' },
    rpcStatus: 'connected',
  });
  await wait(100);
  assert.equal(await ui('document.querySelector("#update-spinner").hidden'), false);
  assert.equal(await ui('document.querySelector("#check-update").disabled'), true);
  window.webContents.send('samani:state', { ...beforeState, update: { status: 'current' } });
  await wait(100);
  assert.equal(await ui('document.querySelector("#update-spinner").hidden'), true);
  console.log(
    'PASS home/manga cannot be favorited or use cinema, anime banners, and updater loading state'
  );
  await ui('document.querySelector("[data-panel=about]").click()');
  await until(async () => await ui('!document.querySelector("#about-panel").hidden'), 'credits');
  assert.equal(await ui('Boolean(document.querySelector("[data-i18n=rpcPreviewNote]"))'), false);
  assert.equal(
    await ui('document.querySelector("[data-i18n=updates]").textContent'),
    'Mise à jour'
  );
  await ui('document.querySelector("[data-action=bourinou]").click()');
  await until(
    () => openedLinks.includes('https://github.com/Bourinou'),
    'Bourinou credit links to his profile'
  );
  await ui('document.querySelector("[data-action=jad]").click()');
  await ui('document.querySelector("[data-action=anime-sama]").click()');
  await until(
    () =>
      openedLinks.includes('https://github.com/JustAJad') &&
      openedLinks.includes('https://anime-sama.to/'),
    'credit links'
  );
  assert.match(await ui('document.querySelector("#about-panel").innerText'), /Just A Jad/);
  assert.match(await ui('document.querySelector("#about-panel").innerText'), /justajade/);
  await wait(350);
  writeFileSync(
    join(root, 'artifacts', 'samani-credits.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  console.log('PASS Just A Jad, Discord handle, Anime Sama team credit and singular update label');

  app.emit('second-instance', {}, [
    'ANIME_SAMANI.exe',
    'anime-samani://open?' +
      new URLSearchParams({
        url: 'https://anime-sama.to/catalogue/frieren/saison1/vostfr/',
        episode: 'Épisode 7',
      }),
  ]);
  await until(
    async () => (await ui('window.samani.bootstrap()')).page.episode === 'Épisode 7',
    'deep link reaches existing app'
  );
  console.log('PASS validated episode links reach the running app');

  // Domain settings: anime-sama.pw list, manual entry, and a move detected while browsing.
  const bootstrap = () => ui('window.samani.bootstrap()');
  await ui('document.querySelector("[data-panel=settings]").click()');
  await ui('document.querySelector("[data-tab=general]").click()');
  await ui('document.querySelector("#scan-domains").click()');
  await until(
    async () => await ui('document.querySelectorAll("#domain-list .domain-option").length === 2'),
    'domains listed from anime-sama.pw'
  );
  assert.match(
    await ui('document.querySelector("#domain-list").innerText'),
    /anime-sama\.to[\s\S]*Actif/
  );
  assert.match(await ui('document.querySelector("#domain-list").innerText'), /Lien officiel/);
  await wait(300);
  writeFileSync(
    join(root, 'artifacts', 'samani-domains.png'),
    (await window.webContents.capturePage()).toPNG()
  );
  await ui(
    '[...document.querySelectorAll(".domain-option")].find(b=>b.innerText.includes("anime-sama.si")).click()'
  );
  await until(async () => {
    const s = await bootstrap();
    return (
      s.domain === 'anime-sama.si' &&
      s.page.url.startsWith('https://anime-sama.si/catalogue/frieren/') &&
      !s.loading
    );
  }, 'listed domain applied on the same page');
  await until(
    async () =>
      (await bootstrap()).page.title === 'Frieren' &&
      (await bootstrap()).page.episode === 'Épisode 7',
    'metadata works on the new domain'
  );
  assert.equal((await bootstrap()).preferences.domain, 'anime-sama.si');
  assert.equal((await bootstrap()).favorites[0].url, 'https://anime-sama.si/catalogue/frieren/');
  await ui('document.querySelector("#domain-input").value="not-a-site.test"');
  await ui('document.querySelector("#apply-domain").click()');
  await until(
    async () =>
      await ui(
        '!document.querySelector("#toast").hidden && document.querySelector("#toast").textContent.includes("anime-sama.si")'
      ),
    'invalid domain refused'
  );
  assert.equal((await bootstrap()).domain, 'anime-sama.si');
  await ui('document.querySelector("#domain-input").value="https://www.anime-sama.to/"');
  await ui('document.querySelector("#apply-domain").click()');
  await until(async () => (await bootstrap()).domain === 'anime-sama.to', 'manual domain applied');
  await ui('document.querySelector("#settings-panel .close-panel").click()');
  await ui('window.samani.navigate("https://anime-sama.to/moved")');
  await until(async () => (await bootstrap()).error?.kind === 'domain', 'domain move detected');
  assert.equal(await ui('document.querySelector("#error-domain").hidden'), false);
  assert.match(await ui('document.querySelector("#error-code").textContent'), /anime-sama\.si/);
  await ui('document.querySelector("#error-domain").click()');
  await until(async () => {
    const s = await bootstrap();
    return s.domain === 'anime-sama.si' && !s.error && !s.loading;
  }, 'moved domain adopted from the error page');
  await ui('window.samani.domain("anime-sama.to")');
  await until(async () => !(await bootstrap()).loading, 'default domain restored');
  console.log(
    'PASS anime-sama.pw domain list, manual domain, migrated favorites and move detection'
  );

  // Local paths and unsupported native actions cannot be granted from website frames.
  const site = window.contentView.children.find(
    view => view.webContents && view.webContents !== window.webContents
  );
  assert.ok(site);
  assert.equal(await site.webContents.executeJavaScript('typeof window.samani'), 'undefined');
  const before = (await ui('window.samani.bootstrap()')).preferences.media;
  await ui('window.samani.preferences({media:"../../not-authorized.mp4"})');
  assert.equal((await ui('window.samani.bootstrap()')).preferences.media, before);
  assert.deepEqual(problems, []);
  console.log('PASS isolated website and local media permission boundary');
  app.exit(0);
})().catch(error => {
  console.error(error);
  app.exit(1);
});
