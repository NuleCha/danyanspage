// ключ остаётся в .private, на сервер уезжает сайт
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privateDir = path.join(root, '.private');
const keyFile = path.join(privateDir, 'neocities-api-key.txt');
const stateFile = path.join(privateDir, 'neocities-sync.json');
const expectedSite = 'danyanspage';
const interval = 10 * 60 * 1000;
if (process.argv.includes('--stop')) {
  const lock = path.join(privateDir, 'neocities-sync.lock');
  try {
    const pid = Number(fs.readFileSync(lock, 'utf8'));
    if (Number.isInteger(pid) && pid > 0) {
      process.kill(pid, 'SIGTERM');
    }
    console.log('Автопубликация остановлена.');
  } catch (error) {
    console.log('Активная автопубликация не найдена.');
  }
  process.exit(0);
}
const watch = process.argv.includes('--watch');
const dry = process.argv.includes('--dry-run');
let busy = false;
let lastInput = '';
function inputHash(folder = root) {
  // Проверять содержимое файлов. Время изменения само по себе ничего не доказывает.
  const hash = crypto.createHash('sha1');
  for (const entry of fs
    .readdirSync(folder, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (
      entry.name.startsWith('.') ||
      ['publish', 'node_modules', '__pycache__', 'build-manifest.json'].includes(entry.name)
    )
      {
      continue;
    }
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      hash.update(inputHash(file));
    }
    else if (
      /\.(html|css|js|mjs|json|svg|png|gif|jpe?g|webp|ttf|woff2?|txt|xml)$/.test(entry.name)
    )
      {
      hash.update(file).update(fs.readFileSync(file));
    }
  }
  return hash.digest('hex');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function saveState(state) {
  fs.mkdirSync(privateDir, { recursive: true });
  fs.writeFileSync(stateFile + '.tmp', JSON.stringify(state, null, 2), {
    mode: 0o600
  });
  fs.renameSync(stateFile + '.tmp', stateFile);
}

async function api(endpoint, key, options = {}) {
  const response = await fetch('https://neocities.org/api/' + endpoint, {
    ...options,
    headers: { Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(90000)
  });
  const body = await response.text();
  let result;
  try {
    result = JSON.parse(body);
  } catch (ignore) {
    throw new Error(
      'Neocities /' +
        endpoint +
        ': некорректный ответ (HTTP ' +
        response.status +
        '). Изменения сохранены локально.'
    );
  }
  if (!response.ok || result.result !== 'success') {
    // Ответ целиком не печатать. Ещё не хватало ключом в терминале насветить.
    throw new Error(
      'Neocities /' + endpoint + ': HTTP ' + response.status + ' (' + String(result.error_type || 'request_failed').replace(/[^a-z_]/gi, '') + ').'
    );
  }
  return result;
}

// Официальный клиент API оставлю рядом ссылкой, если придётся сверять запросы:
// https://github.com/neocities/neocities-ruby
function collect() {
  // Только манифест. Не всю папку, блять.
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'Инструменты/build-manifest.json'), 'utf8')
  );
  const publicDir = path.join(root, 'publish');
  return manifest.map(name => {
    if (
      typeof name !== 'string' ||
      name.includes('..') ||
      name.startsWith('/') ||
      name.includes('\\') ||
      !/\.(html|css|js|svg|png|gif|jpg|jpeg|webp|ttf|woff2?|txt|xml)$/i.test(name) ||
      name.split('/').some(part => part.startsWith('.')) ||
      /(?:api.?key|\.env)/i.test(name)
    ) {
      throw new Error('Небезопасный путь в списке публикации.');
    }
    const file = path.join(publicDir, name);
    if (
      fs.lstatSync(file).isSymbolicLink() ||
      !fs.realpathSync(file).startsWith(fs.realpathSync(publicDir) + path.sep)
    ) {
      throw new Error('В папке публикации обнаружена символическая ссылка.');
    }
    const data = fs.readFileSync(file);
    return {
      name,
      data,
      hash: crypto.createHash('sha1').update(data).digest('hex')
    };
  });
}

function studioProgress(percent, message, status = 'running') {
  const target = process.env.DANYAN_STUDIO_PROGRESS;
  if (target) {
    fs.writeFileSync(target, JSON.stringify({ percent, message, status }));
  }
}
async function sync() {
  if (busy) {
    return;
  }
  busy = true;
  try {
    studioProgress(15, 'Собираю сайт…');
    const currentInput = inputHash();
    if (currentInput !== lastInput) {
      const build = spawnSync(process.execPath, [path.join(root, 'Инструменты/build.mjs')], {
        cwd: root,
        encoding: 'utf8'
      });
      if (build.status !== 0)
        {
        throw new Error('Сборка не прошла. Ничего не загружено.\n' + (build.stderr || ''));
      }
      lastInput = inputHash();
    }
    const files = collect();
    const state = readState();
    const localChanges = files.filter(file => state.hashes?.[file.name] !== file.hash);
    if (dry) {
      console.log(
        'Проверка без отправки: файлов ' +
          files.length +
          ', локальных изменений ' +
          localChanges.length +
          '. Ключи и личные данные исключены.'
      );
      return;
    }
    if (!fs.existsSync(keyFile))
      {
      throw new Error('Сначала запусти задачу «Neocities: подключить ключ».');
    }
    const key = fs.readFileSync(keyFile, 'utf8').trim();
    if (!key || /\s/.test(key)) {
      throw new Error('API-ключ пуст или содержит пробелы.');
    }
    if (!localChanges.length) {
      studioProgress(100, 'На Neocities уже актуальная версия.', 'done');
      console.log('Изменений нет.');
      return;
    }
    const remaining =
      interval - (Date.now() - Math.max(state.lastAttempt || 0, state.lastUpload || 0));
    if (remaining > 0) {
      studioProgress(
        0,
        'Пока не отправлено: лимит публикации, осталось ' +
          Math.ceil(remaining / 60000) +
          ' мин.',
        'waiting'
      );
      console.log(
        'Изменения ждут отправки: осталось примерно ' + Math.ceil(remaining / 60000) + ' мин.'
      );
      return;
    }
    saveState({ ...state, lastAttempt: Date.now() });
    studioProgress(30, 'Проверяю подключение к Neocities…');
    const { info } = await api('info', key);
    if (info.sitename?.toLowerCase() !== expectedSite)
      {
      throw new Error('Ключ относится к другому сайту. Загрузка остановлена.');
    }
    // Локальное «уже залито» тоже проверить. Прошлая отправка могла оборваться посередине.
    const form = new URLSearchParams();
    for (const file of files) form.append(file.name, file.hash);
    const comparison = await api('upload_hash', key, {
      method: 'POST',
      body: form
    });
    const changed = files.filter(file => comparison.files[file.name] !== true);
    studioProgress(40, 'Отправляю ' + changed.length + ' файлов…');
    if (changed.length) {
      for (let offset = 0; offset < changed.length; offset += 40) {
        const upload = new FormData();
        for (const file of changed.slice(offset, offset + 40))
          upload.append(file.name, new Blob([file.data]), path.posix.basename(file.name));
        await api('upload', key, { method: 'POST', body: upload });
        const done = Math.min(offset + 40, changed.length);
        studioProgress(
          40 + Math.round((55 * done) / changed.length),
          'Отправлено ' + done + ' из ' + changed.length + ' файлов'
        );
      }
    }
    saveState({
      hashes: Object.fromEntries(files.map(file => [file.name, file.hash])),
      lastUpload: Date.now()
    });
    studioProgress(100, 'Обновление загружено на Neocities.', 'done');
    console.log(
      'Готово: обновлено файлов ' +
        changed.length +
        '. https://' +
        expectedSite +
        '.neocities.org/'
    );
  } finally {
    busy = false;
  }
}

async function run() {
  try {
    await sync();
  } catch (error) {
    studioProgress(0, error.message, 'error');
    console.error(error.message);
    if (!watch) {
      process.exitCode = 1;
    }
  }
}
fs.mkdirSync(privateDir, { recursive: true });
const lockFile = path.join(privateDir, 'neocities-sync.lock');
try {
  if (fs.existsSync(lockFile)) {
    const pid = Number(fs.readFileSync(lockFile, 'utf8'));
    let alive = false;
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch (error) {
        if (error.code !== 'ESRCH') {
          alive = true;
        }
      }
    }
    if (alive) {
      throw new Error('Автопубликация уже работает. Сначала останови прежнюю задачу.');
    }
    fs.unlinkSync(lockFile);
  }
  fs.writeFileSync(lockFile, String(process.pid), { flag: 'wx', mode: 0o600 });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
process.on('exit', () => {
  try {
    if (fs.readFileSync(lockFile, 'utf8') === String(process.pid)) {
      fs.unlinkSync(lockFile);
    }
  } catch (ignore) {}
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
await run();
if (watch && fs.existsSync(keyFile)) {
  console.log(
    'Автопубликация включена. Проверка раз в 30 секунд, отправка не чаще раза в 10 минут. Остановка: Ctrl+C.'
  );
  setInterval(run, 30000);
}
