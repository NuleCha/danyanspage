
/* браузер, я нажал кнопку. Теперь звук можно, пожалуйста. */
(function () {
  'use strict';
  try {
    if (window.parent !== window && window.parent.siteMediaHost) {
      window.parent.siteMediaHost.attach(document, 'caramel');
      return;
    }
  } catch (ignore) {}
  var nav = document.querySelector('.site-nav');
  var button = document.createElement('button');
  button.type = 'button';
  button.id = 'caramel-mode';
  button.textContent = 'Caramelldansen';
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Музыка и мигающие цветные окна';
  button.setAttribute('aria-describedby', 'caramel-warning');
  nav.appendChild(button);
  var warning = document.createElement('small');
  warning.id = 'caramel-warning';
  warning.textContent = 'Caramelldansen: музыка и мигающий свет';
  nav.parentNode.insertBefore(warning, nav.nextSibling);
  var dock = document.createElement('section');
  dock.className = 'caramel-player';
  dock.hidden = true;
  dock.setAttribute('aria-label', 'Caramelldansen — музыкальный плеер');
  var stop = document.createElement('button');
  stop.type = 'button';
  stop.textContent = '■ СТОП';
  dock.appendChild(stop);
  var hint = document.createElement('p');
  hint.textContent = 'Если музыка не началась — нажми ▶ в плеере.';
  dock.appendChild(hint);
  var slot = document.createElement('div');
  dock.appendChild(slot);
  var link = document.createElement('a');
  link.href = 'https://www.youtube.com/watch?v=6-8E4Nirh9s';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'Caramelldansen · шведский оригинал ↗';
  dock.appendChild(link);
  document.body.appendChild(dock);
  var running = false;
  var playing = false;
  var networkHelp = document.createElement('p');
  networkHelp.className = 'player-network-help';
  networkHelp.textContent = 'Если не грузит, подрубай впн';
  dock.appendChild(networkHelp);
  var compact = window.sitePlayerDock && window.sitePlayerDock(dock, stop, 'Caramelldansen');
  function language() {
    var en = document.documentElement.lang === 'en';
    networkHelp.hidden = en;
    button.title = en
      ? 'Music and flashing coloured windows'
      : 'Музыка и мигающие цветные окна';
    warning.textContent = en
      ? 'Caramelldansen: music and flashing lights'
      : 'Caramelldansen: музыка и мигающий свет';
    dock.setAttribute(
      'aria-label',
      en ? 'Caramelldansen — music player' : 'Caramelldansen — музыкальный плеер'
    );
    stop.textContent = en ? '■ STOP' : '■ СТОП';
    hint.textContent = en
      ? 'If the music does not start, press ▶ in the player.'
      : 'Если музыка не началась — нажми ▶ в плеере.';
    link.textContent = en
      ? 'Caramelldansen · Swedish original ↗'
      : 'Caramelldansen · шведский оригинал ↗';
  }
  document.addEventListener('site-language-change', language);
  language();
  function end() {
    running = false;
    playing = false;
    document.body.classList.remove('caramel-party');
    document.dispatchEvent(new Event('caramel-stop'));
    slot.innerHTML = '';
    dock.hidden = true;
    button.textContent = 'Caramelldansen';
    button.setAttribute('aria-pressed', 'false');
  }
  function start() {
    document.dispatchEvent(new Event('caramel-starting'));
    running = true;
    document.body.classList.add('caramel-party');
    dock.hidden = false;
    var frame = document.createElement('iframe');
    frame.title = 'Caramelldansen — Swedish Original';
    frame.width = '320';
    frame.height = '180';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src =
      'https://www.youtube-nocookie.com/embed/6-8E4Nirh9s?enablejsapi=1&autoplay=1&playsinline=1&loop=1&playlist=6-8E4Nirh9s';
    frame.onload = function () {
      frame.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 'caramel' }),
        'https://www.youtube-nocookie.com'
      );
      frame.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'addEventListener',
          args: ['onStateChange']
        }),
        'https://www.youtube-nocookie.com'
      );
    };
    slot.appendChild(frame);
    button.textContent = '■ Caramelldansen';
    button.setAttribute('aria-pressed', 'true');
  }
  window.addEventListener('message', function (e) {
    var f = slot.querySelector('iframe');
    if (
      !running ||
      !f ||
      e.source !== f.contentWindow ||
      e.origin !== 'https://www.youtube-nocookie.com'
    )
      {
      return;
    }
    var d;
    try {
      if (typeof e.data === 'string') {
        d = JSON.parse(e.data);
      } else {
        d = e.data;
      }
    } catch (ignore) {
      return;
    }
    if (!d) {
      return;
    }
    var state;
    if (d.event === 'onStateChange') {
      state = d.info;
    } else {
      if (d.event === 'infoDelivery' && d.info) {
        state = d.info.playerState;
      } else {
        state = null;
      }
    }
    if (typeof state === 'number' && playing !== (state === 1)) {
      playing = state === 1;
      document.dispatchEvent(new Event(playing ? 'caramel-start' : 'caramel-stop'));
    }
  });
  button.onclick = function () {
    if (running) {
      end();
    }
    else {
      start();
    }
  };
  stop.onclick = end;
  document.addEventListener('emo-start', end);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && running) {
      end();
    }
  });
})();
