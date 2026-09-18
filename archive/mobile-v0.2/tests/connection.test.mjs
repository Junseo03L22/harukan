import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../server/server.mjs';
const initial = { avatar: 'salgu', mood: 'normal', updatedAt: 1 };
async function fixture(t, options = {}) {
  const server = createService({ pollMs: 500, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const close = async () => { if (server.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
  t.after(close);
  async function api(path, token, method = 'GET', data) {
    const r = await fetch(url + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: r.status, value: await r.json() };
  }
  const user = async (profile = initial) => (await api('/v1/session', null, 'POST', { profile })).value.token;
  const pair = async (a,b) => { const invite = await api('/v1/invite',a,'POST'); return api('/v1/join',b,'POST',{code:invite.value.invite.code}); };
  return { api, user, pair, close, url };
}
test('two independent devices pair; strangers cannot read their profiles', async t => {
  const f = await fixture(t); const a = await f.user(); const b = await f.user({...initial,avatar:'moru'}); const stranger = await f.user();
  const joined = await f.pair(a,b); assert.equal(joined.status,200); assert.equal(joined.value.partner.avatar,'salgu');
  const first = await f.api('/v1/snapshot',a); assert.equal(first.value.partner.avatar,'moru');
  assert.equal((await f.api('/v1/snapshot',stranger)).value.partner,null);
  assert.equal((await f.api('/v1/snapshot')).status,401);
  assert.equal((await f.api('/v1/invite',a,'POST')).status,409);
  assert.equal(JSON.stringify(first.value).includes('token'),false);
});
test('long-poll wakes on partner change and stale writes cannot regress status', async t => {
  const f=await fixture(t,{pollMs:3000});const a=await f.user();const b=await f.user();await f.pair(a,b);
  const prior=(await f.api('/v1/snapshot',b)).value;
  const waiting=f.api(`/v1/snapshot?after=${prior.revision}`,b);
  await new Promise(r=>setTimeout(r,30));
  await f.api('/v1/profile',a,'PUT',{profile:{avatar:'pico',mood:'happy',updatedAt:30}});
  const changed = await Promise.race([waiting,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Update did not arrive immediately')),1500);timer.unref();})]);
  assert.equal(changed.value.partner.mood,'happy');assert.equal(changed.value.partner.avatar,'pico');
  await f.api('/v1/profile',a,'PUT',{profile:{...initial,mood:'tired',updatedAt:20}});
  assert.equal((await f.api('/v1/snapshot',b)).value.partner.mood,'happy');
});
test('self invitation, expired and cancelled codes are rejected', async t => {
  let now=1000;const f=await fixture(t,{now:()=>now,inviteTTL:100});const a=await f.user();const b=await f.user();
  let code=(await f.api('/v1/invite',a,'POST')).value.invite.code;
  assert.equal((await f.api('/v1/join',a,'POST',{code})).status,400);
  now=1101;assert.equal((await f.api('/v1/join',b,'POST',{code})).status,404);
  code=(await f.api('/v1/invite',a,'POST')).value.invite.code;
  await f.api('/v1/invite',a,'DELETE');assert.equal((await f.api('/v1/join',b,'POST',{code})).status,404);
});
test('concurrent joins admit only one partner; unlink removes access on both sides', async t => {
  const f=await fixture(t);const a=await f.user();const b=await f.user();const c=await f.user();
  const code=(await f.api('/v1/invite',a,'POST')).value.invite.code;
  const result=await Promise.all([f.api('/v1/join',b,'POST',{code}),f.api('/v1/join',c,'POST',{code})]);
  assert.equal(result.filter(r=>r.status===200).length,1);
  const winner=result[0].status===200?b:c;
  await f.api('/v1/connection',a,'DELETE');
  assert.equal((await f.api('/v1/snapshot',winner)).value.partner,null);
  await f.api('/v1/profile',a,'PUT',{profile:{...initial,mood:'complex',updatedAt:2}});
  assert.equal((await f.api('/v1/snapshot',winner)).value.partner,null);
  assert.equal((await f.api('/v1/snapshot',a)).value.partner,null);
});
test('pair and hashed credentials survive server restart', async t => {
  const folder=mkdtempSync(join(tmpdir(),'maeumsai-test-'));const dataFile=join(folder,'state.json');
  const f=await fixture(t,{dataFile});const a=await f.user();const b=await f.user();await f.pair(a,b);await f.close();
  const raw=readFileSync(dataFile,'utf8');assert.equal(raw.includes(a),false);assert.equal(raw.includes(b),false);
  const fresh=await fixture(t,{dataFile});assert.equal((await fresh.api('/v1/snapshot',a)).value.partner.avatar,'salgu');
  await fresh.close();unlinkSync(dataFile);rmdirSync(folder);
});
test('invalid data, untrusted origins and repeated code guesses are rejected', async t => {
  const f=await fixture(t);const a=await f.user();
  assert.equal((await f.api('/v1/profile',a,'PUT',{profile:{...initial,mood:'fake'}})).status,400);
  const blocked=await fetch(f.url+'/v1/snapshot',{headers:{Origin:'https://untrusted.example',Authorization:`Bearer ${a}`}});assert.equal(blocked.status,403);
  for(let i=0;i<6;i++) assert.equal((await f.api('/v1/join',a,'POST',{code:'ABCDEFGH'})).status,404);
  assert.equal((await f.api('/v1/join',a,'POST',{code:'ABCDEFGH'})).status,429);
});
test('delayed uploads keep their original change time and future timestamps are clamped', async t => {
  const f=await fixture(t,{now:()=>10000});const a=await f.user({...initial,updatedAt:1000});
  assert.equal((await f.api('/v1/snapshot',a)).value.me.updatedAt,1000);
  await f.api('/v1/profile',a,'PUT',{profile:{...initial,mood:'rest',updatedAt:5000}});
  assert.equal((await f.api('/v1/snapshot',a)).value.me.updatedAt,5000);
  await f.api('/v1/profile',a,'PUT',{profile:{...initial,mood:'happy',updatedAt:20000}});
  assert.equal((await f.api('/v1/snapshot',a)).value.me.updatedAt,10000);
});
