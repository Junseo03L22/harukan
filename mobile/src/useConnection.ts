import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, API_URL, request, session, Snapshot } from './connection';
import { Profile } from './model';

export function useConnection(profile: Profile | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [state, setState] = useState<'connecting' | 'live' | 'offline' | 'setup'>('connecting');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [syncedAt, setSyncedAt] = useState(-1);
  const profileRef = useRef(profile); profileRef.current = profile;
  const confirmed = useRef(-1); const snapRef = useRef<Snapshot | null>(null);
  const poll = useRef<AbortController | null>(null);
  const flight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true); const activeRef = useRef(active); activeRef.current = active;
  const lock = useRef(false); const skew = useRef(0);
  function apply(next: Snapshot) {
    if (!mounted.current || (snapRef.current && next.revision < snapRef.current.revision)) return;
    snapRef.current = next; skew.current = next.serverTime - Date.now();
    setSnapshot(next); setNow(next.serverTime);
  }
  async function flush(token: string) {
    if (flight.current) return flight.current;
    flight.current = (async () => {
      while (mounted.current && activeRef.current && profileRef.current && profileRef.current.updatedAt > confirmed.current) {
        const current = profileRef.current;
        const next = await request('/v1/profile', { token, method: 'PUT', body: { profile: current } });
        confirmed.current = current.updatedAt;
        if (mounted.current) { setSyncedAt(current.updatedAt); apply(next); setState('live'); }
      }
    })().finally(() => { flight.current = null; });
    return flight.current;
  }
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', s => setActive(s === 'active'));
    const clock = setInterval(() => setNow(Date.now() + skew.current), 1000);
    return () => { mounted.current = false; subscription.remove(); clearInterval(clock); poll.current?.abort(); };
  }, []);
  const enabled = !!profile;
  useEffect(() => {
    if (!enabled || !active) return;
    if (!API_URL) { setState('setup'); return; }
    let cancelled = false; let wake: ReturnType<typeof setTimeout> | undefined; let failures = 0;
    async function run() {
      if (cancelled) return;
      try {
        const token = await session(profileRef.current!);
        if (cancelled) return;
        await flush(token);
        if (cancelled) return;
        const controller = new AbortController(); poll.current = controller;
        const after = failures || !snapRef.current ? '' : `?after=${snapRef.current.revision}`;
        const next = await request(`/v1/snapshot${after}`, { token, signal: controller.signal });
        if (cancelled) return;
        apply(next); setState('live'); failures = 0;
        wake = setTimeout(run, 30);
      } catch (e) {
        if (cancelled) return;
        setState('offline'); failures++;
        if (e instanceof ApiError && e.status === 401) { setError(e.message); return; }
        wake = setTimeout(run, Math.min(1000 * 2 ** failures, 15000));
      }
    }
    setState('connecting'); void run();
    return () => { cancelled = true; if (wake) clearTimeout(wake); poll.current?.abort(); };
  }, [enabled, active, epoch]);
  useEffect(() => {
    if (!profile || !active || !API_URL) return;
    let cancelled = false;
    session(profile).then(flush).catch(() => { if (!cancelled) setState('offline'); });
    return () => { cancelled = true; };
  }, [profile?.updatedAt, active]);
  async function action(path: string, method: string, body?: unknown) {
    if (lock.current || !profileRef.current) return false;
    lock.current = true; setBusy(true); setError('');
    try {
      const token = await session(profileRef.current); await flush(token);
      const next = await request(path, { token, method, body }); apply(next); setState('live'); return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '연결하지 못했어. PC와 같은 Wi-Fi인지 확인해 줘.'); return false;
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return { snapshot, state, error, busy, now, synced: !!profile && syncedAt >= profile.updatedAt,
    retry: () => { setError(''); setEpoch(e => e + 1); }, clearError: () => setError(''),
    acknowledge: (stateId: string, connectionId: string) => action('/v1/acknowledge', 'POST', { stateId, connectionId }),
    createInvite: () => action('/v1/invite', 'POST'), cancelInvite: () => action('/v1/invite', 'DELETE'),
    join: (code: string) => action('/v1/join', 'POST', { code }), disconnect: () => action('/v1/connection', 'DELETE') };
}
