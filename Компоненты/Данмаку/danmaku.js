// Отдельная версия данмаку DANYAN. MIT, см. LICENSE.
// В саму запись с этой цензурой не лезть. Здесь отдельная фраза для полёта.

(function () {
  'use strict';
  var settings = { messageDelay: 10000, messageRandom: 5000 };
  var values = [];
  var lowPower = false;
  function isLowPower() { return lowPower; }
  var layer = document.createElement('div');
  var toggle = document.createElement('button');
  layer.className = 'danmaku-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  var back = document.createElement('div');
  back.className = 'danmaku-layer danmaku-back';
  back.setAttribute('aria-hidden', 'true');
  document.body.appendChild(back);
  toggle.className = 'danmaku-toggle';
  toggle.type = 'button';
  document.body.appendChild(toggle);
  var media;
  if (window.matchMedia) {
    media = window.matchMedia('(prefers-reduced-motion: reduce)');
  } else {
    media = null;
  }
  var enabled = !(media && media.matches);
  var timer = null;
  var active = 0;
  var last = -1;
  var nextLane = 0;
  var lanes = [12, 28, 44, 60, 76];
  
  function censorDanmaku(value) {
    return value.replace(/[а-яёa-z]+/gi, function (word) {
      var lower = word.toLowerCase();
      var index = -1;
      var rules = [
        ['пизд', 2],
        ['бляд', 1],
        ['блять', 1],
        ['хуй', 1],
        ['хуя', 1],
        ['хуе', 1],
        ['хуё', 1],
        ['хуи', 1],
        ['еба', 0],
        ['ебу', 0],
        ['ебл', 0],
        ['ебн', 0],
        ['ебё', 0],
        ['ебе', 0],
        ['еби', 0],
        ['ёб', 0],
        ['бля', 1],
        ['сука', 1],
        ['суч', 1],
        ['хер', 1],
        ['мудa', 1],
        ['муда', 1],
        ['говн', 1],
        ['гандон', 1],
        ['пидор', 2],
        ['пидар', 2],
        ['fuck', 1],
        ['shit', 1],
        ['bitch', 1],
        ['cunt', 1],
        ['dick', 1],
        ['asshole', 2],
        ['wanker', 1]
      ];
      for (var i = 0; i < rules.length; i++) {
        var start = lower.indexOf(rules[i][0]);
        if (start < 0) {
          continue;
        }
        /* стоп, Херсон тут вообще ни при чём. Исключения раньше замены. */
        if (
          /^(суккулент|сукно|сукон|сучок|страхер|херсон|херувим|херес|dickens|хулиган|страхуй|подстрахуй|рубля|мебел|ребён|ребен|колеб|хлеб|учеб|учёб|себе|тебе|небо|небес)/.test(
            lower
          )
        )
          {
          continue;
        }
        index = start + rules[i][1];
        break;
      }
      if (index < 0) {
        return word;
      }
      var chars = word.split('');
      chars[index] = '#';
      if (lower.indexOf('бляд') >= 0 || lower.indexOf('блять') >= 0) {
        chars[index + 2] = '*';
      }
      if (word.length === 3) {
        chars[index] = '*';
      }
      return chars.join('');
    });
  }
  function phrases() {
    return values;
  }
  function clear() {
    window.clearTimeout(timer);
    timer = null;
    layer.innerHTML = '';
    back.innerHTML = '';
    active = 0;
  }
  // две штуки максимум. На телефоне вообще одна, читать же надо как-то
  // У weizhenye данмаку отдельным движком, оставлю для сравнения:
  // https://github.com/weizhenye/Danmaku
  function launch() {
    if (
      isLowPower() ||
      !enabled ||
      document.hidden ||
      active >= ((window.innerWidth || 1000) <= 650 ? 1 : 2)
    )
      {
      return;
    }
    var list = phrases();
    if (!list.length) {
      return;
    }
    var pick = Math.floor(Math.random() * list.length);
    if (list.length > 1 && pick === last) {
      pick = (pick + 1) % list.length;
    }
    last = pick;
    var line = document.createElement('span');
    line.className = 'danmaku-line';
    line.textContent = censorDanmaku(list[pick]);
    line.style.top = lanes[nextLane++ % lanes.length] + '%';
    line.style.animationDuration = 13 + Math.floor(Math.random() * 5) + 's';
    line.style.color = ['#f1e5bd', '#d4e7be', '#eacba7'][Math.floor(Math.random() * 3)];
    active++;
    line.addEventListener('animationend', function () {
      if (line.parentNode) {
        line.parentNode.removeChild(line);
        active--;
      }
    });
    (Math.random() < 0.4 ? back : layer).appendChild(line);
  }
  function schedule() {
    window.clearTimeout(timer);
    if (isLowPower() || !enabled || document.hidden) {
      return;
    }
    timer = window.setTimeout(
      function () {
        launch();
        schedule();
      },
      settings.messageDelay + Math.floor(Math.random() * settings.messageRandom)
    );
  }
  function label() {
    toggle.disabled = isLowPower();
    toggle.textContent = enabled && !isLowPower() ? 'ДАНМАКУ: ВКЛ' : 'ДАНМАКУ: ВЫКЛ';
    toggle.setAttribute('aria-pressed', String(enabled && !isLowPower()));
  }
  toggle.onclick = function () {
    enabled = !enabled;
    clear();
    label();
    if (enabled) {
      launch();
      schedule();
    }
  };
  document.addEventListener('visibilitychange', function () {
    clear();
    if (!document.hidden && enabled) {
      launch();
      schedule();
    }
  });
  function reduced(e) {
    if (e.matches) {
      enabled = false;
      clear();
      label();
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
  document.addEventListener('danmaku-updated', function () {
    clear();
    schedule();
  });
  document.addEventListener('site-mode-change', function () {
    clear();
    label();
    schedule();
  });
  window.Danmaku = {
    setPhrases: function (list) {
      values = [];
      for (var i = 0; i < list.length; i++) {
        var text = String(list[i]).replace(/\s+/g, ' ').trim();
        if (text.length > 64) {
          text = text.slice(0, 64);
          if (/[\uD800-\uDBFF]$/.test(text)) {
            text = text.slice(0, -1);
          }
        }
        if (text) {
          values.push(text);
        }
      }
      last = -1;
      clear();
      if (enabled) { launch(); schedule(); }
    },
    start: function () {
      if (media && media.matches) {
        return;
      }
      enabled = true;
      clear(); label(); launch(); schedule();
    },
    stop: function () { enabled = false; clear(); label(); },
    setLowPower: function (value) {
      lowPower = Boolean(value);
      clear(); label();
      if (!lowPower && enabled) { launch(); schedule(); }
    }
  };
  label();
})();
