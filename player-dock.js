// iframe ЖИВОЙ. Спрятать можно, пересоздавать нельзя, иначе опять тишина.

window.sitePlayerDock = function (dock, stop, title) {
  var bar = document.createElement('div');
  var name = document.createElement('span');
  var fold = document.createElement('button');
  var content = document.createElement('div');
  var collapsed = false;
  bar.className = 'player-bar';
  name.className = 'player-title';
  content.className = 'player-content';
  fold.type = 'button';
  fold.className = 'player-fold';
  while (dock.firstChild) content.appendChild(dock.firstChild);
  bar.appendChild(name);
  bar.appendChild(fold);
  bar.appendChild(stop);
  dock.appendChild(bar);
  dock.appendChild(content);
  function labels() {
    var en = document.documentElement.lang === 'en';
    name.textContent = typeof title === 'function' ? title() : title;
    if (collapsed) {
      fold.textContent = en ? '▴ OPEN' : '▴ ОТКРЫТЬ';
    }
    else {
      fold.textContent = en ? '▾ HIDE' : '▾ СВЕРНУТЬ';
    }
    fold.setAttribute('aria-expanded', String(!collapsed));
  }
  fold.onclick = function () {
    collapsed = !collapsed;
    dock.classList.toggle('player-collapsed', collapsed);
    labels();
  };
  document.addEventListener('site-language-change', labels);
  labels();
  return { refresh: labels };
};
