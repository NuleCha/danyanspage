// localStorage может просто послать нахуй. Ладно, тогда без сохранения.
(function () {
  'use strict';
  var root = document.documentElement;
  var low = false;
  var lang = 'ru';
  try {
    low = localStorage.getItem('danyan-low-power') === 'true';
    if (localStorage.getItem('danyan-language') === 'en') {
      lang = 'en';
    } else {
      lang = 'ru';
    }
  } catch (ignore) {}
  root.setAttribute('data-low-power', String(low));
  root.lang = lang;
  window.siteLowPower = function () {
    return root.getAttribute('data-low-power') === 'true';
  };
  window.siteText = function (ru, en) {
    if (root.lang === 'en') {
      return en;
    }
    return ru;
  };
  document.addEventListener('DOMContentLoaded', function () {
    var button = document.getElementById('low-power');
    var telegram = document.getElementById('telegram-link');
    var telegramUrl = ((window.SITE_SETTINGS || {}).telegramUrl || '').trim();
    if (telegram && /^https:\/\/t\.me\/[a-zA-Z0-9_+/?=-]+$/.test(telegramUrl)) {
      telegram.href = telegramUrl;
      telegram.hidden = false;
    }

    var title = document.getElementById('simple-title');
    var state = document.getElementById('simple-state');
    if (!button || !title || !state) {
      return;
    }
    // В атрибуте уже есть состояние, второе такое же мне не надо.
    function label() {
      title.textContent = window.siteText('УПРОЩЁННЫЙ РЕЖИМ', 'SIMPLIFIED MODE');
      state.textContent = window.siteText(
        window.siteLowPower() ? 'ВКЛ' : 'ВЫКЛ',
        window.siteLowPower() ? 'ON' : 'OFF'
      );
      button.setAttribute('aria-pressed', String(window.siteLowPower()));
    }
    button.onclick = function () {
      root.setAttribute('data-low-power', String(!window.siteLowPower()));
      try {
        localStorage.setItem('danyan-low-power', String(window.siteLowPower()));
      } catch (ignore) {}
      label();
      var event = document.createEvent('Event');
      event.initEvent('site-mode-change', false, false);
      document.dispatchEvent(event);
    };
    document.addEventListener('site-language-change', label);
    label();
  });
})();
