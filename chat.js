
(function () {
  'use strict';
  var $ = function (id) {
      return document.getElementById(id);
    };
  var lang = 'ru';
  try {
    if (localStorage.getItem('danyan-language') === 'en') {
      lang = 'en';
    } else {
      lang = 'ru';
    }
  } catch (ignore) {}
  if (location.hostname === 'danyanspage.neocities.org') {
    var frame = document.createElement('iframe');
    frame.src = 'https://danyanxdd.pythonanywhere.com/_chat?lang=' + lang;
    frame.title = 'DANYAN Chat';
    frame.className = 'chat-frame';
    frame.id = 'chat-frame';
    var wrap = document.createElement('div');
    wrap.id = 'chat-app';
    wrap.className = 'chat-frame-wrap';
    var note = document.createElement('section');
    note.className = 'card';
    note.setAttribute('role', 'status');
    function status() {
      note.textContent =
        document.documentElement.lang === 'en'
          ? 'Chat is loading. If it takes a while, the server may be temporarily unavailable.'
          : 'Чат загружается. Если он долго не появляется, возможно, сервер временно недоступен.';
    }
    status();
    frame.hidden = true;
    wrap.appendChild(note);
    wrap.appendChild(frame);
    window.addEventListener('message', function (e) {
      if (
        e.origin === 'https://danyanxdd.pythonanywhere.com' &&
        e.source === frame.contentWindow &&
        e.data &&
        e.data.type === 'chat-size'
      ) {
        frame.hidden = false;
        note.hidden = true;
      }
    });
    document.addEventListener('site-language-change', status);
    document.getElementById('chat-app').replaceWith(wrap);
    return;
  }
  var requestedLanguage = new URLSearchParams(location.search).get('lang');
  if (/^(ru|en)$/.test(requestedLanguage)) {
    lang = requestedLanguage;
  }
  var token = '';
  var code = '';
  var adminKey = '';
  var topic = Number(location.hash.slice(1)) || 0;
  var threads = [];
  var oldest = null;
  var timer = null;
  var loading = false;
  var allMessages = [];
  var t = function (ru, en) {
    if (lang === 'en') {
      return en;
    }
    return ru;
  };
  try {
    token = localStorage.getItem('danyan-chat-token') || '';
  } catch (ignore) {}
  function say(s) {
    $('chat-status').textContent = s;
  }
  // Ник можно поменять, токен от этого новым не станет. Ключ модера вообще отдельно.
  function api(path, payload, owner) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(payload ? 'POST' : 'GET', location.origin + '/api/chat/' + path);
      x.timeout = 12000;
      x.setRequestHeader('X-Chat-Token', token);
      if (owner) {
        x.setRequestHeader('Authorization', 'Bearer ' + adminKey);
      }
      if (payload) {
        x.setRequestHeader('Content-Type', 'application/json');
      }
      x.onload = function () {
        var data;
        try {
          data = JSON.parse(x.responseText);
        } catch (e) {
          reject(Error(t('Сервер недоступен.', 'Server unavailable.')));
          return;
        }
        if (x.status >= 200 && x.status < 300) {
          resolve(data);
        }
        else {
          var message = data.message || 'Error';
          var parts = message.split(' / ');
          var error = Error(parts[lang === 'en' ? 1 : 0] || message);
          error.status = x.status;
          reject(error);
        }
      };
      x.onerror = x.ontimeout = function () {
        reject(
          Error(
            t(
              'Нет связи. Текст остался в форме.',
              'Connection lost. Your text remains in the form.'
            )
          )
        );
      };
      x.send(payload ? JSON.stringify(payload) : null);
    });
  }
  function applyLanguage() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach(function (n) {
      if (!n.dataset.ru) {
        n.dataset.ru = n.textContent;
      }
      n.textContent = lang === 'en' ? n.dataset.en : n.dataset.ru;
    });
    document.title = t('DANYAN / Чат', 'DANYAN / Chat');
    if (typeof smileKinds !== 'undefined')
      {
      document.querySelectorAll('#smile-picker button').forEach(function (b, i) {
        b.title = smileKinds[i][lang === 'en' ? 2 : 1];
        b.setAttribute('aria-label', b.title);
      });
    }
    if (adminKey)
      {
      ownerRefresh().catch(function (e) {
        say(e.message);
      });
    }
    $('messages').setAttribute('aria-label', t('Сообщения', 'Messages'));
    $('chat-language').textContent = lang === 'en' ? 'EN → RU' : 'RU → EN';
    renderTopics();
    renderMessages();
    document.dispatchEvent(new Event('site-language-change'));
    if (window.parent !== window)
      {
      window.parent.postMessage(
        { type: 'chat-language', language: lang },
        'https://danyanspage.neocities.org'
      );
    }
  }
  $('chat-language').onclick = function () {
    if (lang === 'en') {
      lang = 'ru';
    } else {
      lang = 'en';
    }
    try {
      localStorage.setItem('danyan-language', lang);
    } catch (ignore) {}
    applyLanguage();
    say('');
  };
  
  function renderTopics() {
    var box = $('topics');
    box.textContent = '';
    threads.forEach(function (th) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'topic-link';
      b.textContent = (th.closed ? '× ' : '# ') + th.title + ' [' + th.count + ']';
      b.setAttribute('aria-current', String(th.id === topic));
      b.onclick = function () {
        topic = th.id;
        location.hash = String(topic);
        allMessages = [];
        oldest = null;
        renderTopics();
        read(false);
      };
      box.appendChild(b);
    });
    var current = threads.filter(function (th) {
      return th.id === topic;
    })[0];
    $('topic-title').textContent = current ? current.title : t('Пока нет тем', 'No topics yet');
    $('topic-description').textContent = current ? current.description : '';
    $('send').disabled = !code || !current || !!current.closed;
  }
  function topics() {
    return api('topics').then(function (data) {
      threads = data.topics;
      if (
        !threads.some(function (th) {
          return th.id === topic;
        })
      )
        {
        topic = threads.length ? threads[0].id : 0;
      }
      renderTopics();
    });
  }
  function richText(node, value) {
    var regex = /:([a-z0-9_-]+):/g;
    var last = 0;
    var m;
    while ((m = regex.exec(value))) {
      node.appendChild(document.createTextNode(value.slice(last, m.index)));
      if (smiles[m[1]]) {
        var image = document.createElement('img');
        image.src = asset('Картинки/Смайлы/' + m[1] + '.gif');
        image.alt = m[0];
        image.className = 'message-smile';
        image.loading = 'lazy';
        node.appendChild(image);
      } else {
        node.appendChild(document.createTextNode(m[0]));
      }
      last = regex.lastIndex;
    }
    node.appendChild(document.createTextNode(value.slice(last)));
  }
  // Только текстовые узлы, мне ещё чужих скриптов в чате не хватало.
  function renderMessages() {
    var box = $('messages');
    var nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.textContent = '';
    if (!allMessages.length) {
      var empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = t('Здесь пока тихо.', 'It is quiet here.');
      box.appendChild(empty);
    }
    allMessages.forEach(function (m) {
      var article = document.createElement('article');
      article.className = 'chat-message' + (m.code === code ? ' mine' : '');
      var head = document.createElement('header');
      var name = document.createElement('b');
      name.textContent = m.nick || '#' + m.code;
      head.appendChild(name);
      if (m.nick) {
        var id = document.createElement('span');
        id.className = 'public-code';
        id.textContent = ' #' + m.code;
        head.appendChild(id);
      }
      var meta = document.createElement('span');
      meta.className = 'message-meta';
      meta.textContent =
        ' №' +
        m.id +
        ' · ' +
        new Date(m.created * 1000).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        });
      head.appendChild(meta);
      var report = document.createElement('button');
      report.className = 'report';
      report.type = 'button';
      report.textContent = '!';
      report.title = t('Пожаловаться', 'Report');
      report.setAttribute(
        'aria-label',
        t('Пожаловаться на сообщение ', 'Report message ') + m.id
      );
      report.onclick = function () {
        report.disabled = true;
        api('report', { id: m.id })
          .then(function () {
            say(t('Жалоба отправлена.', 'Report sent.'));
          })
          .catch(function (e) {
            say(e.message);
            report.disabled = false;
          });
      };
      head.appendChild(report);
      if (m.mine || adminKey) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'message-delete';
        del.textContent = t('Удалить', 'Delete');
        del.onclick = function () {
          if (!confirm(t('Удалить сообщение?', 'Delete this message?'))) {
            return;
          }
          del.disabled = true;
          api(adminKey ? 'admin/delete' : 'delete', { id: m.id }, !!adminKey)
            .then(function () {
              allMessages = allMessages.filter(function (item) {
                return item.id !== m.id;
              });
              renderMessages();
              return topics();
            })
            .then(function () {
              if (adminKey) {
                return ownerRefresh();
              }
            })
            .catch(function (e) {
              say(e.message);
              del.disabled = false;
            });
        };
        head.appendChild(del);
      }
      article.appendChild(head);
      var p = document.createElement('p');
      richText(p, m.text);
      article.appendChild(p);
      box.appendChild(article);
    });
    if (nearBottom) {
      box.scrollTop = box.scrollHeight;
    }
    $('older').hidden = !oldest;
  }
  function read(older) {
    if (!topic || loading) {
      return Promise.resolve();
    }
    loading = true;
    var path = 'messages?topic=' + topic + (older && oldest ? '&before=' + oldest : '');
    var selected = topic;
    return api(path)
      .then(function (data) {
        if (topic !== selected) {
          return;
        }
        if (older) {
          var seen = {};
          allMessages.forEach(function (m) {
            seen[m.id] = true;
          });
          allMessages = data.messages
            .filter(function (m) {
              return !seen[m.id];
            })
            .concat(allMessages)
            .slice(-200);
        } else {
          if (JSON.stringify(allMessages) === JSON.stringify(data.messages)) {
            oldest = data.older;
            return;
          }
          allMessages = data.messages;
        }
        oldest = data.older;
        renderMessages();
      })
      .catch(function (e) {
        say(e.message);
      })
      .then(function () {
        loading = false;
      });
  }
  // htmx обходится hx-trigger="every ...". Здесь этот же опрос руками:
  // https://github.com/bigskysoftware/htmx/blob/v2.0.4/www/content/attributes/hx-trigger.md
  function schedule() {
    clearTimeout(timer);
    if (document.hidden || !$('auto').checked) {
      return;
    }
    timer = setTimeout(function () {
      read(false).then(schedule);
    }, 8000);
  }
  document.addEventListener('visibilitychange', function () {
    clearTimeout(timer);
    if (!document.hidden) {
      read(false).then(schedule);
    }
  });
  $('auto').onchange = schedule;
  $('refresh').onclick = function () {
    read(false);
  };
  $('older').onclick = function () {
    $('auto').checked = false;
    clearTimeout(timer);
    read(true);
  };
  $('topics-refresh').onclick = function () {
    topics()
      .then(function () {
        return read(false);
      })
      .catch(function (e) {
        say(e.message);
      });
  };
  function identity() {
    if (token)
      {
      return api('me')
        .then(function (data) {
          code = data.code;
        })
        .catch(function (e) {
          if (e.status !== 401) {
            throw e;
          }
          token = '';
          return identity();
        });
    }
    return api('identity', {}).then(function (data) {
      token = data.token;
      code = data.code;
      try {
        localStorage.setItem('danyan-chat-token', token);
      } catch (ignore) {
        say(
          t(
            'Хранение браузера недоступно: код действует до закрытия вкладки.',
            'Browser storage unavailable: code lasts only for this tab.'
          )
        );
      }
    });
  }
  $('message').oninput = function () {
    $('counter').textContent = this.value.length + ' / 500';
  };
  $('chat-form').onsubmit = function (event) {
    event.preventDefault();
    if (!topic || !code) {
      return;
    }
    var text = $('message').value.trim();
    if (!text) {
      return;
    }
    $('send').disabled = true;
    api('send', { topic: topic, text: text, nick: $('nick').value })
      .then(function (data) {
        $('message').value = '';
        $('counter').textContent = '0 / 500';
        say(
          data.status === 'approved'
            ? t('Отправлено.', 'Sent.')
            : t('Сообщение на проверке.', 'Message awaiting review.')
        );
        return topics().then(function () {
          return read(false);
        });
      })
      .catch(function (e) {
        say(e.message);
      })
      .then(renderTopics);
  };
  // Смайлы уже лежат для гостевой, беру оттуда же.
  var smileKinds = [
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
  var smiles = {};
  function asset(path) {
    if (location.hostname === 'danyanxdd.pythonanywhere.com') {
      return 'https://danyanspage.neocities.org/' + path;
    }
    return path;
  }
  smileKinds.forEach(function (k) {
    smiles[k[0]] = true;
    var b = document.createElement('button');
    b.type = 'button';
    b.title = k[lang === 'en' ? 2 : 1];
    b.setAttribute('aria-label', b.title);
    var img = document.createElement('img');
    img.src = asset('Картинки/Смайлы/' + k[0] + '.gif');
    img.alt = '';
    img.loading = 'lazy';
    b.appendChild(img);
    b.onclick = function () {
      var input = $('message');
      var start = input.selectionStart || 0;
      var end = input.selectionEnd || 0;
      var insert = ':' + k[0] + ':';
      if (input.value.length - (end - start) + insert.length > 500) {
        return;
      }
      input.value = input.value.slice(0, start) + insert + input.value.slice(end);
      input.focus();
      input.selectionStart = input.selectionEnd = start + insert.length;
      input.oninput();
      $('smile-picker').parentNode.open = false;
    };
    $('smile-picker').appendChild(b);
  });
  $('owner-login').onsubmit = function (e) {
    e.preventDefault();
    adminKey = $('owner-key').value;
    $('owner-key').value = '';
    ownerRefresh()
      .then(function () {
        $('owner-panel').hidden = false;
        $('owner-login').hidden = true;
        renderMessages();
      })
      .catch(function (e) {
        adminKey = '';
        say(e.message);
      });
  };
  function ownerRefresh() {
    return Promise.all([
      api('admin/stats', null, true),
      api('admin/messages', null, true)
    ]).then(function (data) {
      var stats = data[0];
      $('chat-stats').textContent =
        t('Сообщений: ', 'Messages: ') +
        stats.messages +
        ' · ' +
        t('На проверке: ', 'Pending: ') +
        stats.pending +
        ' · ' +
        Math.ceil(stats.databaseBytes / 1024) +
        ' KiB / 20 MiB';
      var box = $('moderation-list');
      box.textContent = '';
      data[1].messages.forEach(function (m) {
        var row = document.createElement('article');
        row.className = 'mod-message';
        var p = document.createElement('p');
        p.textContent =
          '№' +
          m.id +
          ' #' +
          m.code +
          ' [' +
          t(
            {
              approved: 'опубликовано',
              pending: 'на проверке',
              rejected: 'скрыто'
            }[m.status] || m.status,
            m.status
          ) +
          '] ' +
          m.text +
          ' · ' +
          m.flags
            .map(function (f) {
              return t(
                f,
                {
                  'ссылка или контакт': 'link or contact',
                  'возможная реклама': 'possible advertising',
                  'требует проверки содержания': 'content needs review',
                  'массовые повторы': 'repeated text',
                  'длинная запись': 'long message'
                }[f] || f
              );
            })
            .join(', ') +
          ' · ' +
          t('Жалоб: ', 'Reports: ') +
          m.reports;
        row.appendChild(p);
        [
          ['approve', 'Одобрить', 'Approve'],
          ['reject', 'Скрыть', 'Hide'],
          ['ban', 'Бан 24 ч', 'Ban 24 h'],
          ['delete', 'Удалить', 'Delete']
        ].forEach(function (action) {
          var b = document.createElement('button');
          b.type = 'button';
          b.textContent = t(action[1], action[2]);
          b.onclick = function () {
            (action[0] === 'delete' && !confirm(t('Удалить сообщение?', 'Delete this message?'))
              ? Promise.resolve()
              : api(
                  action[0] === 'delete' ? 'admin/delete' : 'admin/moderate',
                  { id: m.id, action: action[0] },
                  true
                )
            )
              .then(function () {
                ownerRefresh();
                read(false);
              })
              .catch(function (e) {
                say(e.message);
              });
          };
          row.appendChild(b);
        });
        box.appendChild(row);
      });
    });
  }
  $('owner-refresh').onclick = function () {
    ownerRefresh().catch(function (e) {
      say(e.message);
    });
  };
  $('owner-logout').onclick = function () {
    adminKey = '';
    $('owner-panel').hidden = true;
    $('owner-login').hidden = false;
    $('moderation-list').textContent = '';
    renderMessages();
  };
  $('topic-form').onsubmit = function (e) {
    e.preventDefault();
    api(
      'admin/topic',
      { title: $('new-title').value, description: $('new-description').value },
      true
    )
      .then(function () {
        $('topic-form').reset();
        return topics();
      })
      .catch(function (e) {
        say(e.message);
      });
  };
  $('close-topic').onclick = function () {
    var current = threads.filter(function (th) {
      return th.id === topic;
    })[0];
    if (current)
      {
      api('admin/topic', { id: topic, closed: !current.closed }, true)
        .then(topics)
        .catch(function (e) {
          say(e.message);
        });
    }
  };
  $('cleanup').onclick = function () {
    api('admin/cleanup', {}, true)
      .then(function () {
        return ownerRefresh();
      })
      .then(function () {
        return read(false);
      })
      .catch(function (e) {
        say(e.message);
      });
  };
  window.addEventListener('message', function (e) {
    if (
      e.origin !== 'https://danyanspage.neocities.org' ||
      e.source !== window.parent ||
      !e.data ||
      e.data.type !== 'site-preferences'
    )
      {
      return;
    }
    document.body.classList.toggle('emo-weather', e.data.emo === true);
    document.documentElement.setAttribute('data-low-power', String(e.data.low === true));
    if (/^(ru|en)$/.test(e.data.lang) && lang !== e.data.lang) {
      lang = e.data.lang;
      applyLanguage();
    }
  });
  applyLanguage();
  identity()
    .then(function () {
      $('my-code').textContent = '#' + code;
      return topics();
    })
    .then(function () {
      return read(false);
    })
    .then(schedule)
    .catch(function (e) {
      say(e.message);
    });
})();
