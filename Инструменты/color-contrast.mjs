// Относительная яркость sRGB, формула WCAG.
// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
export function luminance(hex) {
  let result = 0;
  const weights = [0.2126, 0.7152, 0.0722];
  for (let channel = 0; channel < 3; channel++) {
    const at = 1 + channel * 2;
    let value = parseInt(hex.slice(at, at + 2), 16) / 255;
    if (value <= 0.04045) {
      value = value / 12.92;
    } else {
      value = Math.pow((value + 0.055) / 1.055, 2.4);
    }
    result += value * weights[channel];
  }
  return result;
}

export function contrast(first, second) {
  let light = luminance(first);
  let dark = luminance(second);
  if (dark > light) {
    const save = light;
    light = dark;
    dark = save;
  }
  return (light + 0.05) / (dark + 0.05);
}

export function readable(text, background) {
  // Цвет красивый, текст не видно. Всё, тогда чёрный или белый.
  if (contrast(text, background) >= 4.5) {
    return text;
  }
  if (contrast('#000000', background) > contrast('#ffffff', background)) {
    return '#000000';
  }
  return '#ffffff';
}
