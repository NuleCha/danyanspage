(function () {
  'use strict';
  // Высоту надо узнать изнутри. Вот как это разбирают в iframe-resizer:
  // https://github.com/davidjbradshaw/iframe-resizer
  if (location.hostname === 'danyanspage.neocities.org') {
    var host = document.getElementById('guestbook');
    var frame = document.createElement('iframe');
    var phrases = document.createElement('div');
    phrases.id = 'guest-posts';
    phrases.hidden = true;
    host.textContent = '';
    frame.title = document.documentElement.lang === 'en' ? 'Guestbook' : 'Гостевая';
    frame.src =
      'https://danyanxdd.pythonanywhere.com/_guestbook?lang=' +
      document.documentElement.lang +
      '&low=' +
      (document.documentElement.getAttribute('data-low-power') === 'true' ? '1' : '0');
    frame.style.cssText = 'width:100%;height:1300px;border:0;display:block';
    host.appendChild(frame);
    host.appendChild(phrases);
    // Гостевая с другого сервера. Поэтому, блять, опять postMessage.
    window.addEventListener('message', function (event) {
      if (
        event.origin !== 'https://danyanxdd.pythonanywhere.com' ||
        event.source !== frame.contentWindow ||
        !event.data
      )
        {
        return;
      }
      if (event.data.type === 'guestbook-frame') {
        var height = Number(event.data.height);
        if (height > 0 && height < 20000) {
          frame.style.height = Math.ceil(height) + 'px';
        }
        phrases.textContent = '';
        var values;
        if (Array.isArray(event.data.phrases)) {
          values = event.data.phrases.slice(0, 20);
        } else {
          values = [];
        }
        for (var i = 0; i < values.length; i++) {
          if (typeof values[i] !== 'string') {
            continue;
          }
          var entry = document.createElement('article');
          entry.className = 'guest-entry';
          entry.setAttribute('data-danmaku', values[i].slice(0, 64));
          phrases.appendChild(entry);
        }
        var changed = document.createEvent('Event');
        changed.initEvent('guestbook-updated', false, false);
        document.dispatchEvent(changed);
      }
      if (event.data.type === 'guestbook-submitted') {
        var done = document.createEvent('Event');
        done.initEvent('guestbook-submitted', false, false);
        document.dispatchEvent(done);
      }
    });
    document.addEventListener('site-language-change', function () {
      frame.title = document.documentElement.lang === 'en' ? 'Guestbook' : 'Гостевая';
      frame.src =
        'https://danyanxdd.pythonanywhere.com/_guestbook?lang=' +
        document.documentElement.lang +
        '&low=' +
        (document.documentElement.getAttribute('data-low-power') === 'true' ? '1' : '0');
    });
    return;
  }
  var get = function (id) {
    return document.getElementById(id);
  };
  var form = get('guest-form');
  var message = get('guest-message');
  var quote = get('guest-quote');
  var enabled = get('guest-danmaku');
  var preview = get('guest-quote-preview');
  var status = get('guest-status');
  var submit = get('guest-submit');
  var list = get('guest-posts');
  var api = String(window.GUESTBOOK_API || window.SITE_SETTINGS.guestbookApiUrl || '').replace(
    /\/$/,
    ''
  );
  var moderatorKey = '';
  var token = '';
  var tokenLoading = false;
  var loading = false;
  var manualQuote = false;
  var next = null;
  var seen = {};
  function text(ru, en) {
    return window.siteText(ru, en);
  }
  var reactionVisitor = '';
  try {
    reactionVisitor = localStorage.getItem('danyan-reaction-visitor') || '';
  } catch (ignore) {}
  if (!/^[a-f0-9]{32}$/.test(reactionVisitor)) {
    reactionVisitor = '';
    if (window.crypto && window.crypto.getRandomValues) {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      for (var v = 0; v < bytes.length; v++)
        reactionVisitor += ('0' + bytes[v].toString(16)).slice(-2);
    } else {
      reactionVisitor = '';
      for (var v = 0; v < 32; v++)
        reactionVisitor += Math.floor(Math.random() * 16).toString(16);
    }
    try {
      localStorage.setItem('danyan-reaction-visitor', reactionVisitor);
    } catch (ignore) {}
  }
  var reactionKinds = [
    ['rofl', 'Смех', 'Laugh', 1],
    ['clap', 'Одобрямс', 'Applause', 2],
    ['crazy', 'Попячся', 'Crazy', 3],
    ['party', 'Туса', 'Party', 4],
    ['devil', 'Хитро', 'Devil', 5],
    ['wall', 'Апстену', 'Facepalm', 6],
    ['dance', 'Пляшем', 'Dance', 7],
    ['hello', 'Превед', 'Hello', 8],
    ['smile', 'Улыбка', 'Smile', 9],
    ['biggrin', 'Ржу', 'Grin', 10],
    ['wink', 'Подмигнуть', 'Wink', 11],
    ['sad', 'Грусть', 'Sad', 12],
    ['cray', 'Плачу', 'Cry', 13],
    ['shok', 'Шок', 'Shocked', 14],
    ['mega_shok', 'ЧТО?!', 'What?!', 15],
    ['blush', 'Смущение', 'Blush', 16],
    ['scratch_one-s_head', 'Задумался', 'Thinking', 17],
    ['unknw', 'Не знаю', 'Shrug', 18],
    ['boredom', 'Скучно', 'Bored', 19],
    ['yahoo', 'Ура!', 'Hooray', 20],
    ['good', 'Круто', 'Thumbs up', 21],
    ['yes', 'Согласен', 'Agree', 22],
    ['nea', 'Не согласен', 'Disagree', 23],
    ['ok', 'Окей', 'Okay', 24],
    ['thank_you2', 'Спасибо', 'Thank you', 25],
    ['sorry', 'Извини', 'Sorry', 26],
    ['give_heart', 'Сердечко', 'Heart', 27],
    ['air_kiss', 'Воздушный поцелуй', 'Blow a kiss', 28],
    ['give_rose', 'Цветочек', 'Flower', 29],
    ['friends', 'Дружба', 'Friends', 30],
    ['drinks', 'За это!', 'Cheers', 31],
    ['music', 'Музыка', 'Music', 32],
    ['popcorm1', 'Смотрю с попкорном', 'Popcorn', 33],
    ['rtfm', 'Читай инструкцию', 'Read the manual', 34],
    ['ireful1', 'Злость', 'Angry', 35],
    ['angel', 'Ангел', 'Angel', 36],
    ['secret', 'Секрет', 'Secret', 37],
    ['bye', 'Пока', 'Goodbye', 38],
    ['help', 'Помогите', 'Help', 39],
    ['sarcastic', 'Сарказм', 'Sarcasm', 40]
  ];
  // Сначала сервер. Нарисую +1 заранее, потом буду откатывать этот цирк.
  // Если список смайлов распухнет, у emoji-picker-element можно подсмотреть поиск:
  // https://github.com/nolanlawson/emoji-picker-element
  function reactionRow(entry) {
    var row = document.createElement('div');
    row.className = 'guest-reactions';
    row.setAttribute('role', 'group');
    var state = entry.reactions || { counts: {}, mine: null };
    var buttons = [];
    var choices = [];
    var busy = false;
    var picker = document.createElement('details');
    picker.className = 'reaction-picker';
    var opener = document.createElement('summary');
    opener.className = 'reaction-opener';
    opener.appendChild(icon('picker'));
    var pickerFallback = document.createElement('span');
    pickerFallback.className = 'reaction-fallback';
    pickerFallback.textContent = ':)';
    opener.appendChild(pickerFallback);
    picker.appendChild(opener);
    var palette = document.createElement('div');
    palette.className = 'reaction-palette';
    picker.appendChild(palette);
    var search = document.createElement('input');
    search.type = 'search';
    search.className = 'reaction-search';
    search.autocomplete = 'off';
    palette.appendChild(search);
    search.oninput = function () {
      var q = search.value.trim().toLowerCase();
      for (var i = 0; i < choices.length; i++)
        choices[i].hidden =
          q &&
          (reactionKinds[i][1] + ' ' + reactionKinds[i][2]).toLowerCase().indexOf(q) === -1;
    };
    function icon(kind) {
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src =
        (location.hostname === 'danyanxdd.pythonanywhere.com'
          ? 'https://danyanspage.neocities.org/'
          : '') +
        'Картинки/Смайлы/' +
        kind +
        '.gif';
      return img;
    }
    function render() {
      row.setAttribute('aria-label', text('Реакции', 'Reactions'));
      search.placeholder = text('Найти смайл', 'Find a smiley');
      search.setAttribute('aria-label', text('Найти смайл', 'Find a smiley'));
      opener.setAttribute('aria-label', text('Выбрать реакцию', 'Choose a reaction'));
      opener.title = text('Выбрать реакцию', 'Choose a reaction');
      for (var j = 0; j < buttons.length; j++) {
        var b = buttons[j];
        var chosen = state.mine === b.kind;
        var n = state.counts[b.kind] || 0;
        var label = text(b.ru, b.en);
        b.button.hidden = !n;
        b.button.setAttribute('aria-pressed', String(chosen));
        b.count.textContent = String(n);
        b.button.disabled = busy;
        b.fallback.textContent = label;
        b.button.title = label + ': ' + n;
        b.button.setAttribute('aria-label', label + ': ' + n);
        choices[j].setAttribute('aria-pressed', String(chosen));
        choices[j].setAttribute('aria-label', label);
        choices[j].title = label;
        choices[j].disabled = busy;
      }
    }
    function choose(kind) {
      if (busy) {
        return;
      }
      busy = true;
      render();
      request(
        'POST',
        '/reactions',
        { id: entry.id, kind: kind, visitor: reactionVisitor },
        function (error, data) {
          busy = false;
          if (error) {
            showError(status, error);
          }
          else {
            state = data;
            picker.open = false;
          }
          render();
          if (!error) {
            for (var i = 0; i < buttons.length; i++)
              if (buttons[i].kind === kind && !buttons[i].button.hidden) {
                var c = buttons[i].count;
                c.classList.remove('reaction-pop');
                void c.offsetWidth;
                c.classList.add('reaction-pop');
              }
          }
        }
      );
    }
    reactionKinds.forEach(function (k) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'guest-reaction';
      var fallback = document.createElement('span');
      fallback.className = 'reaction-fallback';
      var count = document.createElement('span');
      count.className = 'reaction-count';
      button.appendChild(icon(k[0]));
      button.appendChild(fallback);
      button.appendChild(count);
      buttons.push({
        kind: k[0],
        button: button,
        count: count,
        ru: k[1],
        en: k[2],
        fallback: fallback
      });
      button.onclick = function () {
        choose(k[0]);
      };
      row.appendChild(button);
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'reaction-choice';
      option.appendChild(icon(k[0]));
      var word = document.createElement('span');
      word.className = 'reaction-fallback';
      word.textContent = k[3];
      option.appendChild(word);
      option.onclick = function () {
        choose(k[0]);
      };
      palette.appendChild(option);
      choices.push(option);
    });
    row.appendChild(picker);
    picker.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        picker.open = false;
        opener.focus();
      }
    });
    row.updateReactionLabels = render;
    render();
    return row;
  }

  var owned = {};
  try {
    owned = JSON.parse(localStorage.getItem('danyan-guestbook-owned') || '{}') || {};
  } catch (ignore) {}
  var localized = [];
  function setText(node, ru, en) {
    var found = false;
    for (var i = 0; i < localized.length; i++)
      if (localized[i].node === node) {
        localized[i].ru = ru;
        localized[i].en = en;
        found = true;
        break;
      }
    if (!found) {
      localized.push({ node: node, ru: ru, en: en });
    }
    node.textContent = text(ru, en);
  }

  // Родительский переводчик в этот iframe не пролезет. Значит, свой.
  var guestDictionary = {
    'Для реакций браузер сохраняет случайный идентификатор. Сервер хранит его хеш и выбранные реакции; другим посетителям видны только общие числа.':
      'For reactions, your browser stores a random identifier. The server stores its hash and your reaction choices; other visitors see only the totals.',
    'КТО ТУТ БЫЛ': 'WHO WAS HERE',
    'ЕЩЁ ЗАПИСИ': 'MORE MESSAGES',
    ОБНОВИТЬ: 'REFRESH',
    'О гостевой и данных': 'Guestbook and data',
    'Записи хранятся на отдельном сервере PythonAnywhere и видны всем после публикации. Пиши под ником, не оставляй личные данные. Для защиты от спама сервер хранит хеш адреса подключения; PythonAnywhere также ведёт технические журналы. Настройки, достижения и право отключить свою фразу сохраняются в этом браузере. После очистки данных браузера отключить фразу поможет модератор. Связаться можно через ТГ в меню.':
      'Messages are stored on a separate PythonAnywhere server and become public after publication. Use a nickname and do not share personal information. To prevent spam, the server stores a hash of your connection address; PythonAnywhere also keeps technical logs. Settings, achievements and permission to remove your own flying phrase are stored in this browser. If you clear your browser data, a moderator can help remove the phrase. Contact me through Telegram in the menu.',
    'Как тебя записать?': 'Your name?',
    'Записка (до 3000 знаков)': 'Message (up to 3000 characters)',
    'Оставь пустым': 'Leave empty',
    'Фраза для полёта': 'Flying phrase',
    'Пустить фразу по сайту': 'Let this phrase fly across the site',
    'Полная запись останется в гостевой. Летать будет только эта фраза.':
      'Your full message stays in the guestbook. Only this phrase will fly.',
    'ВЗЯТЬ ВЫДЕЛЕННОЕ': 'USE SELECTED TEXT',
    'Выбери фрагмент своей записи, до 64 знаков':
      'Choose a part of your message, up to 64 characters',
    ОТПРАВИТЬ: 'SEND'
  };
  var staticLabels = [];
  // сначала сохранить русский!
  // После замены здесь уже английский. Запомню его - обратно начнётся ебля.
  function collectLabels(node) {
    if (node.nodeType === 3) {
      var value = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (guestDictionary[value])
        {
        staticLabels.push({
          node: node,
          ru: node.nodeValue,
          en: guestDictionary[value]
        });
      }
      return;
    }
    if (
      node.nodeType !== 1 ||
      /^(SCRIPT|STYLE|INPUT|TEXTAREA)$/.test(node.nodeName) ||
      /^(guest-posts|guest-status|guest-load-status|guest-service-note|guest-quote-preview)$/.test(
        node.id
      )
    )
      {
      return;
    }
    for (var child = node.firstChild; child; child = child.nextSibling) collectLabels(child);
  }
  collectLabels(get('guestbook'));
  function staticLanguage() {
    for (var i = 0; i < staticLabels.length; i++) {
      var label = staticLabels[i];
      label.node.nodeValue = text(label.ru, label.en);
    }
    get('guest-name').placeholder = text('Анон', 'Anon');
    preview.setAttribute(
      'aria-label',
      text('Предпросмотр летающей фразы', 'Flying phrase preview')
    );
    if (location.hostname === 'danyanxdd.pythonanywhere.com')
      {
      document.title = text('Гостевая DANYAN', 'DANYAN Guestbook');
    }
  }
  var serverErrors = {
    'Обнови страницу, чтобы поставить реакцию.': 'Refresh the page to react.',
    'Неизвестная реакция.': 'Unknown reaction.',
    'Слишком быстро. Подожди секунду.': 'Too fast. Please wait a second.',
    'Обнови форму и подожди пару секунд перед отправкой.':
      'Refresh the form and wait a couple of seconds before sending.',
    'Некорректная запись.': 'Invalid message.',
    'Запись отклонена антиспамом.': 'The anti-spam filter rejected this message.',
    'Поля записи должны быть текстом.': 'Message fields must contain text.',
    'Имя — до 32 знаков, запись — от 1 до 3000.':
      'Use up to 32 characters for your name and 1–3000 for your message.',
    'В тексте есть недопустимые управляющие символы.':
      'The text contains unsupported control characters.',
    'Для полёта выбери фразу из своей записи, до 64 знаков.':
      'Choose a phrase from your message, up to 64 characters, for danmaku.',
    'Подожди полминуты перед следующей записью.':
      'Wait 30 seconds before sending another message.',
    'Такая запись уже отправлена.': 'This message has already been sent.',
    'Слишком много записей за час. Попробуй позже.':
      'Too many messages in one hour. Please try again later.',
    'Нет права отключить эту фразу.':
      'This browser does not have permission to remove this phrase.',
    'Источник запроса не разрешён.': 'Requests from this origin are not allowed.',
    'Некорректный запрос.': 'Invalid request.',
    'Некорректная страница.': 'Invalid page.',
    'Некорректный размер запроса.': 'Invalid request size.',
    'Слишком большой запрос.': 'The request is too large.',
    'Ожидается JSON.': 'The server expected JSON.',
    'Не удалось прочитать запись.': 'The message could not be read.',
    'Не найдено.': 'Not found.',
    'Можно удалять только свои записи.': 'You can only delete your own messages.',
    'Нужен ключ модератора.': 'Moderator key required.',
    'Запись не найдена.': 'Message not found.',
    'Не удалось выполнить запрос. Попробуй позже.':
      'The request could not be completed. Please try again later.'
  };
  function responseError(data) {
    var ru = data.message || 'Не удалось выполнить запрос. Попробуй позже.';
    var en = serverErrors[ru] || 'The request could not be completed. Please try again later.';
    var error = new Error(text(ru, en));
    error.ru = ru;
    error.en = en;
    return error;
  }
  function showError(node, error) {
    setText(node, error.ru || error.message, error.en || error.message);
  }

  function normalize(value) {
    return value.replace(/\s+/g, ' ').trim();
  }
  // Последний символ может оказаться половиной эмодзи.
  // Такую половину выкидываю, иначе на конце битая хрень.
  function slice(value, length) {
    var part = value.slice(0, length);
    if (/[\uD800-\uDBFF]$/.test(part)) {
      part = part.slice(0, -1);
    }
    return part;
  }
  // Сеть отвалилась? Набранное из формы не вычищать.
  function request(method, path, payload, done) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, api + path, true);
    xhr.timeout = 12000;
    if (path.indexOf('/entries') === 0 && method === 'GET')
      {
      xhr.setRequestHeader('X-Guest-Visitor', reactionVisitor);
    }
    if (path.indexOf('/admin/') === 0)
      {
      xhr.setRequestHeader('Authorization', 'Bearer ' + moderatorKey);
    }
    if (payload) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.onload = function () {
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (ignore) {
        done(
          new Error(
            text('Сервис гостевой недоступен.', 'The guestbook service is unavailable.')
          )
        );
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        done(null, data);
      }
      else {
        done(responseError(data), data);
      }
    };
    xhr.onerror = xhr.ontimeout = function () {
      done(
        new Error(
          text(
            'Нет связи с гостевой. Текст остался в форме.',
            'Could not reach the guestbook. Your text is still in the form.'
          )
        )
      );
    };
    xhr.send(payload ? JSON.stringify(payload) : null);
  }
  function phrasePreview() {
    quote.disabled = !enabled.checked;
    get('guest-select-quote').disabled = !enabled.checked;
    var value = normalize(quote.value);
    preview.textContent =
      enabled.checked && value
        ? value
        : text('Фраза не будет летать.', 'This message will not fly across the page.');
    get('guest-quote-count').textContent = value.length + ' / 64';
  }
  message.oninput = function () {
    if (!manualQuote) {
      var value = normalize(message.value);
      var sentences = value.match(/[^.!?\n]+[.!?]?/g) || [];
      var suitable = '';
      for (var i = 0; i < sentences.length; i++)
        if (sentences[i].trim().length <= 64) {
          suitable = sentences[i].trim();
          break;
        }
      quote.value = suitable || slice(value, 64);
    }
    phrasePreview();
  };
  quote.oninput = function () {
    manualQuote = true;
    phrasePreview();
  };
  enabled.onchange = phrasePreview;
  get('guest-select-quote').onclick = function () {
    var selected = normalize(
      message.value.slice(message.selectionStart || 0, message.selectionEnd || 0)
    );
    if (!selected || selected.length > 64) {
      setText(
        status,
        'Выдели в записи фразу до 64 знаков.',
        'Select a phrase of up to 64 characters in your message.'
      );
      return;
    }
    quote.value = selected;
    manualQuote = true;
    status.textContent = '';
    phrasePreview();
  };
  function append(entry) {
    if (seen[entry.id]) {
      return;
    }
    seen[entry.id] = true;
    var article = document.createElement('article');
    var heading = document.createElement('b');
    article.className = 'guest-entry';
    if (entry.danmaku && entry.quote)
      {
      article.setAttribute('data-danmaku', slice(entry.quote, 64));
    }
    heading.textContent = entry.name;
    article.appendChild(heading);
    var date = document.createElement('time');
    date.dateTime = new Date(entry.created * 1000).toISOString();
    date.textContent = new Date(entry.created * 1000).toLocaleDateString(
      document.documentElement.lang === 'en' ? 'en-GB' : 'ru-RU'
    );
    article.appendChild(date);
    var p = document.createElement('p');
    if (entry.message.length > 400) {
      p.textContent = slice(entry.message, 220) + '…';
      article.appendChild(p);
      var details = document.createElement('details');
      var summary = document.createElement('summary');
      setText(summary, 'Читать запись полностью', 'Read the full message');
      p = document.createElement('p');
      p.textContent = entry.message;
      details.appendChild(summary);
      details.appendChild(p);
      article.appendChild(details);
    } else {
      p.textContent = entry.message;
      article.appendChild(p);
    }
    if (owned[entry.id] && entry.danmaku) {
      var stop = document.createElement('button');
      stop.type = 'button';
      setText(stop, 'Убрать мою фразу из данмаку', 'Remove my phrase from danmaku');
      stop.onclick = function () {
        stop.disabled = true;
        request(
          'POST',
          '/phrase/stop',
          { id: entry.id, token: owned[entry.id] },
          function (error) {
            if (error) {
              showError(status, error);
              stop.disabled = false;
              return;
            }
            article.removeAttribute('data-danmaku');
            stop.parentNode.removeChild(stop);
            var event = document.createEvent('Event');
            event.initEvent('guestbook-updated', false, false);
            document.dispatchEvent(event);
            setText(
              status,
              'Фраза больше не участвует в данмаку. Запись осталась в книге.',
              'Your phrase is no longer in danmaku. The message stays in the guestbook.'
            );
          }
        );
      };
      article.appendChild(stop);
    }
    if (owned[entry.id] || moderatorKey) {
      var remove = document.createElement('button');
      remove.type = 'button';
      setText(remove, 'Удалить', 'Delete');
      remove.onclick = function () {
        if (!confirm(text('Удалить запись?', 'Delete this message?'))) {
          return;
        }
        remove.disabled = true;
        request(
          'POST',
          moderatorKey ? '/admin/delete' : '/delete',
          { id: entry.id, token: owned[entry.id] || '' },
          function (error) {
            if (error) {
              showError(status, error);
              remove.disabled = false;
              return;
            }
            delete owned[entry.id];
            try {
              localStorage.setItem('danyan-guestbook-owned', JSON.stringify(owned));
            } catch (ignore) {}
            load(false);
            setText(status, 'Запись удалена.', 'Message deleted.');
          }
        );
      };
      article.appendChild(remove);
    }
    article.appendChild(reactionRow(entry));
    list.appendChild(article);
  }
  function load(more) {
    if (!api || loading) {
      return;
    }
    loading = true;
    request(
      'GET',
      '/entries' + (more && next ? '?before=' + next : ''),
      null,
      function (error, data) {
        loading = false;
        if (error) {
          showError(get('guest-load-status'), error);
          return;
        }
        if (!more) {
          list.innerHTML = '';
          seen = {};
        }
        for (var i = 0; i < data.entries.length; i++) append(data.entries[i]);
        next = data.next;
        get('guest-more').hidden = !next;
        setText(
          get('guest-load-status'),
          list.children.length ? '' : 'Записей пока нет. Можно быть первым.',
          list.children.length ? '' : 'No messages yet. You can be first.'
        );
        var changed = document.createEvent('Event');
        changed.initEvent('guestbook-updated', false, false);
        document.dispatchEvent(changed);
      }
    );
  }
  function formToken() {
    if (!api || tokenLoading) {
      return;
    }
    tokenLoading = true;
    request('GET', '/form', null, function (error, data) {
      tokenLoading = false;
      if (error) {
        showError(status, error);
        submit.disabled = true;
        return;
      }
      token = data.token;
      submit.disabled = false;
    });
  }
  form.onsubmit = function (event) {
    event.preventDefault();
    if (!api || !token || submit.disabled) {
      return;
    }
    var excerpt = normalize(quote.value);
    var full = message.value.trim();
    if (
      enabled.checked &&
      (!excerpt || excerpt.length > 64 || normalize(full).indexOf(excerpt) === -1)
    ) {
      setText(
        status,
        'Выбери фразу из своей записи, до 64 знаков.',
        'Choose a phrase from your message, up to 64 characters.'
      );
      return;
    }
    submit.disabled = true;
    setText(status, 'Отправляю…', 'Sending…');
    request(
      'POST',
      '/entries',
      {
        name: get('guest-name').value || text('Анон', 'Anon'),
        message: full,
        quote: excerpt,
        danmaku: enabled.checked,
        website: get('guest-website').value,
        token: token
      },
      function (error, data) {
        submit.disabled = false;
        if (error) {
          showError(status, error);
          formToken();
          return;
        }
        if (data.ownerToken) {
          owned[data.id] = data.ownerToken;
          try {
            localStorage.setItem('danyan-guestbook-owned', JSON.stringify(owned));
          } catch (ignore) {}
        }
        form.reset();
        manualQuote = false;
        phrasePreview();
        if (data.status === 'approved') {
          setText(status, 'Запись опубликована.', 'Your message is published.');
          load(false);
        } else
          {
          setText(
            status,
            'Запись отправлена на модерацию. После одобрения появится здесь.',
            'Your message is awaiting moderation. It will appear here after approval.'
          );
        }
        formToken();
        var event = document.createEvent('Event');
        event.initEvent('guestbook-submitted', false, false);
        document.dispatchEvent(event);
      }
    );
  };
  get('guest-more').onclick = function () {
    load(true);
  };
  get('guest-refresh').onclick = function () {
    load(false);
    if (!token) {
      formToken();
    }
  };
  function labels() {
    staticLanguage();
    var reactionRows = list.querySelectorAll('.guest-reactions');
    for (var ri = 0; ri < reactionRows.length; ri++) reactionRows[ri].updateReactionLabels();
    for (var i = 0; i < localized.length; i++) {
      var item = localized[i];
      if (document.body.contains(item.node)) {
        item.node.textContent = text(item.ru, item.en);
      }
    }
    get('guest-service-note').textContent = api
      ? text(
          'Обычные записи появляются сразу, подозрительные — после проверки. Для данмаку можно выбрать короткую фразу.',
          'Regular messages appear immediately; suspicious ones await review. You can choose a short phrase for danmaku.'
        )
      : text(
          'Гостевая ещё не подключена. Отправка пока недоступна.',
          'The guestbook is not connected yet. Sending is currently unavailable.'
        );
    phrasePreview();
  }
  message.addEventListener('invalid', function () {
    message.setCustomValidity(
      message.validity.valueMissing ? text('Напиши записку.', 'Please write a message.') : ''
    );
  });
  message.addEventListener('input', function () {
    message.setCustomValidity('');
  });
  var modBox = document.createElement('details');
  var modTitle = document.createElement('summary');
  var modForm = document.createElement('form');
  var modInput = document.createElement('input');
  var modLogin = document.createElement('button');
  var modLogout = document.createElement('button');
  var modStatus = document.createElement('p');
  setText(modTitle, 'Модератор', 'Moderator');
  modBox.appendChild(modTitle);
  modInput.type = 'password';
  modInput.autocomplete = 'off';
  modInput.required = true;
  modInput.setAttribute('aria-label', text('Ключ модератора', 'Moderator key'));
  modLogin.type = 'submit';
  setText(modLogin, 'Войти', 'Log in');
  modLogout.type = 'button';
  setText(modLogout, 'Выйти', 'Log out');
  modLogout.hidden = true;
  modForm.appendChild(modInput);
  modForm.appendChild(modLogin);
  modBox.appendChild(modForm);
  modBox.appendChild(modLogout);
  modBox.appendChild(modStatus);
  get('guestbook').appendChild(modBox);
  modForm.onsubmit = function (e) {
    e.preventDefault();
    moderatorKey = modInput.value;
    modInput.value = '';
    modLogin.disabled = true;
    request('GET', '/admin/settings', null, function (error) {
      modLogin.disabled = false;
      if (error) {
        moderatorKey = '';
        showError(modStatus, error);
        return;
      }
      modStatus.textContent = '';
      modForm.hidden = true;
      modLogout.hidden = false;
      load(false);
    });
  };
  modLogout.onclick = function () {
    moderatorKey = '';
    modForm.hidden = false;
    modLogout.hidden = true;
    modStatus.textContent = '';
    load(false);
  };
  submit.disabled = true;
  get('guest-refresh').hidden = !api;
  document.addEventListener('site-language-change', labels);
  labels();
  if (api) {
    var started = false;
    function start() {
      if (started) {
        return;
      }
      started = true;
      load(false);
      formToken();
    }
    form.addEventListener('focusin', start);
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) {
            start();
            observer.disconnect();
          }
        },
        { rootMargin: '150px' }
      );
      observer.observe(get('guestbook'));
    } else {
      start();
    }
  }
})();
