import http from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';

const hash = value => createHash('sha256').update(value).digest('hex');
const failure = (status, message) => Object.assign(new Error(message), { status });
const avatarIds = ['salgu', 'pico', 'moru'];
const moodIds = ['normal', 'happy', 'tired', 'focus', 'complex', 'rest'];
function profileInput(p) {
  if (!p || !avatarIds.includes(p.avatar) || !moodIds.includes(p.mood) || !Number.isSafeInteger(p.updatedAt) || p.updatedAt < 0) throw failure(400, '상태 정보를 다시 선택해 줘.');
  if (p.response !== undefined && (typeof p.response !== 'string' || p.response.length > 80)) throw failure(400, '원하는 반응은 80자 이내로 적어 줘.');
  if (p.pet !== undefined && (!p.pet || !Number.isSafeInteger(p.pet.careDays) || p.pet.careDays < 0 || p.pet.careDays > 100000 || typeof p.pet.lastCareDay !== 'string' || !/^(|\d{4}-\d{2}-\d{2})$/.test(p.pet.lastCareDay) || !Object.hasOwn({basic:0,plant:1,stars:3,cushion:5},p.pet.decoration) || p.pet.careDays < {basic:0,plant:1,stars:3,cushion:5}[p.pet.decoration])) throw failure(400, '방 정보를 확인해 줘.');
  return { ...(p.pet === undefined ? {} : {pet: {careDays:p.pet.careDays,lastCareDay:p.pet.lastCareDay,decoration:p.pet.decoration}}), avatar: p.avatar, mood: p.mood, response: (p.response ?? '').trim(), seq: p.updatedAt };
}
async function body(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) throw failure(415, '지원하지 않는 요청이야.');
  let value = ''; let bytes = 0;
  for await (const part of req) { bytes += part.length; if (bytes > 4096) throw failure(413, '요청이 너무 커.'); value += part; }
  try { return JSON.parse(value); } catch { throw failure(400, '요청을 읽지 못했어.'); }
}

export function createService({ dataFile, now = Date.now, inviteTTL = 600000, pollMs = 20000, origins = [] } = {}) {
  let state = { users: {}, invites: {} };
  if (dataFile && existsSync(dataFile)) {
    state = JSON.parse(readFileSync(dataFile, 'utf8'));
    if (!state.users || !state.invites) throw new Error('Invalid saved server state; refusing to overwrite it.');
  }
  // Upgrade existing pairs without requiring users to exchange another invitation.
  for (const user of Object.values(state.users)) {
    const partner = state.users[user.partner];
    if (partner && !user.connectionId) user.connectionId = partner.connectionId = randomUUID();
  }
  const events = new EventEmitter(); events.setMaxListeners(0);
  const limits = new Map();
  function limit(key, max, windowMs = 60000) {
    const stamp = now();
    if (limits.size > 1000) for (const [k,v] of limits) if (v.until <= stamp) limits.delete(k);
    const current = limits.get(key);
    const entry = current && current.until > stamp ? current : { count: 0, until: stamp + windowMs };
    entry.count++; limits.set(key, entry);
    if (entry.count > max) throw failure(429, '시도가 많아. 잠시 후 다시 해 줘.');
  }
  function transaction(fn) {
    const next = structuredClone(state);
    const changed = fn(next);
    for (const id of new Set(changed)) if (next.users[id]) next.users[id].revision++;
    if (dataFile) {
      mkdirSync(dirname(dataFile), { recursive: true });
      writeFileSync(dataFile + '.tmp', JSON.stringify(next), { mode: 0o600 });
      renameSync(dataFile + '.tmp', dataFile);
    }
    state = next;
    for (const id of new Set(changed)) events.emit(id);
  }
  function view(userId) {
    const me = state.users[userId];
    const other = me.partner ? state.users[me.partner] : null;
    const publicProfile = user => ({ avatar: user.avatar, mood: user.mood, updatedAt: user.updatedAt, pet: user.pet ?? {careDays:0,lastCareDay:"",decoration:"basic"}, response: user.response ?? '', stateId: user.stateId ?? String(user.seq), acknowledgedAt: user.acknowledgedAt ?? null });
    const invite = Object.values(state.invites).find(i => i.owner === userId && i.expiresAt > now());
    return { revision: me.revision, me: publicProfile(me), partner: other ? publicProfile(other) : null,
      connectionId: me.connectionId ?? null, connectedAt: me.connectedAt ?? null, invite: invite ? { code: invite.code, expiresAt: invite.expiresAt } : null, serverTime: now() };
  }
  function removeInvites(next, owner) {
    for (const [code, invite] of Object.entries(next.invites)) if (invite.owner === owner || invite.expiresAt <= now()) delete next.invites[code];
  }
  function send(res, status, value) {
    if (!res.destroyed && !res.writableEnded) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
  }
  const server = http.createServer(async (req, res) => {
    try {
      const origin = req.headers.origin;
      const devOrigin = origin && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (origin && !origins.includes(origin) && !(process.env.NODE_ENV !== 'production' && devOrigin)) throw failure(403, '허용되지 않은 접근이야.');
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url, 'http://localhost');
      const ip = req.socket.remoteAddress ?? 'unknown';
      if (req.method === 'GET' && url.pathname === '/health') { send(res, 200, { ok: true }); return; }
      if (req.method === 'POST' && url.pathname === '/v1/session') {
        limit(`session:${ip}`, 30, 3600000);
        const p = profileInput((await body(req)).profile);
        const token = randomBytes(32).toString('base64url'); const id = randomUUID();
        transaction(next => { next.users[id] = { id, tokenHash: hash(token), ...p, updatedAt: Math.min(p.seq, now()), revision: 0, stateId: randomUUID(), acknowledgedAt: null, partner: null }; return [id]; });
        send(res, 201, { token, snapshot: view(id) }); return;
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      if (!token || token.length > 100) throw failure(401, '연결 정보를 확인하지 못했어.');
      const tokenHash = hash(token);
      const me = Object.values(state.users).find(u => u.tokenHash === tokenHash);
      if (!me) throw failure(401, '저장된 연결 정보를 사용할 수 없어.');
      const id = me.id;
      limit(`request:${id}`, 180);
      if (req.method === 'GET' && url.pathname === '/v1/snapshot') {
        if (Number(url.searchParams.get('after')) === me.revision && url.searchParams.has('after')) {
          await new Promise(resolveWait => {
            const finish = () => { clearTimeout(timer); events.off(id, finish); res.off('close', finish); resolveWait(); };
            const timer = setTimeout(finish, pollMs); events.once(id, finish); res.once('close', finish);
          });
        }
        send(res, 200, view(id)); return;
      }
      if (req.method === 'PUT' && url.pathname === '/v1/profile') {
        const p = profileInput((await body(req)).profile);
        if (p.seq > state.users[id].seq) transaction(next => { const user = next.users[id]; const changedResponse = (user.response ?? '') !== p.response; Object.assign(user, p, { updatedAt: Math.min(p.seq, now()), ...(changedResponse ? {stateId: randomUUID(), acknowledgedAt: null} : {}) }); return [id, next.users[id].partner].filter(Boolean); });
        send(res, 200, view(id)); return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/acknowledge') {
        const input = await body(req);
        transaction(next => {
          const user = next.users[id]; const partner = next.users[user.partner];
          if (!partner || !partner.response || !user.connectionId || input.connectionId !== user.connectionId || input.stateId !== (partner.stateId ?? String(partner.seq))) throw failure(409, '상태나 연결이 바뀌었어. 최신 상태를 확인하고 다시 눌러 줘.');
          if (partner.acknowledgedAt != null) return [];
          partner.acknowledgedAt = now(); return [id, partner.id];
        });
        send(res, 200, view(id)); return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/invite') {
        limit(`invite:${id}`, 10);
        if (me.partner) throw failure(409, '이미 상대와 연결되어 있어.');
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code;
        do { code = Array.from(randomBytes(8), b => alphabet[b % alphabet.length]).join(''); } while(state.invites[code]);
        transaction(next => { removeInvites(next, id); next.invites[code] = { code, owner: id, expiresAt: now() + inviteTTL }; return [id]; });
        send(res, 201, view(id)); return;
      }
      if (req.method === 'DELETE' && url.pathname === '/v1/invite') {
        transaction(next => { removeInvites(next, id); return [id]; }); send(res, 200, view(id)); return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/join') {
        limit(`join:${id}`, 6); limit(`join-ip:${ip}`, 30);
        const input = await body(req); const code = String(input.code ?? '').replace(/[\s-]/g, '').toUpperCase();
        if (!/^[A-Z2-9]{8}$/.test(code)) throw failure(400, '초대 코드 8자리를 확인해 줘.');
        transaction(next => {
          const guest = next.users[id]; const invite = next.invites[code];
          if (guest.partner) throw failure(409, '이미 상대와 연결되어 있어.');
          if (!invite || invite.expiresAt <= now()) throw failure(404, '코드가 없거나 만료됐어. 새 코드를 받아 줘.');
          if (invite.owner === id) throw failure(400, '내 코드야. 상대의 코드를 입력해 줘.');
          const host = next.users[invite.owner];
          if (!host || host.partner) throw failure(409, '이미 사용된 코드야.');
          guest.connectionId = host.connectionId = randomUUID(); guest.acknowledgedAt = host.acknowledgedAt = null;
          guest.partner = host.id; host.partner = id; guest.connectedAt = host.connectedAt = now();
          removeInvites(next, id); removeInvites(next, host.id); return [id, host.id];
        });
        send(res, 200, view(id)); return;
      }
      if (req.method === 'DELETE' && url.pathname === '/v1/connection') {
        transaction(next => {
          const user = next.users[id]; const partner = user.partner;
          user.connectionId = null; user.acknowledgedAt = null; user.partner = null; user.connectedAt = null; removeInvites(next, id);
          if (partner && next.users[partner]) { next.users[partner].connectionId = null; next.users[partner].acknowledgedAt = null; next.users[partner].partner = null; next.users[partner].connectedAt = null; }
          return [id, partner].filter(Boolean);
        }); send(res, 200, view(id)); return;
      }
      throw failure(404, '찾을 수 없는 요청이야.');
    } catch (error) {
      if (!error.status) console.error('Server request failed:', error.message);
      send(res, error.status ?? 500, { error: error.status ? error.message : '저장하지 못했어. 잠시 후 다시 해 줘.' });
    }
  });
  server.on('close', () => { for (const id of events.eventNames()) events.emit(id); });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  const dataFile = resolve(process.env.DATA_FILE ?? 'server/data/state.json');
  const server = createService({ dataFile, origins: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean) });
  server.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`마음사이 연결 서버 실행 중 · port ${port}`));
}
