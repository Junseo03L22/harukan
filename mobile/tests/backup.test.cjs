const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }; new Function('require', 'exports', 'module', code)(name => dependencies[name], module.exports, module); return module.exports;
}
const model = load('src/calendar/model.ts');
const backup = load('src/calendar/backup.ts', { './model': model });
const photo = { id: 'p', kind: 'photo', source: 'photo.jpg', width: 200, height: 100, x: .5, y: .5, size: .7, rotation: 20,
  frame: 'polaroid', caption: '바다', tone: 'warm', intensity: .5, cutout: { outline: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 800 }], strokes: [] } };
function album() {
  return { ...model.emptyAlbum(), days: { '2026-10-02': [photo,
    { ...photo, id: 'gif', kind: 'gif', source: 'motion.gif' },
    { ...photo, id: 'clip', kind: 'video', source: 'clip.mp4', duration: 4, poster: 'poster.jpg' },
    { ...photo, id: 'four', kind: 'collage', source: 'collage', layout: 'grid', frameColor: '#FFFDF8', frames: Array.from({ length: 4 }, () => ({ source: 'photo.jpg', width: 200, height: 100 })) },
  ] }, shelf: [photo], months: { '2026-10:top': { pieces: [{ ...photo, source: 'old.png' }], paper: 'grid' } },
    papers: { '2026-10-02': 'kraft' }, paperColors: { '2026-10-02': '#FFEEDD' },
    events: { '2026-10-02': [{ id: 'event', title: '산책', time: null, note: '메모', done: true, style: 'highlight' }] } };
}
async function fixture() { return backup.createBackup(album(), async source => ({ mime: source.endsWith('.mp4') ? 'video/mp4' : source.endsWith('.gif') ? 'image/gif' : 'image/jpeg', base64: Buffer.from(source).toString('base64') })); }
test('backup deduplicates media and preserves collage, shelf, old margins and decoration', async () => {
  const original = album(), before = JSON.stringify(original), reads = [];
  const result = await backup.createBackup(original, async source => { reads.push(source); return { mime: 'image/jpeg', base64: 'YWJj' }; });
  assert.deepEqual(reads, ['photo.jpg', 'motion.gif', 'clip.mp4', 'poster.jpg', 'old.png']);
  assert.equal(JSON.stringify(original), before);
  assert.equal(result.album.days['2026-10-02'][0].source, result.album.shelf[0].source);
  assert.equal(result.album.days['2026-10-02'][3].frames[3].source, result.album.shelf[0].source);
  assert.deepEqual(backup.parseBackup(JSON.stringify(result)), result);
});
test('restore saves only after all files exist and rewrites every reference', async () => {
  const result = await fixture(), calls = [];
  const restored = await backup.restoreBackup(result, {
    write: async media => { calls.push('write'); return `restored-${calls.length}.jpg`; }, remove: async () => assert.fail('no rollback on success'),
    save: async value => { assert.equal(calls.length, 5); assert.equal(backup.mediaSources(value).length, 5); calls.push('save'); },
  });
  assert.equal(calls.at(-1), 'save');
  assert.equal(restored.days['2026-10-02'][2].poster, 'restored-4.jpg');
  assert.deepEqual(restored.events, album().events); assert.deepEqual(restored.days['2026-10-02'][0].cutout, photo.cutout);
});
test('failed writes roll back only new files and do not replace current album', async () => {
  let writes = 0, saved = false; const removed = [];
  await assert.rejects(backup.restoreBackup(await fixture(), {
    write: async () => { if (++writes === 3) throw new Error('disk full'); return `new-${writes}`; },
    remove: async source => removed.push(source), save: async () => { saved = true; },
  }), /disk full/);
  assert.deepEqual(removed.sort(), ['new-1', 'new-2']); assert.equal(saved, false);
});
test('metadata save failure removes imported media and propagates failure', async () => {
  let written = 0; const removed = [];
  await assert.rejects(backup.restoreBackup(await fixture(), {
    write: async () => `new-${++written}`, remove: async source => removed.push(source), save: async () => { throw new Error('storage full'); },
  }), /storage full/); assert.equal(removed.length, 5);
});
test('unsupported, missing, corrupt and external media references are rejected before writes', async () => {
  const good = await fixture();
  for (const mutate of [v => { v.version = 2; }, v => { delete v.media['asset:0']; }, v => { v.media['asset:0'].base64 = '!!!!'; },
    v => { v.media['asset:0'].base64 = 'YWJj'; }, v => { v.album.shelf[0].source = '../../private.jpg'; },
    v => { v.album.days['2026-10-02'][0].source = 'https://example.com/private'; }, v => { v.media['asset:0'].mime = 'text/html'; }]) {
    const bad = structuredClone(good); mutate(bad);
    assert.throws(() => backup.parseBackup(JSON.stringify(bad)));
    await assert.rejects(backup.restoreBackup(bad, { write: async () => assert.fail('must validate first'), remove: async () => {}, save: async () => assert.fail('must validate first') }));
  }
});
test('empty albums round trip and unicode file size matches UTF-8', async () => {
  const empty = await backup.createBackup(model.emptyAlbum(), async () => assert.fail('no media'));
  assert.deepEqual(backup.parseBackup(JSON.stringify(empty)).album, model.emptyAlbum());
  assert.equal(backup.utf8Size('하루칸 📸 abc'), Buffer.byteLength('하루칸 📸 abc'));
});
