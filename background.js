// Один набор окон, меняю только свет. Перерисовывать весь дом не надо БЛЕАТ.

(function () {
  'use strict';
  function random(last) {
    var number = Math.random() * (last + 1);
    return Math.floor(number);
  }
  var settings = window.SITE_SETTINGS;
  var facade = document.getElementById('facade');
  var pause = document.getElementById('pause');
  var scale = document.getElementById('scale');
  var status = document.getElementById('status');
  var tiles = [];
  var size = 96;
  var timer = null;
  var paused = false;
  var changes = 0;
  var garlandTimer = null;
  var media;
  if (window.matchMedia) {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    media = null;
  }
  if (media && media.matches) {
    paused = true;
  }
  function display(tile) {
    var col = tile.variant % 5;
    var row = Math.floor(tile.variant / 5) + (tile.lit ? 5 : 0);
    tile.el.style.backgroundPosition = -col * size + 'px ' + -row * size + 'px';
  }
  function changeWindow() {
    if (!tiles.length) {
      return;
    }
    var visible = [];
    for (var i = 0; i < tiles.length; i++) {
      var bottom = parseInt(tiles[i].el.style.top, 10) + size;
      if (bottom < (window.innerHeight || 720) - 70) {
        visible.push(tiles[i]);
      }
    }
    var pool;
    if (visible.length) {
      pool = visible;
    } else {
      pool = tiles;
    }
    var tile = pool[random(pool.length - 1)];
    tile.lit = !tile.lit;
    display(tile);
    changes++;
    status.textContent = 'Переключений: ' + changes + ' · каждые 2–4 с';
  }
  // Один таймер на свет, второй на гирлянды. Перед запуском старые гашу.
  function schedule() {
    window.clearTimeout(timer);
    timer = null;
    window.clearTimeout(garlandTimer);
    garlandTimer = null;
    if (window.siteLowPower() || paused || document.hidden || !tiles.length) return;
    scheduleGarlands();
    timer = window.setTimeout(
      function () {
        
        changeWindow();
        schedule();
      },
      settings.windowDelay + random(settings.windowRandom - 1)
    );
  }
  function scheduleGarlands() {
    if (window.siteLowPower() || paused || document.hidden) {
      return;
    }
    garlandTimer = window.setTimeout(
      function () {
        for (var i = 0; i < tiles.length; i++) {
          var t = tiles[i];
          if ([1, 4, 6, 9, 12, 14].indexOf(t.variant) !== -1 && Math.random() < 0.45) {
            t.garland = !t.garland;
            t.el.style.backgroundImage = t.garland
              ? 'url(panels-garland.png)'
              : 'url(panels-v3.png)';
          }
        }
        scheduleGarlands();
      },
      settings.garlandDelay + random(settings.garlandRandom - 1)
    );
  }
  // Размер изменился - всю раскладку заново. В тиках света сюда не лезть.
  function build() {
    if (window.siteLowPower()) {
      tiles = [];
      facade.innerHTML = '';
      schedule();
      return;
    }
    var width = window.innerWidth || document.documentElement.clientWidth;
    var height = window.innerHeight || document.documentElement.clientHeight;
    size = parseInt(scale.value, 10);
    // Огромный экран не значит, что можно набить сюда бесконечный DOM.
    if (Math.ceil(width / size) * Math.ceil(height / size) > 600)
      {
      size = Math.ceil(Math.sqrt((width * height) / 500));
    }
    var cols = Math.ceil(width / size);
    var rows = Math.ceil(height / size);
    var fragment = document.createDocumentFragment();
    tiles = [];
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var variant;
        do {
          variant = random(15);
        } while (
          (x && tiles[tiles.length - 1].variant === variant) ||
          (y && tiles[(y - 1) * cols + x].variant === variant)
        );
        var el = document.createElement('div');
        el.className = 'panel';
        el.style.cssText =
          'left:' +
          x * size +
          'px;top:' +
          y * size +
          'px;width:' +
          size +
          'px;height:' +
          size +
          'px;background-size:' +
          size * 5 +
          'px ' +
          size * 10 +
          'px';
        var tile = { el: el, variant: variant, lit: Math.random() < 0.22 };
        display(tile);
        tiles.push(tile);
        fragment.appendChild(el);
      }
    }
    facade.innerHTML = '';
    facade.appendChild(fragment);
    facade.style.width = cols * size + 'px';
    facade.style.height = rows * size + 'px';
    status.textContent = tiles.length + ' панелей · 1 PNG';
    schedule();
  }
  function updatePause() {
    pause.textContent = paused ? 'Свет: пауза' : 'Свет: живёт';
    pause.setAttribute('aria-pressed', String(paused));
    schedule();
  }
  pause.onclick = function () {
    paused = !paused;
    updatePause();
  };
  document.getElementById('shuffle').onclick = build;
  document.getElementById('test').onclick = changeWindow;
  scale.onchange = build;
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 200);
  });
  window.addEventListener('pagehide', function () {
    window.clearTimeout(resizeTimer);
  });
  document.addEventListener('visibilitychange', schedule);
  function reduced(e) {
    if (e.matches) {
      paused = true;
      updatePause();
    }
  }
  if (media) {
    if (media.addEventListener) {
      media.addEventListener('change', reduced);
    }
    else if (media.addListener) {
      media.addListener(reduced);
    }
  }
  document.addEventListener('site-mode-change', build);
  build();
  updatePause();
})();
