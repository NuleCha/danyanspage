// Музыку наконец оставить в покое. Меняется только страница внутри рамки.

(function () {
  'use strict';
  var frame = document.getElementById('site-content');
  var proxies = [];
  var playing = false;
  var view = '';
  // Дата тут врёт: старый файл тоже можно открыть сегодня. Нужен хеш самой сборки.
  var buildMeta = document.querySelector('meta[name="site-build"]');
  var buildVersion;
  if (buildMeta) {
    buildVersion = buildMeta.content;
  } else {
    buildVersion = 'local';
  }
  var loaded = false;
  var previousBuild = '';
  try {
    previousBuild = localStorage.getItem('danyan-loaded-build') || '';
  } catch (ignore) {}
  var loadBadge = document.createElement('div');
  loadBadge.className = 'site-load-status';
  loadBadge.setAttribute('role', 'status');
  document.body.appendChild(loadBadge);
  var loadBar = document.createElement('progress');
  loadBar.className = 'site-load-bar';
  loadBar.max = 1;
  loadBar.setAttribute('aria-label', 'Загрузка / Loading');
  document.body.appendChild(loadBar);
  function loadingText() {
    var en = document.documentElement.lang === 'en';
    if (!loaded) {
      loadBadge.textContent = en ? 'Loading…' : 'Загружаю…';
      return;
    }
    var message;
    if (en) {
      message = 'Loaded';
    } else {
      message = 'Загружено';
    }
    if (previousBuild && previousBuild !== buildVersion) {
      if (en) {
        message = 'Update loaded';
      } else {
        message = 'Обновление загружено';
      }
    }
    loadBadge.textContent = message + ' · ' + buildVersion;
  }
  loadingText();
  document.addEventListener('site-language-change', loadingText);
  frame.addEventListener('load', function () {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (ignore) {}
    if (!doc || !doc.body || !doc.querySelector('.site-nav')) {
      return;
    }
    loaded = true;
    loadBar.value = 1;
    loadBar.hidden = true;
    loadBadge.classList.add('is-loaded');
    loadingText();
    try {
      localStorage.setItem('danyan-loaded-build', buildVersion);
    } catch (ignore) {}
  });
  window.siteLowPower = function () {
    try {
      return localStorage.getItem('danyan-low-power') === 'true';
    } catch (ignore) {
      return false;
    }
  };
  window.siteText = function (ru, en) {
    if (document.documentElement.lang === 'en') {
      return en;
    }
    return ru;
  };
  function route(url) {
    var p = url.pathname;
    if (p === '/' || p === '/index' || p === '/index/' || p === '/index.html') {
      return 'home';
    }
    if (p === '/chat' || p === '/chat/' || p === '/chat.html') {
      return 'chat';
    }
    return null;
  }
  function send(doc, name) {
    try {
      doc.dispatchEvent(new doc.defaultView.Event(name));
    } catch (ignore) {}
  }
  // БЛЯТЬ, у чата внутри ещё свой iframe. До него настройки тоже должны добраться.
  function sync() {
    var child = frame.contentDocument;
    if (!child || !child.body) {
      return;
    }
    var emo = document.body.classList.contains('emo-weather');
    var caramel = document.body.classList.contains('caramel-party');
    document.documentElement.setAttribute(
      'data-cursor',
      child.documentElement.getAttribute('data-cursor') || 'system'
    );
    [
      '--cursor-normal',
      '--reimu-normal',
      '--reimu-link',
      '--reimu-text',
      '--reimu-blocked'
    ].forEach(function (k) {
      document.documentElement.style.setProperty(
        k,
        child.defaultView.getComputedStyle(child.documentElement).getPropertyValue(k)
      );
    });
    child.body.classList.toggle('emo-weather', emo);
    child.body.classList.toggle('caramel-party', caramel);
    Array.prototype.forEach.call(child.querySelectorAll('iframe'), function (f) {
      if ((f.getAttribute('src') || '').indexOf('https://danyanxdd.pythonanywhere.com/') === 0)
        {
        f.contentWindow.postMessage(
          {
            type: 'site-preferences',
            emo: emo,
            lang: child.documentElement.lang,
            low: window.siteLowPower(),
            cursor: child.documentElement.getAttribute('data-cursor') || 'system'
          },
          'https://danyanxdd.pythonanywhere.com'
        );
      }
    });
    var rain = child.querySelector('.host-rain');
    if (rain) {
      rain.hidden = !emo;
      rain.classList.toggle('rain-paused', document.hidden);
    }
    proxies = proxies.filter(function (p) {
      return p.doc === child;
    });
    proxies.forEach(function (p) {
      var source = document.getElementById(p.kind === 'emo' ? 'emo-mode' : 'caramel-mode');
      if (!source) {
        return;
      }
      p.button.textContent = source.textContent;
      p.button.title = source.title;
      p.button.disabled = source.disabled;
      p.button.setAttribute('aria-pressed', source.getAttribute('aria-pressed') || 'false');
    });
    if (child._hostPlaying !== playing) {
      child._hostPlaying = playing;
      send(child, playing ? 'caramel-start' : 'caramel-stop');
    }
  }
  function preferences(doc) {
    document.documentElement.lang = doc.documentElement.lang;
    document.documentElement.setAttribute('data-low-power', String(window.siteLowPower()));
    document.dispatchEvent(new Event('site-language-change'));
    document.dispatchEvent(new Event('site-mode-change'));
    sync();
    document.title = doc.title;
  }
  try {
    document.documentElement.lang =
      localStorage.getItem('danyan-language') === 'en' ? 'en' : 'ru';
  } catch (ignore) {}
  window.siteMediaHost = {
    attach: function (doc, kind) {
      var nav = doc.querySelector('.site-nav');
      if (!nav) {
        return;
      }
      var button = doc.createElement('button');
      button.type = 'button';
      button.id = kind === 'emo' ? 'emo-mode' : 'caramel-mode';
      nav.appendChild(button);
      proxies.push({ doc: doc, kind: kind, button: button });
      button.onclick = function () {
        document.documentElement.lang = doc.documentElement.lang;
        document.dispatchEvent(new Event('site-language-change'));
        var source = document.getElementById(kind === 'emo' ? 'emo-mode' : 'caramel-mode');
        if (source) {
          source.click();
        }
        sync();
      };
      if (kind === 'caramel') {
        var warning = doc.createElement('small');
        warning.id = 'caramel-warning';
        warning.textContent =
          doc.documentElement.lang === 'en'
            ? 'Caramelldansen: music and flashing lights'
            : 'Caramelldansen: музыка и мигающий свет';
        nav.parentNode.insertBefore(warning, nav.nextSibling);
      } else {
        var rain = doc.createElement('div');
        rain.className = 'emo-rain host-rain';
        rain.hidden = true;
        rain.setAttribute('aria-hidden', 'true');
        rain.appendChild(doc.createElement('i'));
        rain.appendChild(doc.createElement('i'));
        doc.body.appendChild(rain);
      }
      sync();
    }
  };
  // никакой новой вкладки
  // У Turbo возня с постоянными узлами собрана в Bardo:
  // https://github.com/hotwired/turbo/blob/main/src/core/bardo.js
  function go(url, push) {
    var next = route(url);
    if (!next) {
      return;
    }
    if (push) {
      history.pushState({ view: next }, '', url.pathname + url.search + url.hash);
    }
    if (next === view && frame.contentWindow) {
      frame.contentWindow.location.hash = url.hash;
      sync();
      return;
    }
    loaded = false;
    loadBar.hidden = false;
    loadBar.removeAttribute('value');
    loadBadge.classList.remove('is-loaded');
    loadingText();
    view = next;
    frame.src = '_pages/' + next + '.html' + url.search + url.hash;
  }
  frame.addEventListener('load', function () {
    var doc = frame.contentDocument;
    if (!doc || !doc.body) {
      return;
    }
    preferences(doc);
    doc.defaultView.addEventListener('message', function (e) {
      if (
        e.origin === 'https://danyanxdd.pythonanywhere.com' &&
        e.data &&
        (e.data.type === 'chat-size' || e.data.type === 'guestbook-frame')
      )
        {
        sync();
      }
    });
    if (playing) {
      send(doc, 'caramel-start');
    }
    doc.addEventListener('site-language-change', function () {
      preferences(doc);
    });
    doc.addEventListener('site-mode-change', function () {
      preferences(doc);
    });
    doc.addEventListener('site-cursor-change', sync);
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape')
        {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }
    });
    doc.addEventListener(
      'click',
      function (e) {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey ||
          e.altKey
        )
          {
          return;
        }
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.hasAttribute('download')) {
          return;
        }
        var raw = a.getAttribute('href');
        var url;
        if (raw.charAt(0) === '#') {
          url = new URL((view === 'chat' ? '/chat.html' : '/') + raw, location.origin);
        } else {
          url = new URL(a.href);
        }
        if (url.origin !== location.origin || !route(url)) {
          return;
        }
        e.preventDefault();
        go(url, true);
      },
      true
    );
    frame.contentWindow.addEventListener('hashchange', function () {
      var hash = frame.contentWindow.location.hash;
      if (hash !== location.hash)
        {
        history.replaceState({ view: view }, '', (view === 'chat' ? '/chat.html' : '/') + hash);
      }
    });
  });
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  new MutationObserver(sync).observe(document.querySelector('.site-nav'), {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });
  document.addEventListener('caramel-start', function () {
    playing = true;
    sync();
  });
  document.addEventListener('caramel-stop', function () {
    playing = false;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('popstate', function () {
    go(new URL(location.href), false);
  });
  go(new URL(location.href), false);
})();
