// В публикацию только список ниже. Не всё, что нашлось рядом на диске.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'publish');
function escape(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const letter = text[i];
    switch (letter) {
      case '&': result += '&amp;'; break;
      case '<': result += '&lt;'; break;
      case '>': result += '&gt;'; break;
      case '"': result += '&quot;'; break;
      case "'": result += '&#39;'; break;
      default: result += letter;
    }
  }
  return result;
}
const emoTracks = JSON.parse(
  fs.readFileSync(path.join(root, 'Содержимое/emo-tracks.json'), 'utf8')
);
if (
  !Array.isArray(emoTracks) ||
  !emoTracks.length ||
  emoTracks.some(t => !t.artist || !t.title || !/^[a-zA-Z0-9_-]{11}$/.test(t.id))
)
  {
  throw new Error('Некорректный треклист эмо-режима');
}
fs.writeFileSync(
  path.join(root, 'emo-tracks.js'),
  'window.EMO_TRACKS = ' + JSON.stringify(emoTracks) + ';\n'
);
const posts = JSON.parse(fs.readFileSync(path.join(root, 'Содержимое/posts.json'), 'utf8'));
if (!Array.isArray(posts))
  {
  throw new Error('Содержимое/posts.json должен содержать список записей.');
}
const ids = new Set();
function translatedTag(tag, ru, en) {
  return `<${tag} data-i18n-ru="${escape(ru || '')}" data-i18n-en="${escape(en || '')}">${escape(ru || '')}</${tag}>`;
}
function render(post) {
  if (post.draft) {
    return '';
  }
  if (!/^[a-z0-9-]+$/.test(post.id || '') || ids.has(post.id))
    {
    throw new Error('У каждой записи нужен уникальный id латиницей.');
  }
  ids.add(post.id);
  if (!['note', 'music', 'image'].includes(post.type))
    {
    throw new Error('Тип записи: note, music или image.');
  }
  if (!post.title) {
    throw new Error('У записи должен быть title.');
  }
  const style = post.style || 'paper';
  if (!['paper', 'taped', 'dark', 'notice'].includes(style))
    {
    throw new Error('Неизвестный вид карточки записи.');
  }
  let body = `<article class="card post post-style-${style}" data-post-id="${escape(post.id)}" id="post-${escape(post.id)}">`;
  if (post.date) {
    body += `<time>${escape(post.date)}</time>`;
  }
  body += translatedTag('h2', post.title, post.en?.title);
  if (post.image) {
    if (
      !/^Картинки\/[a-zA-Z0-9_./-]+\.(png|jpg|jpeg|webp|gif)$/i.test(post.image) ||
      post.image.includes('..')
    )
      {
      throw new Error('Картинки записей должны лежать в Картинки/.');
    }
    if (!fs.existsSync(path.join(root, post.image)))
      {
      throw new Error(`Нет картинки ${post.image}`);
    }
    body += `<img class="post-image" src="${escape(post.image)}" alt="${escape(post.alt || '')}" data-alt-ru="${escape(post.alt || '')}" data-alt-en="${escape(post.en?.alt || '')}" loading="lazy" decoding="async">`;
  }
  const paragraphs = Array.isArray(post.text) ? post.text : [post.text || ''];
  const english = Array.isArray(post.en?.text) ? post.en.text : [post.en?.text || ''];
  for (let i = 0; i < Math.max(paragraphs.length, english.length); i++)
    body += translatedTag('p', paragraphs[i], english[i]);
  if (post.url) {
    if (!/^https:\/\//i.test(post.url))
      {
      throw new Error('Ссылка записи должна начинаться с https://');
    }
    body += `<a href="${escape(post.url)}" target="_blank" rel="noopener">${escape(post.linkText || 'Открыть ↗')}</a>`;
  }
  return body + '</article>';
}
const prepared = posts.map(post => ({ post, html: render(post) }));
const rendered = prepared
  .filter(x => !Number.isInteger(x.post.slot))
  .map(x => x.html)
  .filter(Boolean)
  .join('\n');
const indexPath = path.join(root, 'index.html');
let source = fs.readFileSync(indexPath, 'utf8');
const marker = /<!-- POSTS:START -->[\s\S]*?<!-- POSTS:END -->/;
if (!marker.test(source))
  {
  throw new Error('В index.html пропали метки POSTS:START / POSTS:END.');
}
// Старые сгенерированные карточки сначала убрать, а то каждая сборка будет их плодить.
source = source.replace(/<!-- PLACED:START -->[\s\S]*?<!-- PLACED:END -->/g, '');
source = source.replace(marker, `<!-- POSTS:START -->\n${rendered}\n<!-- POSTS:END -->`);
let staticSlot = 0;
const projectStart = source.indexOf('<div id="projects">');
if (projectStart >= 0) {
  let prefix = source.slice(0, projectStart);
  let body = source.slice(projectStart);
  body = body.replace(/<section class="card[^"\n]*"[^>]*>/g, tag => {
    let slot = staticSlot++;
    let cards = prepared
      .filter(x => x.post.slot === slot && x.html)
      .map(x => x.html)
      .join('\n');
    return (cards ? '<!-- PLACED:START -->' + cards + '<!-- PLACED:END -->' : '') + tag;
  });
  source = prefix + body;
}

// Кнопки соседей берутся из списка. Не размазывать их HTML ещё и здесь.
const neighbours = JSON.parse(fs.readFileSync(path.join(root, 'Содержимое/buttons.json'), 'utf8'));
if (!Array.isArray(neighbours) || neighbours.length > 200)
  {
  throw Error('Список кнопок: максимум 200 сайтов.');
}
const neighbourLinks = neighbours
  .map(item => {
    if (
      !item.name ||
      !/^https:\/\//i.test(item.url || '') ||
      !/^(https:\/\/|(?:Картинки|Кнопки)\/)/i.test(item.image || '') ||
      /[<>"\s]/.test(item.url + item.image) ||
      String(item.image).includes('..')
    )
      {
      throw Error('У кнопки нужны имя, HTTPS-ссылка и путь картинки.');
    }
    if (!item.image.startsWith('https://') && !fs.existsSync(path.join(root, item.image)))
      {
      throw Error('Нет картинки кнопки: ' + item.image);
    }
    return `<a href="${escape(item.url)}" target="_blank" rel="noopener"><img src="${escape(item.image)}" width="88" height="31" alt="${escape(item.name)}" loading="lazy" style="vertical-align:middle"></a>`;
  })
  .join('\n');
source = source.replace(
  /<!-- FRIENDS:START -->[\s\S]*?<!-- FRIENDS:END -->/,
  `<!-- FRIENDS:START --><div class="button-wall friend-buttons" aria-label="Neocities">${neighbourLinks}</div><!-- FRIENDS:END -->`
);

const siteUrl = 'https://danyanspage.neocities.org/';
const feedPosts = posts.filter(post => !post.draft);
const feedItems = feedPosts
  .map(post => {
    const url = siteUrl + '#post-' + post.id;
    const text = (Array.isArray(post.text) ? post.text : [post.text || '']).join('\n\n');
    let date = '';
    if (post.date) {
      const parsed = new Date(post.date);
      if (!Number.isFinite(parsed.getTime()))
        {
        throw new Error('Неверная дата записи: ' + post.id);
      }
      date = `<pubDate>${parsed.toUTCString()}</pubDate>`;
    }
    return `<item><title>${escape(post.title)}</title><link>${escape(url)}</link><guid isPermaLink="true">${escape(url)}</guid>${date}<description>${escape(text)}</description></item>`;
  })
  .reverse();
const launchItem = `<item><title>Сайт запущен</title><link>${siteUrl}</link><guid isPermaLink="false">danyan-launch-2026-10-18</guid><pubDate>Sun, 18 Oct 2026 12:00:00 GMT</pubDate><description>Личная страничка DANYAN: музыка и творчество пока в разработке. Можно оставить запись в гостевой и потыкать сайт.</description></item>`;
// Для сверки RSS/Atom оставлю feedgen:
// https://github.com/lkiesow/python-feedgen
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>DANYAN — личная страничка</title><link>${siteUrl}</link><description>Новые записи, музыка и творчество DANYAN.</description><language>ru</language><atom:link href="${siteUrl}rss.xml" rel="self" type="application/rss+xml"/>
${feedItems.join('\n')}\n${launchItem}
</channel></rss>\n`;
fs.writeFileSync(path.join(root, 'rss.xml'), rss);

const files = [
  'emo-tracks.js',
  'emo-music-credits.txt',
  'app-shell.js',
  'app-shell.css',
  'emo.js',
  'player-dock.js',
  'texture-credits.txt',
  'chat.html',
  'chat.css',
  'chat.js',
  'chat-site.js',
  'rss.xml',
  'Кнопки/danyan.png',
  'index.html',
  'Кнопки/kolobok-license.txt',
  'rika.js',
  'Кнопки/devicon-MIT.txt',
  'Кнопки/simple-icons-CC0.txt',
  'Кнопки/aseprite.svg',
  'Кнопки/photoshop.svg',
  'Кнопки/vscode.svg',
  'Кнопки/github.svg',
  'Кнопки/python.svg',
  'Кнопки/nodejs.svg',
  'Кнопки/sqlite.svg',
  'Кнопки/mdn.svg',
  'Кнопки/html.svg',
  'Кнопки/css.svg',
  'Кнопки/javascript.svg',
  'Кнопки/pythonanywhere.svg',
  'Кнопки/neocities-api.svg',
  'Кнопки/pillow.svg',

  'Кнопки/caramel.png',
  'Кнопки/chebu.png',
  'Кнопки/credits.txt',
  'Кнопки/font.png',
  'Кнопки/fumo.png',
  'Кнопки/jeelh.png',
  'Кнопки/kenney.png',
  'Кнопки/microwave.png',
  'Кнопки/neocities.png',
  'Кнопки/nyan.png',
  'Кнопки/rori.png',
  'Кнопки/telegram.png',
  'Кнопки/twemoji.png',

  'not_found.html',
  '404.html',
  'style.css',
  'settings.js',
  'preferences.js',
  'language.js',
  'background.js',
  'site.js',
  'guestbook.js',
  'cursors.js',
  'cursor-motion-v2-20261021.js',
  'Курсоры/pixel.png',
  'Курсоры/reimu-fumo.png',

  'Курсоры/retro-text.png',
  'Курсоры/hover.png',
  'Курсоры/down.png',
  'Курсоры/blocked.png',
  'Курсоры/plain.png',
  'Курсоры/cross.png',
  'Курсоры/nyan.png',
  'Курсоры/chebu.png',
  'Курсоры/pen.png',
  'Курсоры/credits.txt',
  'Курсоры/kenney-license.txt',
  'danmaku.js',
  'caramel.js',
  'nyan.js',
  'chebu.js',
  'nyan.gif',
  'chebupel.png',
  'microwave-photo.jpg',
  'toy-credits.txt',
  'panels-v3.png',
  'panels-garland.png',
  'panels-dark.png',
  'scaffold.svg',
  'based-meme.png',
  'based-meme.webp',
  'Шрифт/PressStart2P-Regular.ttf',
  'Шрифт/pressstart2p-OFL.txt'
];
// четыре по тридцать два. Руками перечислять я заебался.
for (const state of ['normal', 'link', 'text', 'blocked']) {
  for (let i = 0; i < 32; i++) {
    files.push('Курсоры/reimu-' + state + '-' + i + '.png');
  }
}
function collect(directory, prefix = '') {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      {
      throw new Error('Символические ссылки в Картинки не поддерживаются.');
    }
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      found.push(...collect(path.join(directory, entry.name), relative + '/'));
    } else {
      found.push(relative);
    }
  }
  return found;
}
for (const name of collect(path.join(root, 'Картинки'))) {
  if (!/\.(png|jpe?g|webp|gif|svg|mp3|ogg|wav)$/i.test(name))
    {
    throw new Error(`В Картинки разрешены только медиафайлы: ${name}`);
  }
  files.push('Картинки/' + name);
}
// Стоп. Всё остальное остаётся локально, даже если похоже на файл сайта.
const previousPath = path.join(root, 'Инструменты/build-manifest.json');
const previous = fs.existsSync(previousPath)
  ? JSON.parse(fs.readFileSync(previousPath, 'utf8'))
  : [];
for (const name of collect(output)) {
  if (!files.includes(name) && !previous.includes(name))
    {
    throw new Error(
      `В publish обнаружен посторонний файл ${name}. Перемести его за пределы папки публикации.`
    );
  }
}
for (const name of files)
  if (!fs.existsSync(path.join(root, name))) {
    throw new Error(`Не хватает файла: ${name}`);
  }
fs.mkdirSync(output, { recursive: true });
for (const name of previous) {
  const target = path.resolve(output, name);
  if (!target.startsWith(output + path.sep))
    {
    throw new Error('Неверный путь в старом списке публикации.');
  }
  if (!files.includes(name) && fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}
if (fs.readFileSync(indexPath, 'utf8') !== source) {
  fs.writeFileSync(indexPath, source);
}
const pages = {};
for (const name of files) {
  let data = name === 'index.html' ? source : fs.readFileSync(path.join(root, name));
  if (/\.html$/.test(name)) {
    data = data.toString().replace(/<!--[\s\S]*?-->/g, '');
  }
  // Сначала собрать целиком в памяти. Браузер умеет залезть ровно между двумя записями, сука.
  if (name === 'index.html' || name === 'chat.html') {
    pages[name] = data;
    continue;
  }
  if (/\.(js|css)$/.test(name)) {
    data = data
      .toString()
      .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*(?:\r?\n|$)/gm, '')
      .replace(/^[ \t]*\/\/[^\r\n]*$/gm, '');
    if (name === 'settings.js') {
      data = data.replace(
        /^(\s*[a-zA-Z]\w*:\s*(?:\d+|"(?:\\.|[^"\\])*")\s*,?)\s*\/\/[^\r\n]*$/gm,
        '$1'
      );
    }
  }
  fs.mkdirSync(path.dirname(path.join(output, name)), { recursive: true });
  const destination = path.join(output, name);
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!fs.existsSync(destination) || !fs.readFileSync(destination).equals(bytes))
    {
    fs.writeFileSync(destination, bytes);
  }
}
// Плеер за пределами сменяемой страницы. Переход ему вообще не событие.
const buildHash = createHash('sha256');
for (const name of [...files].sort()) {
  const file = path.join(output, name);
  if (pages[name]) {
    buildHash.update(name).update(pages[name]);
  }
  else if (fs.existsSync(file) && fs.statSync(file).isFile())
    {
    buildHash.update(name).update(fs.readFileSync(file));
  }
}
const buildVersion = buildHash.digest('hex').slice(0, 8);
const shell = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DANYAN</title><meta name="site-build" content="${buildVersion}"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="chat.css"><link rel="stylesheet" href="app-shell.css"><link rel="alternate" type="application/rss+xml" title="DANYAN RSS" href="rss.xml"></head><body class="media-host"><nav class="site-nav" hidden></nav><iframe id="site-content" title="DANYAN" allow="autoplay; fullscreen"></iframe><noscript><p><a href="_pages/home.html">Главная / Home</a> · <a href="_pages/chat.html">Чат / Chat</a></p></noscript><script src="settings.js"></script><script src="app-shell.js"></script><script src="player-dock.js"></script><script src="caramel.js"></script><script src="emo-tracks.js"></script><script src="emo.js"></script></body></html>`;
fs.mkdirSync(path.join(output, '_pages'), { recursive: true });
for (const [entry, name] of [
  ['index.html', 'home'],
  ['chat.html', 'chat']
]) {
  const page = pages[entry].toString().replace(/<head>/, '<head><base href="/">');
  fs.writeFileSync(path.join(output, '_pages', name + '.html'), page);
  fs.writeFileSync(path.join(output, entry), shell);
  files.push('_pages/' + name + '.html');
}
fs.writeFileSync(previousPath, JSON.stringify(files, null, 2));
console.log(`Готово: ${ids.size} записей, ${files.length} файлов. Папка публикации: ${output}`);
