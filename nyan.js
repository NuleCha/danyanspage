// В тишине кота не выпускать.

(function () {
  'use strict';
  var settings = window.SITE_SETTINGS;
  var media;
  if (window.matchMedia) {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    media = null;
  }
  var timer = null;
  var cleanup = null;
  var cat = null;
  var playing = false;
  function clear() {
    window.clearTimeout(timer);
    window.clearTimeout(cleanup);
    timer = null;
    if (cat && cat.parentNode) {
      cat.parentNode.removeChild(cat);
    }
    cat = null;
  }
  function allowed() {
    if (window.siteLowPower()) {
      return false;
    }
    if (!playing) {
      return false;
    }
    if (document.hidden) {
      return false;
    }
    if (media && media.matches) {
      return false;
    }
    return true;
  }
  function schedule(first) {
    if (!allowed()) {
      return;
    }
    var delay = settings.catFirstDelay;
    if (!first) {
      delay = settings.catDelay + Math.floor(Math.random() * settings.catRandom);
    }
    timer = window.setTimeout(fly, delay);
  }
  // Сначала убрать этого, потом ставить следующий таймер.
  function finish() {
    if (cat && cat.parentNode) {
      cat.parentNode.removeChild(cat);
    }
    cat = null;
    window.clearTimeout(cleanup);
    schedule(false);
  }
  function fly() {
    if (!allowed()) {
      return;
    }
    cat = document.createElement('button');
    cat.type = 'button';
    cat.title = 'Поймать Nyan Cat';
    cat.className = 'nyan-flight';
    cat.setAttribute('aria-label', 'Поймать Nyan Cat');
    cat.onclick = function () {
      var event = document.createEvent('Event');
      event.initEvent('nyan-caught', false, false);
      document.dispatchEvent(event);
      finish();
    };
    cat.style.top = 8 + Math.floor(Math.random() * 25) + 'px';
    var img = document.createElement('img');
    img.src = 'nyan.gif';
    img.alt = '';
    img.width = 68;
    img.height = 42;
    cat.appendChild(img);
    document.body.appendChild(cat);
    cat.addEventListener('animationend', finish);
    cleanup = window.setTimeout(finish, 12500);
  }
  document.addEventListener('visibilitychange', function () {
    clear();
    schedule(false);
  });
  function changed() {
    clear();
    schedule(false);
  }
  if (media) {
    if (media.addEventListener) {
      media.addEventListener('change', changed);
    }
    else if (media.addListener) {
      media.addListener(changed);
    }
  }
  document.addEventListener('caramel-start', function () {
    playing = true;
    clear();
    schedule(true);
  });
  document.addEventListener('caramel-stop', function () {
    playing = false;
    clear();
  });
  document.addEventListener('site-mode-change', changed);
  if (allowed()) {
    schedule(true);
  }
})();
