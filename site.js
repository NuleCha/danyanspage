(function () {
  function mixFacts(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var other = Math.floor(Math.random() * (i + 1));
      var saved = list[i];
      list[i] = list[other];
      list[other] = saved;
    }
    return list;
  }

  var secret = document.getElementById('secret');
  var peel = document.getElementById('peel');
  // блок выпилили? ну и ладно
  if (peel && secret)
    {
    peel.onclick = function () {
      secret.hidden = !secret.hidden;
      peel.setAttribute('aria-expanded', String(!secret.hidden));
    };
  }

  var facts = [
    ['В 1858 году Хабаровск начинался как военный пост «Хабаровка».', 1],
    [
      'В 1906 году в городском саду играли духовые оркестры двух Восточно-Сибирских стрелковых полков.',
      1
    ],
    [
      'В хабаровском яхт-клубе, построенном в 1914 году, была библиотека-читальня имени Льва Толстого.',
      1
    ],
    ['В 1925 году в городском сквере открылся ресторан коллектива безработных.', 1],
    [
      'В 1937 году в городском парке построили эстрадный театр на 2300 мест. Его называли «Летним зелёным театром».',
      1
    ],
    [
      'Проект памятника Муравьёву-Амурскому создал Александр Опекушин; монумент открыли в 1891 году.',
      1
    ],
    [
      'Здание Амурского утёса построили в ноябре 1943 года как пост ПВО для наблюдения за небом.',
      0
    ],
    [
      'Временный павильон на Амурском утёсе пережил войну и остался одним из символов города.',
      0
    ],
    [
      'В 1950-х на Амурском утёсе работала спасательная станция, а позднее — морская школа ДОСААФ.',
      0
    ],
    ['В 1980-х после реконструкции на Амурском утёсе открыли кафе.', 0],
    ['В 2013 году здание Амурского утёса передали Гродековскому музею.', 0],
    ['В экспозиции Амурского утёса есть рояль фабрики «К. М. Шредер» 1881 года.', 0]
  ];
  var sources = [
    ['Гродековский музей', 'https://hkm.ru/building/amurskij-utes/'],
    ['Хабаровский краевой парк', 'https://park-khv.ru/history.html']
  ];

  var button = document.getElementById('fortune');
  var text = document.getElementById('fortune-text');
  var link = document.getElementById('fact-source');
  var left = [];
  var last = -1;

  if (button && text && link)
    {
    button.onclick = function () {
      if (!left.length) {
        for (var i = 0; i < facts.length; i++) left.push(i);

        // пачку перемешать, потом выгребать с конца
        
        left = mixFacts(left);
        // БЛЯТЬ, пачка новая, а крайний факт всё равно может повториться.
        // Проверять надо последний. pop() же. Первый вообще ни при чём.
        if (left[left.length - 1] === last) {
          var hold = left[0];
          left[0] = left[left.length - 1];
          left[left.length - 1] = hold;
        }
      }

      last = left.pop();
      var fact = facts[last];
      var source = sources[fact[1]];
      text.textContent = fact[0];
      text.setAttribute('data-fact-active', 'true');
      link.href = source[1];
      link.textContent = 'Источник: ' + source[0] + ' ↗';
      link.hidden = false;
      button.textContent = 'ЕЩЁ ФАКТ';
    };
  }

  var quiet = document.getElementById('quiet');
  var pause = document.getElementById('pause');
  if (quiet && pause)
    {
    quiet.onclick = function () {
      // Да тут же готовая кнопка света. Нажать её, и всё.
      pause.click();
      var stopped = pause.getAttribute('aria-pressed') === 'true';
      quiet.textContent = stopped ? 'СВЕТ: ВКЛЮЧИТЬ' : 'СВЕТ: ПАУЗА';
      quiet.setAttribute('aria-pressed', String(stopped));
    };
  }
})();

/* STUDIO-OWNER-IMAGES-BEGIN */
(function () {
  var enabled = false;
  try {
    if (new URLSearchParams(location.search).get('studio') === '1')
      {
      localStorage.setItem('danyan-studio-owner-ui', '1');
    }
    enabled = localStorage.getItem('danyan-studio-owner-ui') === '1';
  } catch (ignore) {}
  if (!enabled) {
    return;
  }
  var menu = null;
  function close() {
    if (menu) {
      menu.remove();
      menu = null;
    }
  }
  document.addEventListener('contextmenu', function (e) {
    var image = e.target.closest('img');
    if (!image || !image.closest('.card,.meme-print')) {
      return;
    }
    var source = new URL(image.src);
    if (source.origin !== location.origin) {
      return;
    }
    e.preventDefault();
    close();
    menu = document.createElement('a');
    menu.textContent =
      document.documentElement.lang === 'en'
        ? 'Replace in DANYAN Studio…'
        : 'Заменить в DANYAN Studio…';
    menu.href =
      'http://127.0.0.1:8791/__editor/open-image?image=' +
      encodeURIComponent(source.pathname.replace(/^\//, ''));
    menu.target = '_blank';
    menu.rel = 'noopener';
    menu.style.cssText =
      'position:fixed;z-index:2147483647;left:' +
      Math.max(0, Math.min(e.clientX, innerWidth - 270)) +
      'px;top:' +
      Math.max(0, Math.min(e.clientY, innerHeight - 45)) +
      'px;background:#263a49;color:white;padding:12px;font:14px system-ui;border:1px solid #8ce4ff;text-decoration:none';
    document.body.appendChild(menu);
  });
  document.addEventListener('click', function () {
    close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      close();
    }
  });
})();
/* STUDIO-OWNER-IMAGES-END */
