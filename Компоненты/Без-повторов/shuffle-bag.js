(function () {
  function mix(sample) {
    var left = sample.length;
    while (left > 1) {
      left--;
      var index = Math.floor(Math.random() * (left + 1));
      var hold = sample[left];
      sample[left] = sample[index];
      sample[index] = hold;
    }
    return sample;
  }
  function createShuffleBag(values) {
    var items = values.slice();
    var left = [];
    var previous = -1;
    return function next() {
      if (!items.length) {
        return undefined;
      }
      if (!left.length) {
        for (var i = 0; i < items.length; i++) left.push(i);
        left = mix(left);
        if (left.length > 1 && left[left.length - 1] === previous) {
          var hold = left[0];
          left[0] = left[left.length - 1];
          left[left.length - 1] = hold;
        }
      }
      previous = left.pop();
      return items[previous];
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = createShuffleBag;
  }
  else {
    window.createShuffleBag = createShuffleBag;
  }
})();
