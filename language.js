// Чужие записи сюда не тащить. Перевожу только интерфейс и свои карточки.
(function () {
  'use strict';
  var dictionary = {
    'КЛАССНЫЕ САЙТЫ': 'COOL SITES',
    'Музыка эмо-режима': 'Emo music credits',
    'ЧАТ ↗': 'CHAT ↗',
    'Press Start 2P: CodeMan38 · OFL. Фото микроволновки: Jstapko · CC BY-SA 3.0. Ручка: Twemoji · CC BY 4.0.':
      'Press Start 2P: CodeMan38 · OFL. Microwave photo: Jstapko · CC BY-SA 3.0. Pen: Twemoji · CC BY 4.0.',
    'АВТОРЫ И ЛИЦЕНЗИИ': 'CREDITS AND LICENSES',
    'Текстуры стен чата: Amal Kumar и Dimitrios Savva · Poly Haven · CC0. Бумага Paper Fibers: Heliodor Jalba · Subtle Patterns / Transparent Textures.':
      'Chat wall textures: Amal Kumar and Dimitrios Savva · Poly Haven · CC0. Paper Fibers: Heliodor Jalba · Subtle Patterns / Transparent Textures.',
    'Источники и обработка текстур': 'Texture sources and processing',
    'Лицензия смайлов': 'Smiley licence',
    'Лицензия шрифта': 'Font licence',
    'Авторы курсоров': 'Cursor credits',
    'Источники фотографий': 'Photo sources',
    Кнопки: 'Buttons',

    Главная: 'Home',
    Гостевая: 'Guestbook',
    'Чат ↗': 'Chat ↗',
    'МОЯ КНОПКА 88×31': 'MY BUTTON 88×31',
    'Код для твоего сайта': 'Code for your site',
    'Caramelldansen: музыка и мигающий свет': 'Caramelldansen: music and flashing lights',
    'О гостевой и данных': 'Guestbook and data',
    КУРСОРЫ: 'CURSORS',
    'Здесь можно выбрать курсор. Некоторые открываются от определённых действий на сайте.':
      'Choose a cursor here. Some unlock after certain actions on the site.',
    'КУРСОРЫ: АВТОРЫ ↗': 'CURSOR CREDITS ↗',
    'Записка (до 3000 знаков)': 'Message (up to 3000 characters)',
    'ЕЩЁ ЗАПИСИ': 'MORE MESSAGES',
    ОБНОВИТЬ: 'REFRESH',
    'Фраза для полёта': 'Flying phrase',
    'Пустить фразу по сайту': 'Let this phrase fly across the site',
    'Полная запись останется в гостевой. Летать будет только эта фраза.':
      'Your full message stays in the guestbook. Only this phrase will fly.',
    'ВЗЯТЬ ВЫДЕЛЕННОЕ': 'USE SELECTED TEXT',
    'Выбери фрагмент своей записи, до 64 знаков':
      'Choose a part of your message, up to 64 characters',
    ОТПРАВИТЬ: 'SEND',

    '* если сайт плохо грузится': '* if the site is slow to load',
    'ТГ ↗': 'TELEGRAM ↗',
    'СКОРО ЗДЕСЬ ЧТО-ТО БУДЕТ · ПОКА ТАК': 'SOMETHING WILL BE HERE SOON · THIS WILL DO FOR NOW',
    'DANYAN СТРАНИЧКА': 'DANYAN’S PAGE',
    'Теперь ещё и сайт. Ну дела!': 'And now a website, too. Well, well!',
    ОБЪЯВЛЕНИЯ: 'NOTICES',
    ГОСТЕВАЯ: 'GUESTBOOK',
    ССЫЛКИ: 'LINKS',
    'СВЕТ: ПАУЗА': 'LIGHTS: PAUSE',
    'СВЕТ: ВКЛЮЧИТЬ': 'LIGHTS: RESUME',
    'ФАКТЫ О ХАБАРОВСКЕ': 'KHABAROVSK FACTS',
    'Нажми — узнаешь что-нибудь крутое.': 'Click to learn something cool.',
    'ВЫДАТЬ ФАКТ': 'GET A FACT',
    'ЕЩЁ ФАКТ': 'ANOTHER FACT',
    'ЧЕБУПЕЛИ АХАХХА': 'CHEBUPELI HAHAHA',
    'НЕ ОТГИБАТЬ': 'DO NOT PEEL',
    'потянуть за уголок ↗': 'pull the corner ↗',
    '⑨ тебя же просили, НЕ ОТГИБАТЬ!': '⑨ you were told NOT TO PEEL IT!',
    ЗАПИСКА: 'A NOTE',
    'ТЫ КУДА ЗАЛЕЗ?': 'WHERE HAVE YOU WANDERED?',
    'В маленький личный угол интернета. Тут будут музыка, творчество и всякая штуковня, но это будет ещё дополняться. Пока можно потыкать бумажки и оставить след в гостевой.':
      'A tiny personal corner of the internet. Music, creative stuff and assorted things will live here, with more to come. For now, poke the scraps of paper and leave a message in the guestbook.',
    '>идёт стройка': '>under construction',
    'В РАЗРАБОТКЕ': 'IN PROGRESS',
    'РАНО ИЛИ ПОЗДНО НАЧНУ ПИСАТЬ МУЗЛО, НО МЕСТО УЖЕ ПОДГОТОВЛЕНО':
      'SOONER OR LATER I’LL MAKE MUSIC, BUT THE SPACE IS READY',
    'Когда будет что послушать — повешу здесь.':
      'When there is something to hear, I’ll put it here.',
    'запись пока не началась': 'recording has not started yet',
    'МАСТЕРСКАЯ ВСЯКОГО': 'ASSORTED STUFF WORKSHOP',
    'Здесь появится что-то ещё': 'Something else will appear here',
    'КТО ТУТ БЫЛ': 'WHO WAS HERE',
    'ПРОБНАЯ ГОСТЕВАЯ: записи видны только в этом браузере. Общая книга ещё не подключена.':
      'DEMO GUESTBOOK: messages are only stored in this browser. The shared guestbook is not connected yet.',
    'Как тебя записать?': 'Your name?',
    'Записка (до 500 знаков)': 'Message (up to 500 characters)',
    'ПРИКОЛОТЬ ЗАПИСКУ': 'PIN THE NOTE',
    'ПАСПОРТ ОБЪЕКТА': 'SITE PASSPORT',
    'Из чего собрано и куда можно уйти гулять.':
      'What this place is made of, and other places to visit.',
    'ЛИЦЕНЗИЯ ШРИФТА ↗': 'FONT LICENSE ↗',
    'Шрифт: CodeMan38 / OFL.': 'Font: CodeMan38 / OFL.',
    'АВТОРЫ И ЛИЦЕНЗИИ ↗': 'CREDITS AND LICENSES ↗',
    'МЕСТО ДЛЯ КНОПОК 88×31': 'SPACE FOR 88×31 BUTTONS',
    'СТРОЙКА НЕ ЗАКАНЧИВАЕТСЯ. МОЖНО ПРИХОДИТЬ.':
      'CONSTRUCTION NEVER ENDS. YOU CAN STILL VISIT.',
    'ДАНМАКУ: ВКЛ': 'DANMAKU: ON',
    'ДАНМАКУ: ВЫКЛ': 'DANMAKU: OFF',
    '■ СТОП': '■ STOP',
    'Если музыка не началась — нажми ▶ в плеере.':
      'If the music does not start, press ▶ in the player.',
    'Записка сохранена в этом браузере.': 'Your note was saved in this browser.',
    'Хранение недоступно: записка только до закрытия страницы.':
      'Storage is unavailable: your note will last until this page is closed.'
  };
  var cardTranslations = {
    'DANYAN — личная страничка': 'DANYAN — personal page',
    'УПРОЩЁННЫЙ РЕЖИМ': 'SIMPLIFIED MODE',
    ВЫКЛ: 'OFF',
    'В маленький личный угол интернета. Тут будут музыка, творчество и всякая штуковня, но это будет ещё дополняться. Пока можно потыкать бумажки и оставить след в гостевой, а также посидеть в чатике!':
      'A tiny personal corner of the internet. Music, creative projects and assorted stuff will appear here, with more to come. For now, poke around, leave a message in the guestbook or hang out in the chat!',
    'Записи появляются после одобрения.': 'Messages appear after approval.',
    'Записи хранятся на отдельном сервере PythonAnywhere и видны всем после публикации. Пиши под ником, не оставляй личные данные. Для защиты от спама сервер хранит хеш адреса подключения; PythonAnywhere также ведёт технические журналы. Настройки, достижения и право отключить свою фразу сохраняются в этом браузере. После очистки данных браузера отключить фразу поможет модератор. Связаться можно через ТГ в меню.':
      'Messages are stored on a separate PythonAnywhere server and become public when published. Use a nickname and do not share personal data. To prevent spam, the server stores a hash of your connection address; PythonAnywhere also keeps technical logs. Preferences, achievements and permission to disable your flying quote are saved in this browser. If you clear browser data, a moderator can disable your quote. Contact me through the Telegram link in the menu.',
    'Для реакций браузер сохраняет случайный идентификатор. Сервер хранит его хеш и выбранные реакции; другим посетителям видны только общие числа.':
      'Your browser saves a random identifier for reactions. The server stores its hash and your selected reactions; other visitors only see the totals.',
    'Оставь пустым': 'Leave blank',
    ПАНЕЛЬКА: 'APARTMENT BLOCK',
    'Другая раскладка': 'Another layout',
    'Свет: живёт': 'Lights: active',
    'Переключить окно сейчас': 'Switch a window now',
    Масштаб: 'Scale',
    Мелко: 'Small',
    Средне: 'Medium',
    Крупно: 'Large'
  };
  for (var translationKey in cardTranslations)
    dictionary[translationKey] = cardTranslations[translationKey];
  window.SITE_TRANSLATIONS = dictionary;
  if (
    document.body.classList.contains('chat-page') ||
    document.body.classList.contains('chat-embedded')
  )
    {
    return;
  }
  var records = [];
  var button = document.getElementById('language');
  var notice = document.getElementById('translation-note');
  // Русский сохранить ДО замены. Не после.
  function remember(node) {
    for (var i = 0; i < records.length; i++) if (records[i].node === node) {
      return records[i];
    }
    var record = { node: node, ru: '', en: '' };
    records.push(record);
    return record;
  }
  function translate(node) {
    if (node.nodeType === 3) {
      var parent = node.parentNode;
      if (
        !parent ||
        /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(parent.nodeName) ||
        (parent.closest &&
          parent.closest(
            '#guest-posts, #guest-quote-preview, #guest-load-status, #guest-status, #guest-service-note, .danmaku-line, #translation-note, #language, #low-power, #fortune-text[data-fact-active]'
          ))
      )
        {
        return;
      }
      var text = node.nodeValue;
      var normalized = text.replace(/\s+/g, ' ').trim();
      var record = remember(node);
      if (normalized !== record.en) {
        record.ru = text;
        record.en = dictionary[normalized] || '';
      }
      var next;
      if (document.documentElement.lang === 'en' && record.en) {
        next = record.en;
      } else {
        next = record.ru;
      }
      if (node.nodeValue !== next) {
        node.nodeValue = next;
      }
    } else {
      if (node.nodeType !== 1 && node.nodeType !== 9) {
        return;
      }
      if (/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(node.nodeName)) {
        return;
      }
      // Перевод приклеен к карточке, а не к её старому заголовку.
      if (node.nodeType === 1 && node.hasAttribute('data-i18n-ru')) {
        var ru = node.getAttribute('data-i18n-ru') || '';
        var en = node.getAttribute('data-i18n-en') || '';
        var translated;
        if (document.documentElement.lang === 'en') {
          translated = en || ru;
        } else {
          translated = ru;
        }
        if (node.textContent !== translated) {
          node.textContent = translated;
        }
        if (node.hidden !== !translated) {
          node.hidden = !translated;
        }
        return;
      }
      if (node.nodeName === 'IMG' && node.hasAttribute('data-alt-ru')) {
        var altRu = node.getAttribute('data-alt-ru') || '';
        var altEn = node.getAttribute('data-alt-en') || '';
        node.alt = document.documentElement.lang === 'en' ? altEn || altRu : altRu;
      }
      for (var child = node.firstChild; child; child = child.nextSibling) translate(child);
    }
  }
  var pageTitleRu = document.title;
  function apply() {
    document.title =
      document.documentElement.lang === 'en'
        ? dictionary[pageTitleRu] || pageTitleRu
        : pageTitleRu;
    var chatLink = document.querySelector('.chat-menu-link');
    if (chatLink)
      {
      chatLink.title = document.documentElement.lang === 'en' ? 'Open chat' : 'Открыть чат';
    }
    records = records.filter(function (record) {
      return document.body.contains(record.node);
    });
    translate(document.body);
    var hidden = document.documentElement.lang !== 'en';
    if (notice.hidden !== hidden) {
      notice.hidden = hidden;
    }
    button.setAttribute('aria-checked', String(document.documentElement.lang === 'en'));
    button.setAttribute(
      'aria-label',
      document.documentElement.lang === 'en' ? 'Switch to Russian' : 'Переключить на английский'
    );
  }
  button.onclick = function () {
    document.documentElement.lang = document.documentElement.lang === 'en' ? 'ru' : 'en';
    try {
      localStorage.setItem('danyan-language', document.documentElement.lang);
    } catch (ignore) {}
    apply();
    var event = document.createEvent('Event');
    event.initEvent('site-language-change', false, false);
    document.dispatchEvent(event);
  };
  apply();
  if (window.MutationObserver) {
    new MutationObserver(function () {
      apply();
    }).observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
})();
