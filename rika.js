
/* семь кликов именно по фону. Кнопки не считать */
(function () {
  'use strict';
  var clicks = 0;
  var popup = null;
  var sound = null;
  var timer = null;
  function close() {
    window.clearTimeout(timer);
    if (popup) {
      popup.hidden = true;
    }
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  // play() прямо после клика, пока браузер ещё считает это действием человека.
  function reveal() {
    if (!popup) {
      popup = document.createElement('button');
      popup.id = 'rika-egg';
      popup.type = 'button';
      var image = document.createElement('img');
      image.src = 'Картинки/Рика/rika.png';
      image.alt = 'Rika Furude — Nipah!';
      image.width = 480;
      image.height = 297;
      popup.appendChild(image);
      popup.onclick = close;
      document.body.appendChild(popup);
      sound = document.createElement('audio');
      sound.id = 'rika-nipah';
      sound.preload = 'none';
      sound.hidden = true;
      sound.src = 'https://danyanxdd.pythonanywhere.com/sounds/nipah.mp3';
      sound.volume = 0.55;
      document.body.appendChild(sound);
    }
    popup.setAttribute(
      'aria-label',
      document.documentElement.lang === 'en' ? 'Nipah! Close Rika' : 'Нипа! Спрятать Рику'
    );
    popup.hidden = false;
    sound.currentTime = 0;
    var playing = sound.play();
    if (playing && playing.catch) {
      playing.catch(function () {});
    }
    timer = window.setTimeout(close, 5500);
  }
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (popup && !popup.hidden) {
      return;
    }
    // Клик проходит сквозь декор до body. Вот там и ловлю.
    if (
      target !== document.body &&
      target !== document.documentElement &&
      !(target.closest && target.closest('#facade, .construction'))
    )
      {
      return;
    }
    clicks++;
    if (clicks === 7) {
      clicks = 0;
      reveal();
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      close();
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      close();
    }
  });
})();
