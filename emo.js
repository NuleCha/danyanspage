
(function () {
  'use strict';
  try {
    if (window.parent !== window && window.parent.siteMediaHost) {
      window.parent.siteMediaHost.attach(document, 'emo');
      return;
    }
  } catch (ignore) {}
  var nav = document.querySelector('.site-nav');
  if (!nav) {
    return;
  }
  var button = document.createElement('button');
  /* дождь сделали две CSS-плоскости. Хоть здесь без покадрового JS. */
  var rain = document.createElement('div');
  var running = false;
  var reduced;
  if (window.matchMedia) {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    reduced = null;
  }
  button.type = 'button';
  button.id = 'emo-mode';
  button.setAttribute('aria-pressed', 'false');
  rain.className = 'emo-rain';
  rain.hidden = true;
  rain.setAttribute('aria-hidden', 'true');
  rain.appendChild(document.createElement('i'));
  rain.appendChild(document.createElement('i'));
  nav.appendChild(button);
  document.body.appendChild(rain);
  var dock = document.createElement('section');
  var close = document.createElement('button');
  var hint = document.createElement('p');
  var slot = document.createElement('div');
  var link = document.createElement('a');
  dock.className = 'caramel-player emo-player';
  dock.hidden = true;
  close.type = 'button';
  close.onclick = stop;
  link.href = 'https://www.youtube.com/watch?v=hIOxsVn7EwY&t=0s';
  link.target = '_blank';
  link.rel = 'noopener';
  var rewind = document.createElement('button');
  rewind.type = 'button';
  rewind.onclick = function () {
    if (running) {
      mountVideo();
    }
  };
  dock.appendChild(close);
  dock.appendChild(rewind);
  dock.appendChild(hint);
  dock.appendChild(slot);
  dock.appendChild(link);
  document.body.appendChild(dock);
  var tracks = window.EMO_TRACKS || [
      { artist: 'Ideя Fix', title: 'Плачь и танцуй', id: 'eMm5euqjZcU' }
    ];
  var trackIndex = 0;
  var trackbar = document.createElement('div');
  var previousTrack = document.createElement('button');
  var nextTrack = document.createElement('button');
  var selector = document.createElement('select');
  trackbar.className = 'emo-trackbar';
  previousTrack.type = nextTrack.type = 'button';
  previousTrack.textContent = '◀';
  nextTrack.textContent = '▶';
  tracks.forEach(function (t, i) {
    var option = document.createElement('option');
    option.value = String(i);
    option.textContent = i + 1 + '. ' + t.artist + ' — ' + t.title;
    selector.appendChild(option);
  });
  previousTrack.onclick = function () {
    trackIndex = (trackIndex + tracks.length - 1) % tracks.length;
    mountVideo();
  };
  nextTrack.onclick = function () {
    trackIndex = (trackIndex + 1) % tracks.length;
    mountVideo();
  };
  selector.onchange = function () {
    trackIndex = Number(selector.value);
    mountVideo();
  };
  trackbar.appendChild(previousTrack);
  trackbar.appendChild(selector);
  trackbar.appendChild(nextTrack);
  dock.insertBefore(trackbar, hint);
  var player = null;
  var attempt = 0;
  var watchdog = null;
  var apiPromise = null;
  var videoState = 'idle';
  var videoError = '';
  // Это именно стоп. Если позвать при сворачивании, музыка сдохнет вместе с iframe.
  function clearPlayer() {
    attempt++;
    window.clearTimeout(watchdog);
    watchdog = null;
    if (player) {
      try {
        player.destroy();
      } catch (ignore) {}
      player = null;
    }
    slot.textContent = '';
  }
  // Пока API не ответил, новым тыкам отдаю тот же Promise.
  function loadAPI() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve(window.YT);
    }
    if (apiPromise) {
      return apiPromise;
    }
    apiPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var timer;
      var previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        window.clearTimeout(timer);
        if (typeof previous === 'function') {
          previous();
        }
        resolve(window.YT);
      };
      function failed() {
        window.clearTimeout(timer);
        apiPromise = null;
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(Error('youtube-api'));
      }
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = failed;
      timer = window.setTimeout(failed, 15000);
      document.head.appendChild(script);
    });
    return apiPromise;
  }
  var networkHelp = document.createElement('p');
  networkHelp.className = 'player-network-help';
  networkHelp.textContent = 'Если не грузит, подрубай впн';
  dock.appendChild(networkHelp);
  var compact =
    window.sitePlayerDock &&
    window.sitePlayerDock(dock, close, function () {
      return tracks[trackIndex].artist + ' — ' + tracks[trackIndex].title;
    });
  function label() {
    var en = document.documentElement.lang === 'en';
    networkHelp.hidden = en;
    if (compact) {
      compact.refresh();
    }
    selector.setAttribute('aria-label', en ? 'Choose a song' : 'Выбрать песню');
    selector.value = String(trackIndex);
    previousTrack.setAttribute('aria-label', en ? 'Previous song' : 'Предыдущая песня');
    nextTrack.setAttribute('aria-label', en ? 'Next song' : 'Следующая песня');
    button.textContent = en ? 'RUSSIAN EMO MODE' : 'ЭМО РЕЖИМ';
    button.title = en
      ? 'Russian emo, circa 2007: rain and a black-and-pink header'
      : 'Русское эмо: дождь и чёрно-розовая шапка';
    dock.setAttribute(
      'aria-label',
      en ? 'Russian emo — music player' : 'Русское эмо — музыкальный плеер'
    );
    close.textContent = en ? '■ STOP' : '■ СТОП';
    rewind.hidden = videoState === 'external';
    slot.hidden = videoState === 'external';
    rewind.textContent =
      videoState === 'error' || videoState === 'timeout'
        ? en
          ? '↺ RETRY'
          : '↺ ПОВТОРИТЬ'
        : en
          ? '↺ FROM START'
          : '↺ С НАЧАЛА';
    var messages = {
      external: [
        'YouTube отклонил встроенное воспроизведение. Выбери следующую песню или открой эту на YouTube.',
        'YouTube declined embedded playback. Choose the next song or open this one on YouTube.'
      ],
      loading: ['Загружаю видео с начала…', 'Loading video from the beginning…'],
      ready: [
        'Нажми ▶, если воспроизведение не началось.',
        'Press ▶ if playback has not started.'
      ],
      playing: ['Воспроизводится подборка эмокора.', 'Russian emocore is playing.'],
      paused: [
        'Видео на паузе. Нажми ▶, чтобы продолжить.',
        'Video paused. Press ▶ to continue.'
      ],
      blocked: [
        'Браузер заблокировал автозапуск. Нажми ▶ в плеере.',
        'Autoplay was blocked. Press ▶ in the player.'
      ],
      error: [
        'YouTube не запустил встроенное видео' +
          (videoError ? ' (код ' + videoError + ')' : '') +
          '. Можно повторить или открыть его на YouTube.',
        'YouTube could not play the embedded video' +
          (videoError ? ' (code ' + videoError + ')' : '') +
          '. Retry or open it on YouTube.'
      ],
      timeout: [
        'Плеер не ответил. Повтори загрузку или открой видео на YouTube.',
        'The player did not respond. Retry or open the video on YouTube.'
      ],
      idle: ['', '']
    };
    hint.textContent = (messages[videoState] || messages.idle)[en ? 1 : 0];
    hint.setAttribute('role', 'status');
    dock.setAttribute('data-video-state', videoState);
    link.href = 'https://www.youtube.com/watch?v=' + tracks[trackIndex].id + '&t=0s';
    link.textContent = en ? '▶ OPEN THIS SONG ON YOUTUBE' : '▶ ОТКРЫТЬ ЭТУ ПЕСНЮ НА YOUTUBE';
    button.setAttribute('aria-pressed', String(running));
    button.disabled = !!(window.siteLowPower && window.siteLowPower());
  }
  function stop() {
    running = false;
    document.body.classList.remove('emo-weather');
    rain.hidden = true;
    clearPlayer();
    videoState = 'idle';
    dock.hidden = true;
    label();
  }
  function start() {
    if (window.siteLowPower && window.siteLowPower()) {
      return;
    }
    document.dispatchEvent(new Event('emo-start'));
    trackIndex = 0;
    running = true;
    rain.hidden = false;
    document.body.classList.add('emo-weather');
    mountVideo();
  }
  // Старт с нуля. Если YouTube запретил встраивание, кодом запрет не выебать.
  // ¯\_(ツ)_/¯ ну я хз, по идее должно работать, давайте помолимся. Встраивание решает YouTube.
  function mountVideo() {
    clearPlayer();
    var current = attempt;
    videoState = 'loading';
    videoError = '';
    dock.hidden = false;
    label();
    var frame = document.createElement('iframe');
    frame.title = 'Russian emocore from 2007';
    frame.width = '320';
    frame.height = '200';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.src =
      'https://www.youtube.com/embed/' +
      tracks[trackIndex].id +
      '?enablejsapi=1&origin=' +
      encodeURIComponent(location.origin) +
      '&start=0&autoplay=1&playsinline=1&loop=1&playlist=' +
      tracks
        .map(function (t) {
          return t.id;
        })
        .join(',') +
      '&index=' +
      trackIndex +
      '&hl=' +
      document.documentElement.lang;
    slot.appendChild(frame);
    watchdog = window.setTimeout(function () {
      if (current === attempt && running) {
        videoState = 'timeout';
        label();
      }
    }, 20000);
    loadAPI()
      .then(function (YT) {
        if (current !== attempt || !running) {
          return;
        }
        player = new YT.Player(frame, {
          events: {
            onReady: function (e) {
              if (current !== attempt || !running) {
                return;
              }
              window.clearTimeout(watchdog);
              videoState = 'ready';
              label();
              e.target.loadPlaylist({
                playlist: tracks.map(function (t) {
                  return t.id;
                }),
                index: trackIndex,
                startSeconds: 0
              });
              e.target.playVideo();
            },
            onStateChange: function (e) {
              if (current !== attempt || !running) {
                return;
              }
              if (e.data === 1) {
                window.clearTimeout(watchdog);
                videoState = 'playing';
                var active = e.target.getPlaylistIndex();
                if (active >= 0 && active < tracks.length) {
                  trackIndex = active;
                }
              } else if (e.data === 2) {
                videoState = 'paused';
              }
              label();
            },
            onAutoplayBlocked: function () {
              if (current === attempt && running) {
                window.clearTimeout(watchdog);
                videoState = 'blocked';
                label();
              }
            },
            onError: function (e) {
              if (current === attempt && running) {
                window.clearTimeout(watchdog);
                videoError = String(e.data || '');
                if (e.data === 101 || e.data === 150) {
                  videoState = 'external';
                } else {
                  videoState = 'error';
                }
                label();
              }
            }
          }
        });
      })
      .catch(function () {
        if (current === attempt && running) {
          window.clearTimeout(watchdog);
          videoState = 'timeout';
          label();
        }
      });
  }
  button.onclick = function () {
    if (running) {
      stop();
    }
    else {
      start();
    }
  };
  document.addEventListener('caramel-starting', stop);
  document.addEventListener('site-mode-change', function () {
    if (window.siteLowPower()) {
      stop();
    }
    else {
      label();
    }
  });
  document.addEventListener('site-language-change', label);
  document.addEventListener('visibilitychange', function () {
    rain.classList.toggle('rain-paused', document.hidden);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      stop();
    }
  });
  label();
})();
