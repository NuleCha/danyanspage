// Столько возни ради стрелочки. И она ещё должна меняться внутри чужого iframe.

/* CURSOR-MOTION-V2-BEGIN */
(function () {
  'use strict';
  if (window.danyanCursorMotionV2) {
    return;
  }
  window.danyanCursorMotionV2 = true;
  var root = document.documentElement,
    icons = {
      cross:
        'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAcElEQVR42u1XQQ7AMAgqi///MrtuO2ypM8FEvDZFSioq1n7w4xw7YMcSBwpfnsKWKxDZi+RdEAApHLkCJmAC8aPOSxyzhQIU5WabXsA3hytP+HBMl2G/PzCuG8ZlcqFiGmvVCzByJjQBE/BmhPHb8Qk7PxVCzXwM/QAAAABJRU5ErkJggg==',
      rainbow:
        'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABLklEQVR42u1WQXLEIAyzmPyo+yb8JvOm9k3upWRZYoOZTU+LLmEGsISwHYg+HQis0f/kmQlQ/Zb32R/sciFM/pPXmb/KVEQKBfLIS7HHC6JTmNwiyNkeL4hIYTvzOBAYBMbYkWdSn4l93FJKDBKRc6yinmCt65hZiQipUaRLJeecUERenejmehztBDNXi/DOlVgiLPJTADOTiJCItCLsU+dYOXqEVhKiOf14Y09eysv9r+Bvj6a2IbkivIw23Mg5n3Eic6nvisx8DZDjXRC4pk+NZ80dTmvWaQV0ovLTWzcf6reu5UEjwqWft9cwcaR10Bvf+jPqE9HLAaPkgdkbIPo7xoPD1VDJPQc0epo7HihH8C7R9fGp+GbNcB8CTzCrMhB8wvV7QRsbGxsbHX4B80qQnVl5YvoAAAAASUVORK5CYII=',
      chebu:
        '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',
      pen: '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'
    },
    colors = {
      cross: '#90e68c',
      rainbow: '#fa80dc',
      chebu: '#ecbb6e',
      pen: '#79b6ed'
    },
    points = { cross: [16, 16], rainbow: [2, 16], chebu: [2, 2], pen: [3, 28] },
    cache = {},
    timer = null,
    phase = 0,
    last = '',
    remote = location.hostname === 'danyanxdd.pythonanywhere.com';
  var media;
  if (window.matchMedia) {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    media = null;
  }
  var css = '';
  var prefix = 'html[data-cursor][data-cursor][data-cursor]';
  Object.keys(icons).forEach(function (id) {
    var p = prefix + '[data-cursor="' + id + '"]';
    css += p + ',' + p + ' *{cursor:var(--motion-normal,auto)!important}';
    css +=
      p +
      ' :is(a[href],button,summary,select,label[for],[role="button"],input[type="checkbox"],input[type="radio"],input[type="range"],input[type="submit"],input[type="button"],input[type="file"]),' +
      p +
      ' :is(a[href],button,summary,label[for],[role="button"]) *{cursor:var(--motion-link,pointer)!important}';
    css +=
      p +
      ' :is(input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="password"],input[type="tel"],input[type="url"],input[type="number"],textarea,[contenteditable="true"]),' +
      p +
      ' [contenteditable="true"] *{cursor:var(--motion-text,text)!important}';
    css +=
      p +
      '[data-cursor] :is(:disabled,[aria-disabled="true"]),' +
      p +
      '[data-cursor] :is(:disabled,[aria-disabled="true"]) *{cursor:var(--motion-blocked,not-allowed)!important}';
  });
  if (remote) {
    ['pixel', 'reimu'].forEach(function (id) {
      var p = prefix + '[data-cursor="' + id + '"]',
        base = 'https://danyanspage.neocities.org/cursors/';
      var normal;
      if (id === 'pixel') {
        normal = 'url(' + base + 'pixel.png) 2 1,auto';
      } else {
        normal = 'var(--reimu-normal,auto)';
      }
      var link;
      if (id === 'pixel') {
        link = 'url(' + base + 'hover.png) 2 3,pointer';
      } else {
        link = 'var(--reimu-link,pointer)';
      }
      var text;
      if (id === 'pixel') {
        text = 'url(' + base + 'retro-text.png) 6 8,text';
      } else {
        text = 'var(--reimu-text,text)';
      }
      var blocked;
      if (id === 'pixel') {
        blocked = 'url(' + base + 'blocked.png) 2 1,not-allowed';
      } else {
        blocked = 'var(--reimu-blocked,not-allowed)';
      }
      css +=
        p +
        ',' +
        p +
        ' *{cursor:' +
        normal +
        '!important}' +
        p +
        ' :is(a[href],button,summary,select,label[for],input[type="checkbox"],input[type="radio"]),' +
        p +
        ' :is(a[href],button,summary,label[for]) *{cursor:' +
        link +
        '!important}' +
        p +
        ' :is(input:not([type]),input[type="text"],input[type="password"],input[type="email"],input[type="search"],textarea,[contenteditable="true"]){cursor:' +
        text +
        '!important}' +
        p +
        '[data-cursor] :is(:disabled,[aria-disabled="true"]),' +
        p +
        '[data-cursor] :is(:disabled,[aria-disabled="true"]) *{cursor:' +
        blocked +
        '!important}';
    });
  }
  var style = document.createElement('style');
  style.setAttribute('data-cursor-motion', '2');
  style.textContent = css;
  document.head.appendChild(style);
  function picture(id, size, x, y) {
    return (
      '<image href="data:image/png;base64,' +
      icons[id] +
      '" x="' +
      x +
      '" y="' +
      y +
      '" width="' +
      size +
      '" height="' +
      size +
      '"/>'
    );
  }
  // Значок тот же, меняются кадр и состояние. Не городить отдельную анимационную машину.
  function make(id, state, f) {
    var c = colors[id];
    var alpha = [0.2, 0.4, 0.7, 1, 0.85, 0.6, 0.35, 0.15][f];
    var drawing = '';
    var point = [0, 0];
    var fallback;
    if (state === 'text') {
      fallback = 'text';
    } else {
      if (state === 'blocked') {
        fallback = 'not-allowed';
      } else {
        if (state === 'link') {
          fallback = 'pointer';
        } else {
          fallback = 'auto';
        }
      }
    }
    if (state === 'normal') {
      drawing = picture(id, 32, 0, 0);
      point = points[id];
      if (id === 'cross')
        {
        drawing +=
          '<circle cx="16" cy="16" r="' +
          (10 + (f % 4)) +
          '" fill="none" stroke="' +
          c +
          '" stroke-opacity="' +
          alpha +
          '"/>';
      }
      if (id === 'rainbow') {
        for (var j = 0; j < 5; j++)
          drawing +=
            '<path d="M' +
            (18 + (f % 3)) +
            ' ' +
            (22 + j) +
            'h10" stroke="' +
            ['#ff7474', '#ffc66e', '#e8ed75', '#7ce6ae', '#899dfc'][j] +
            '" opacity="' +
            (0.65 + alpha * 0.35) +
            '"/>';
      }
      if (id === 'chebu')
        {
        drawing +=
          '<path d="M22 ' +
          (9 - (f % 4)) +
          'q-3-3 0-6m6 5q-3-3 0-6" fill="none" stroke="' +
          c +
          '" opacity="' +
          alpha +
          '"/>';
      }
      if (id === 'pen')
        {
        drawing +=
          '<circle cx="' +
          (24 + (f % 3)) +
          '" cy="' +
          (27 - (f % 3)) +
          '" r="2" fill="' +
          c +
          '" opacity="' +
          alpha +
          '"/>';
      }
    } else if (state === 'link') {
      drawing =
        picture(id, 20, 12, 11) +
        '<path d="M1 1v21l5-5 4 9 4-2-4-9h9Z" fill="white" stroke="#171820" stroke-width="1.5"/>' +
        '<circle cx="27" cy="5" r="' +
        (1 + (f % 3)) +
        '" fill="' +
        c +
        '" opacity="' +
        alpha +
        '"/>';
    } else if (state === 'text') {
      point = [6, 12];
      drawing =
        picture(id, 16, 15, 15) +
        '<path d="M2 2h8M6 2v24M2 26h8" stroke="white" stroke-width="4"/><path d="M2 2h8M6 2v24M2 26h8" stroke="#181820" stroke-width="2"/>' +
        '<circle cx="28" cy="8" r="2" fill="' +
        c +
        '" opacity="' +
        alpha +
        '"/>';
    } else {
      point = [16, 16];
      drawing =
        picture(id, 16, 16, 16) +
        '<circle cx="13" cy="13" r="10" fill="#fff" stroke="#171820" stroke-width="2"/><path d="M6 20 20 6" stroke="' +
        c +
        '" stroke-width="4" opacity="' +
        (0.6 + alpha * 0.4) +
        '"/>';
    }
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
      drawing +
      '</svg>';
    return (
      'url("data:image/svg+xml,' +
      encodeURIComponent(svg) +
      '") ' +
      point[0] +
      ' ' +
      point[1] +
      ',' +
      fallback
    );
  }
  function draw() {
    clearTimeout(timer);
    timer = null;
    var id = root.getAttribute('data-cursor');
    if (document.hidden) {
      return;
    }
    if (icons[id]) {
      if (!cache[id]) {
        cache[id] = {};
        ['normal', 'link', 'text', 'blocked'].forEach(function (state) {
          cache[id][state] = [];
          for (var i = 0; i < 8; i++) cache[id][state].push(make(id, state, i));
        });
      }
      ['normal', 'link', 'text', 'blocked'].forEach(function (state) {
        root.style.setProperty('--motion-' + state, cache[id][state][phase % 8]);
      });
      phase = (phase + 1) % 8;
    } else if (remote && id === 'reimu') {
      ['normal', 'link', 'text', 'blocked'].forEach(function (state) {
        root.style.setProperty(
          '--reimu-' + state,
          'url("https://danyanspage.neocities.org/cursors/reimu-' +
            state +
            '-' +
            (phase % 32) +
            '.png") ' +
            (state === 'text' ? '4 4' : '0 0') +
            ',' +
            (state === 'text'
              ? 'text'
              : state === 'link'
                ? 'pointer'
                : state === 'blocked'
                  ? 'not-allowed'
                  : 'auto')
        );
      });
      phase = (phase + 1) % 32;
    } else {
      return;
    }
    if (!(media && media.matches) && root.getAttribute('data-low-power') !== 'true')
      {
      timer = setTimeout(draw, remote && id === 'reimu' ? 50 : 125);
    }
  }
  // сначала прибить старый таймер
  // Два сразу гоняют кадры наперегонки. Искать потом эту хрень я не хочу.
  // В скрытой вкладке браузер всё равно душит таймеры. Вот про это:
  // https://github.com/mdn/content/blob/main/files/en-us/web/api/page_visibility_api/index.md
  function refresh() {
    var id = root.getAttribute('data-cursor');
    if (id !== last) {
      last = id;
      phase = 0;
    }
    draw();
  }
  new MutationObserver(refresh).observe(root, {
    attributes: true,
    attributeFilter: ['data-cursor', 'data-low-power']
  });
  document.addEventListener('visibilitychange', refresh);
  if (media) {
    if (media.addEventListener) {
      media.addEventListener('change', refresh);
    }
    else {
      media.addListener(refresh);
    }
  }
  refresh();
  var origin = 'https://danyanspage.neocities.org',
    api = 'https://danyanxdd.pythonanywhere.com';
  if (remote && parent !== window) {
    var tries = 0;
    var retry = null;
    function ready() {
      parent.postMessage({ type: 'cursor-ready-v2' }, origin);
      if (++tries < 20) {
        retry = setTimeout(ready, 500);
      }
    }
    window.addEventListener('message', function (e) {
      if (
        e.source !== parent ||
        e.origin !== origin ||
        !e.data ||
        ['site-preferences', 'cursor-preferences-v2'].indexOf(e.data.type) < 0
      )
        {
        return;
      }
      var id;
      if (e.data.low) {
        id = 'system';
      } else {
        id = e.data.cursor;
      }
      if (!/^(pixel|reimu|system|cross|rainbow|chebu|pen)$/.test(id || '')) {
        return;
      }
      clearTimeout(retry);
      root.setAttribute('data-low-power', String(e.data.low === true));
      root.setAttribute('data-cursor', id);
      parent.postMessage({ type: 'cursor-applied-v2', cursor: id }, origin);
    });
    ready();
  } else {
    function send(target) {
      target.postMessage(
        {
          type: 'cursor-preferences-v2',
          cursor: root.getAttribute('data-cursor') || 'pixel',
          low: root.getAttribute('data-low-power') === 'true'
        },
        api
      );
    }
    function all() {
      document.querySelectorAll('iframe').forEach(function (f) {
        if (f.src.indexOf(api + '/') === 0) {
          send(f.contentWindow);
        }
      });
    }
    window.addEventListener('message', function (e) {
      if (e.origin !== api || !e.data || e.data.type !== 'cursor-ready-v2') {
        return;
      }
      document.querySelectorAll('iframe').forEach(function (f) {
        if (f.contentWindow === e.source) {
          send(e.source);
        }
      });
    });
    document.addEventListener(
      'load',
      function (e) {
        if (e.target.tagName === 'IFRAME') {
          all();
        }
      },
      true
    );
    document.addEventListener('site-cursor-change', all);
    document.addEventListener('site-mode-change', all);
    all();
  }
})();
/* CURSOR-MOTION-V2-END */

(function () {
  if (window.danyanCursorRelayV2 || location.hostname === 'danyanxdd.pythonanywhere.com')
    {
    return;
  }
  window.danyanCursorRelayV2 = true;
  var api = 'https://danyanxdd.pythonanywhere.com';
  function send() {
    document.querySelectorAll('iframe').forEach(function (f) {
      if (f.src.indexOf(api + '/') === 0)
        {
        f.contentWindow.postMessage(
          {
            type: 'cursor-preferences-v2',
            cursor: document.documentElement.getAttribute('data-cursor') || 'pixel',
            low: document.documentElement.getAttribute('data-low-power') === 'true'
          },
          api
        );
      }
    });
  }
  new MutationObserver(send).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-cursor', 'data-low-power']
  });
  window.addEventListener('message', function (e) {
    if (e.origin === api && e.data && e.data.type === 'cursor-ready-v2') {
      send();
    }
  });
  document.addEventListener(
    'load',
    function (e) {
      if (e.target.tagName === 'IFRAME') {
        send();
      }
    },
    true
  );
  send();
})();
