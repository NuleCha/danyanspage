// Снаружи режим переключили, внутри чата сам он от этого не переключится.
/* обратно наружу идут размер, язык и фразы для полёта */
(function () {
  'use strict';
  var embedded = document.body.classList.contains('chat-embedded');
  var remote = location.hostname === 'danyanspage.neocities.org';
  var apiOrigin = 'https://danyanxdd.pythonanywhere.com';
  function event(name) {
    document.dispatchEvent(new Event(name));
  }
  function quotes(entries) {
    var box = document.getElementById('guest-posts');
    if (!box) {
      return;
    }
    box.textContent = '';
    entries.slice(0, 25).forEach(function (entry) {
      if (typeof entry.quote !== 'string' || !entry.danmaku) {
        return;
      }
      var node = document.createElement('span');
      node.className = 'guest-entry';
      node.setAttribute('data-danmaku', entry.quote.slice(0, 64));
      box.appendChild(node);
    });
    event('guestbook-updated');
  }
  function update() {
    if (document.hidden || remote) {
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', location.origin + '/api/entries');
    xhr.timeout = 10000;
    xhr.onload = function () {
      if (xhr.status !== 200) {
        return;
      }
      try {
        var entries = JSON.parse(xhr.responseText).entries || [];
        if (embedded)
          {
          window.parent.postMessage(
            {
              type: 'chat-quotes',
              entries: entries.map(function (e) {
                return { quote: e.quote, danmaku: e.danmaku };
              })
            },
            'https://danyanspage.neocities.org'
          );
        }
        else {
          quotes(entries);
        }
      } catch (ignore) {}
    };
    xhr.send();
  }
  if (embedded) {
    function size() {
      window.parent.postMessage(
        {
          type: 'chat-size',
          height: document.querySelector('.chat-shell').offsetHeight + 8
        },
        'https://danyanspage.neocities.org'
      );
    }
    if (window.ResizeObserver)
      {
      new ResizeObserver(size).observe(document.querySelector('.chat-shell'));
    }
    window.addEventListener('load', size);
  }
  if (remote)
    {
    window.addEventListener('message', function (e) {
      var frame = document.getElementById('chat-frame');
      if (!frame || e.origin !== apiOrigin || e.source !== frame.contentWindow || !e.data)
        {
        return;
      }
      if (e.data.type === 'chat-quotes' && Array.isArray(e.data.entries))
        {
        quotes(e.data.entries);
      }
      if (e.data.type === 'chat-size' && typeof e.data.height === 'number')
        {
        frame.style.height = Math.max(600, Math.min(5000, e.data.height)) + 'px';
      }
      if (e.data.type === 'chat-language' && /^(ru|en)$/.test(e.data.language)) {
        document.documentElement.lang = e.data.language;
        try {
          localStorage.setItem('danyan-language', e.data.language);
        } catch (ignore) {}
        event('site-language-change');
      }
    });
  }
  if (!remote) {
    update();
    window.setInterval(update, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        update();
      }
    });
  }
  // Ники не переводить. Чужую запись тоже. Мне достаточно ебли с кнопками.
  var extra = {
    'Музыка и мигающие цветные окна': 'Music and flashing coloured windows',
    'Caramelldansen — музыкальный плеер': 'Caramelldansen — music player',
    'Открыть мем в полном размере': 'Open the full-size meme',
    'Выбор курсора': 'Choose a cursor',
    Микроволновка: 'Microwave',
    Чебупели: 'Chebupeli',
    'Разогреть чебупели': 'Heat up chebupeli',
    'Съесть чебупелю': 'Eat a chebupel',
    'Готово! Нажми на чебупели.': 'Ready! Click the chebupeli.',
    'Всё съедено. Можно разогреть ещё.': 'All eaten. You can heat up more.',
    Разогревается: 'Heating up',
    'Поймать Nyan Cat': 'Catch Nyan Cat',
    'Caramelldansen · шведский оригинал ↗': 'Caramelldansen · Swedish original ↗',
    'Источник: Гродековский музей ↗': 'Source: Grodekov Museum ↗',
    'Источник: Хабаровский краевой парк ↗': 'Source: Khabarovsk Regional Park ↗',
    'Объявление чата': 'Chat notice',
    Чат: 'Chat',
    'Переключить на английский': 'Switch to English',
    'В 1858 году Хабаровск начинался как военный пост «Хабаровка».':
      'Khabarovsk began in 1858 as a military post called Khabarovka.',
    'В 1906 году в городском саду играли духовые оркестры двух Восточно-Сибирских стрелковых полков.':
      'In 1906, brass bands from two East Siberian rifle regiments played in the city garden.',
    'В хабаровском яхт-клубе, построенном в 1914 году, была библиотека-читальня имени Льва Толстого.':
      'The yacht club built in 1914 had a library and reading room named after Leo Tolstoy.',
    'В 1925 году в городском сквере открылся ресторан коллектива безработных.':
      'In 1925, a restaurant run by a group of unemployed people opened in a city square.',
    'В 1937 году в городском парке построили эстрадный театр на 2300 мест. Его называли «Летним зелёным театром».':
      'In 1937, the city park gained a 2,300-seat stage known as the Summer Green Theatre.',
    'Проект памятника Муравьёву-Амурскому создал Александр Опекушин; монумент открыли в 1891 году.':
      'Alexander Opekushin designed the Muravyov-Amursky monument, unveiled in 1891.',
    'Здание Амурского утёса построили в ноябре 1943 года как пост ПВО для наблюдения за небом.':
      'The Amur Cliff building was built in November 1943 as an air-defence observation post.',
    'Временный павильон на Амурском утёсе пережил войну и остался одним из символов города.':
      'The temporary pavilion on the Amur Cliff survived the war and became a city landmark.',
    'В 1950-х на Амурском утёсе работала спасательная станция, а позднее — морская школа ДОСААФ.':
      'In the 1950s, the Amur Cliff housed a rescue station and later a DOSAAF maritime school.',
    'В 1980-х после реконструкции на Амурском утёсе открыли кафе.':
      'After renovation in the 1980s, a cafe opened on the Amur Cliff.',
    'В 2013 году здание Амурского утёса передали Гродековскому музею.':
      'The Amur Cliff building was transferred to the Grodekov Museum in 2013.',
    'В экспозиции Амурского утёса есть рояль фабрики «К. М. Шредер» 1881 года.':
      'The Amur Cliff exhibition includes a C. M. Schroeder piano made in 1881.'
  };
  var roots =
    '.chat-controls,.chat-extras,.chat-ad,.caramel-player,.danmaku-toggle,.nyan-flight,.toolbar';
  function normalize(value) {
    return value.replace(/\s+/g, ' ').trim();
  }
  function translation(value) {
    var key = normalize(value);
    return extra[key] || (window.SITE_TRANSLATIONS || {})[key];
  }
  function translateInterface() {
    var en = document.documentElement.lang === 'en';
    document.title = en ? 'DANYAN / Chat' : 'DANYAN / Чат';
    document.querySelectorAll(roots).forEach(function (root) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (
          /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(node.parentNode.nodeName) ||
          node.parentNode.closest('[data-en],#low-power')
        )
          {
          continue;
        }
        var record = node._chatTranslation;
        var english = translation(node.nodeValue);
        if (english && (!record || normalize(node.nodeValue) !== normalize(record.en)))
          {
          record = node._chatTranslation = { ru: node.nodeValue, en: english };
        }
        if (record) {
          var next;
          if (en) {
            next = record.en;
          } else {
            next = record.ru;
          }
          if (node.nodeValue !== next) {
            node.nodeValue = next;
          }
        }
      }
      var elements = [root].concat(
        Array.prototype.slice.call(root.querySelectorAll('[title],[aria-label],[alt]'))
      );
      elements.forEach(function (element) {
        ['title', 'aria-label', 'alt'].forEach(function (attr) {
          var value = element.getAttribute(attr);
          if (!value) {
            return;
          }
          var records =
            element._chatAttributeTranslations || (element._chatAttributeTranslations = {});
          var record = records[attr];
          var english = translation(value);
          if (english && (!record || value !== record.en))
            {
            record = records[attr] = { ru: value, en: english };
          }
          if (record) {
            var next;
            if (en) {
              next = record.en;
            } else {
              next = record.ru;
            }
            if (value !== next) {
              element.setAttribute(attr, next);
            }
          }
        });
      });
    });
    document
      .querySelectorAll('.chat-ad [data-en],.chat-extras [data-en]')
      .forEach(function (n) {
        if (!n.dataset.ru) {
          n.dataset.ru = n.textContent;
        }
        var next;
        if (en) {
          next = n.dataset.en;
        } else {
          next = n.dataset.ru;
        }
        if (n.textContent !== next) {
          n.textContent = next;
        }
      });
  }
  if (!embedded) {
    document.addEventListener('site-language-change', translateInterface);
    if (window.MutationObserver)
      {
      new MutationObserver(function (changes) {
        if (
          changes.some(function (change) {
            var node;
            if (change.target.nodeType === 1) {
              node = change.target;
            } else {
              node = change.target.parentNode;
            }
            return (
              (node.closest && node.closest(roots)) ||
              (change.type === 'childList' &&
                Array.prototype.some.call(change.addedNodes, function (n) {
                  return n.nodeType === 1 && n.matches(roots);
                }))
            );
          })
        )
          {
          translateInterface();
        }
      }).observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
    translateInterface();
  }
})();
