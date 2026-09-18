const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => dependencies[name], module, module.exports);
  return module.exports;
}
const model = load('model.ts');
test('invalid saved data falls back to character selection', () => {
  for (const raw of [null, '', '{oops', 'null', '{}', JSON.stringify({avatar:'other',mood:'normal',updatedAt:1}), JSON.stringify({avatar:'salgu',mood:'unknown',updatedAt:1}), JSON.stringify({avatar:'salgu',mood:'normal',updatedAt:'yesterday'})]) assert.equal(model.parseProfile(raw), null);
});
test('all 18 avatar and mood combinations restore correctly', () => {
  for(const a of model.avatars) for(const m of model.moods) {
    const value={avatar:a.id,mood:m.id,updatedAt:123456};
    assert.deepEqual(model.parseProfile(JSON.stringify(value)),value);
  }
});
test('rapid changes persist in order when the first write is slow', async () => {
  let release; let persisted; const calls=[];
  const gate = new Promise(resolve=>{release=resolve});
  const adapter={setItem:async(key,value)=>{calls.push(value);if(calls.length===1)await gate;persisted=value;},getItem:async()=>persisted};
  const storage=load('storage.ts', {'@react-native-async-storage/async-storage':adapter,'./model':model});
  const a={avatar:'salgu',mood:'normal',updatedAt:1};const b={avatar:'moru',mood:'rest',updatedAt:2};
  const first=storage.saveProfile(a);const second=storage.saveProfile(b);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);
  release();await Promise.all([first,second]);assert.deepEqual(await storage.loadProfile(),b);
});
test('failed writes are reported without blocking subsequent retries', async () => {
  let fail=true;let persisted;
  const adapter={setItem:async(key,value)=>{if(fail){fail=false;throw new Error('Storage unavailable');}persisted=value;},getItem:async()=>persisted};
  const storage=load('storage.ts', {'@react-native-async-storage/async-storage':adapter,'./model':model});
  const p={avatar:'pico',mood:'focus',updatedAt:1};
  await assert.rejects(storage.saveProfile(p));await storage.saveProfile(p);assert.deepEqual(await storage.loadProfile(),p);
});
