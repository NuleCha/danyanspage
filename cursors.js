'use strict';
// После очистки браузера анлоки из воздуха уже не восстановлю. Они все здесь, локально.
(function () {
  'use strict';
  function eatenLimit(number) {
    if (number < 0) {
      return 0;
    }
    if (number > 10) {
      return 10;
    }
    return number;
  }
  var root = document.documentElement;
  var box = document.getElementById('cursor-options');
  var storageKey = 'danyan-cursors-v1';
  var state = { selected: 'pixel', caught: false, eaten: 0, wrote: false };
  function cursorStorage(next) {
    try {
      if (next) {
        localStorage.setItem(storageKey, JSON.stringify(next));
        return true;
      }
      var stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
      return stored;
    } catch (error) {
      return null;
    }
  }
  var saved = cursorStorage();
  if (saved) {
    state = {
      selected: typeof saved.selected === 'string' ? saved.selected : 'pixel',
      caught: saved.caught === true,
      eaten: eatenLimit(Number(saved.eaten) || 0),
      wrote: saved.wrote === true
    };
  }
  var cursorConfig = /* STUDIO-CURSORS-BEGIN */ {
    default: 'pixel',
    choices: [
      {
        id: 'pixel',
        name: ['Retro — основной', 'Retro — default'],
        image: 'Курсоры/pixel.png',
        enabled: true
      },
      {
        id: 'reimu',
        name: ['Рейму', 'Reimu'],
        image: 'Курсоры/reimu-fumo.png',
        enabled: true
      },
      {
        id: 'system',
        name: ['Обычный', 'System'],
        image: 'Курсоры/plain.png',
        enabled: true
      },
      {
        id: 'cross',
        name: ['Прицел', 'Crosshair'],
        image: 'Курсоры/cross.png',
        enabled: true
      },
      {
        id: 'rainbow',
        name: ['Радуга', 'Rainbow'],
        image: 'Курсоры/nyan.png',
        enabled: true,
        action: ['Поймать Nyan Cat', 'Catch Nyan Cat']
      },
      {
        id: 'chebu',
        name: ['Чебупеля', 'Chebupel'],
        image: 'Курсоры/chebu.png',
        enabled: true,
        action: ['Тапнуть 10 чебупелей', 'Tap 10 chebupeli']
      },
      {
        id: 'pen',
        name: ['Ручка', 'Pen'],
        image: 'Курсоры/pen.png',
        enabled: true,
        action: ['Написать в гостевую', 'Write in the guestbook']
      }
    ]
  }; /* STUDIO-CURSORS-END */
  var choices = cursorConfig.choices.filter(function (cursorChoice) {
    return cursorChoice.enabled !== false;
  });
  // Свой PNG меняет стрелку, а не весь набор состояний сразу.
  var customStyle = document.createElement('style');
  var customRules = [];
  choices.forEach(function (cursorChoice) {
    if (
      cursorChoice.id === 'system' ||
      !cursorChoice.pointer ||
      !/^(Курсоры|Картинки)\/[a-zA-Z0-9_/-]+\.png$/.test(cursorChoice.pointer)
    )
      {
      return;
    }
    var point = cursorChoice.hotspot || [0, 0];
    if (
      !point.every(function (n) {
        return Number.isInteger(n) && n >= 0 && n < 128;
      })
    )
      {
      return;
    }
    customRules.push(
      'html[data-cursor="' +
        cursorChoice.id +
        '"]{--cursor-normal:url("' +
        cursorChoice.pointer +
        '") ' +
        point[0] +
        ' ' +
        point[1] +
        ',auto}'
    );
  });
  customStyle.textContent = customRules.join('\n');
  document.head.appendChild(customStyle);
  if (!box) {
    return;
  }
  if (!saved) {
    state.selected = cursorConfig.default;
  }
  var buttons = [];
  var coarse;
  if (window.matchMedia) {
    coarse = window.matchMedia('(pointer: coarse)');
  } else {
    coarse = null;
  }
  var reduced;
  if (window.matchMedia) {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    reduced = null;
  }
  var reimuTimer = null;
  var reimuFrame = 0;
  var trail = null;
  var points = [];
  var timer = null;
  var lastMove = 0;
  function translated(values) {
    return window.siteText(values[0], values[1]);
  }
  function unlocked(id) {
    if (id === 'rainbow') {
      return state.caught;
    }
    if (id === 'chebu') {
      return state.eaten >= 10;
    }
    if (id === 'pen') {
      return state.wrote;
    }
    return id === 'reimu' || id === 'pixel' || id === 'system' || id === 'cross';
  }
  function save() {
    return cursorStorage(state) === true;
  }
  function removeTrail() {
    window.clearTimeout(timer);
    timer = null;
    points = [];
    document.removeEventListener('mousemove', move);
    if (trail && trail.parentNode) {
      trail.parentNode.removeChild(trail);
    }
    trail = null;
  }
  function move(event) {
    var now = Date.now();
    if (now - lastMove < 40) {
      return;
    }
    lastMove = now;
    points.unshift({ x: event.clientX - 10, y: event.clientY + 8 });
    if (points.length > 6) {
      points.pop();
    }
    for (var i = 0; i < trail.children.length; i++) {
      var part = trail.children[i];
      var point = points[i];
      part.style.display = point ? 'block' : 'none';
      if (point) {
        part.style.transform = 'translate(' + point.x + 'px,' + point.y + 'px)';
        part.style.opacity = String((6 - i) / 8);
      }
    }
    trail.hidden = false;
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (trail) {
        trail.hidden = true;
      }
      points = [];
    }, 240);
  }
  // 128 имён руками я набивать не буду.
  var reimuFrames = {};
  ['normal', 'link', 'text', 'blocked'].forEach(function (state) {
    var point;
    if (state === 'text') {
      point = 4;
    } else {
      point = 0;
    }
    reimuFrames[state] = [];
    for (var i = 0; i < 32; i++) {
      reimuFrames[state].push(['Курсоры/reimu-' + state + '-' + i + '.png', point, point]);
    }
  });
  var reimuPreloaded = false;
  // Кадр сменился, а точка клика обязана остаться там же. Иначе хрен по кнопке попадёшь.
  function animateReimu() {
    if (!reimuPreloaded) {
      for (var kind in reimuFrames)
        for (var j = 0; j < reimuFrames[kind].length; j++) {
          var preload = new Image();
          preload.src = reimuFrames[kind][j][0];
        }
      reimuPreloaded = true;
    }
    for (var kind in reimuFrames) {
      var frame = reimuFrames[kind][reimuFrame % reimuFrames[kind].length];
      var custom = choices.filter(function (c) {
        return c.id === 'reimu';
      })[0];
      if (kind === 'normal' && custom && custom.pointer)
        {
        frame = [custom.pointer, (custom.hotspot || [0, 0])[0], (custom.hotspot || [0, 0])[1]];
      }
      root.style.setProperty(
        '--reimu-' + kind,
        'url(' +
          frame[0] +
          ') ' +
          frame[1] +
          ' ' +
          frame[2] +
          ', ' +
          (kind === 'text'
            ? 'text'
            : kind === 'blocked'
              ? 'not-allowed'
              : kind === 'link'
                ? 'pointer'
                : 'auto')
      );
    }
    reimuFrame = (reimuFrame + 1) % 32;
    if (!(reduced && reduced.matches)) {
      reimuTimer = window.setTimeout(animateReimu, 50);
    }
  }
  // обычную стрелку, без всего этого хозяйства
  function apply() {
    window.clearTimeout(reimuTimer);
    reimuTimer = null;
    if (
      !unlocked(state.selected) ||
      !choices.some(function (c) {
        return c.id === state.selected;
      })
    )
      {
      state.selected = cursorConfig.default;
    }
    var actual;
    if (window.siteLowPower() || (coarse && coarse.matches)) {
      actual = 'system';
    } else {
      actual = state.selected;
    }
    root.setAttribute('data-cursor', actual);
    removeTrail();
    document.dispatchEvent(new Event('site-cursor-change'));
    if (actual === 'rainbow' && !(reduced && reduced.matches)) {
      trail = document.createElement('div');
      trail.className = 'cursor-trail';
      trail.setAttribute('aria-hidden', 'true');
      trail.hidden = true;
      for (var i = 0; i < 6; i++) trail.appendChild(document.createElement('i'));
      document.body.appendChild(trail);
      document.addEventListener('mousemove', move);
    }
    if (actual === 'reimu' && !document.hidden) {
      animateReimu();
    }
    label();
  }
  function label() {
    for (var i = 0; i < choices.length; i++) {
      var cursorChoice = choices[i];
      var button = buttons[i];
      var open = unlocked(cursorChoice.id);
      var title = translated(cursorChoice.action || cursorChoice.name);
      button.title = title;
      button.setAttribute('aria-label', translated(cursorChoice.name) + (open ? '' : '. ' + title));
      button.setAttribute('aria-disabled', String(!open));
      button.setAttribute('aria-pressed', String(state.selected === cursorChoice.id));
      button.className = 'cursor-choice' + (open ? '' : ' cursor-locked');
    }
  }
  for (var i = 0; i < choices.length; i++) {
    (function (cursorChoice) {
      var button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-choice', cursorChoice.id);
      var image = document.createElement('img');
      image.src = cursorChoice.image;
      image.alt = '';
      image.width = 32;
      image.height = 32;
      button.appendChild(image);
      button.onclick = function () {
        if (!unlocked(cursorChoice.id)) {
          return;
        }
        state.selected = cursorChoice.id;
        save();
        apply();
      };
      box.appendChild(button);
      buttons.push(button);
    })(choices[i]);
  }
  document.addEventListener('nyan-caught', function () {
    state.caught = true;
    save();
    label();
  });
  document.addEventListener('chebu-eaten', function () {
    state.eaten = eatenLimit(state.eaten + 1);
    save();
    label();
  });
  document.addEventListener('guestbook-submitted', function () {
    state.wrote = true;
    save();
    label();
  });
  document.addEventListener('site-mode-change', apply);
  document.addEventListener('site-language-change', label);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      removeTrail();
      window.clearTimeout(reimuTimer);
      reimuTimer = null;
    } else {
      apply();
    }
  });
  function listen(media) {
    if (!media) {
      return;
    }
    if (media.addEventListener) {
      media.addEventListener('change', apply);
    }
    else if (media.addListener) {
      media.addListener(apply);
    }
  }
  listen(coarse);
  listen(reduced);
  apply();
})();
