
/* четыре секунды погреть, потом можно тыкать */
(function () {
  'use strict';
  var start = document.getElementById('chebu-start');
  var dish = document.getElementById('chebu-dish');
  var clock = document.getElementById('chebu-time');
  var status = document.getElementById('chebu-status');
  var oven = document.querySelector('.chebu-oven');
  var timer = null;
  var left = 0;
  // На пищалку хватило осциллятора.
  function beep() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        return;
      }
      var c = new AC();
      var o = c.createOscillator();
      var g = c.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.12);
      o.onended = function () {
        c.close();
      };
    } catch (e) {}
  }
  function ready() {
    oven.classList.remove('chebu-heating');
    clock.textContent = '00:00';
    start.disabled = false;
    start.hidden = true;
    status.textContent = 'Готово! Нажми на чебупели.';
    for (var i = 0; i < 5; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chebu-piece';
      b.setAttribute('aria-label', 'Съесть чебупелю');
      var img = document.createElement('img');
      img.src = 'chebupel.png';
      img.alt = '';
      img.width = 44;
      img.height = 38;
      b.appendChild(img);
      b.style.transform = 'rotate(' + (-18 + i * 9) + 'deg)';
      b.onclick = function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
        var event = document.createEvent('Event');
        event.initEvent('chebu-eaten', false, false);
        document.dispatchEvent(event);
        if (!dish.children.length) {
          start.hidden = false;
          status.textContent = 'Всё съедено. Можно разогреть ещё.';
        }
      };
      dish.appendChild(b);
    }
    beep();
  }
  start.onclick = function () {
    if (timer) {
      return;
    }
    dish.innerHTML = '';
    left = 4;
    start.disabled = true;
    clock.textContent = '00:04';
    status.textContent = 'Разогревается';
    oven.classList.add('chebu-heating');
    timer = window.setInterval(function () {
      left--;
      clock.textContent = '00:0' + left;
      if (!left) {
        window.clearInterval(timer);
        timer = null;
        ready();
      }
    }, 1000);
  };
})();
