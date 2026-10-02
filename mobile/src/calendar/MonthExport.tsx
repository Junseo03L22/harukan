import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Album, monthCells } from './model';
import { DayPreview } from './Canvas';
import { CaptureContext, ImageTracker } from './CaptureContext';
import { captureMonth, disposeMonth, saveMonth, shareMonth } from './monthExportFiles';

export function MonthExport({ album, month, paper, onClose }: { album: Album; month: Date; paper: string; onClose: () => void }) {
  const [events, setEvents] = useState(false), [width, setWidth] = useState(0);
  const [uri, setUri] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), lock = useRef(false);
  const view = useRef<View>(null), images = useRef(new Map<string, 'pending' | 'loaded' | 'failed'>());
  const tracker = useMemo<ImageTracker>(() => ({
    register: id => { if (!images.current.has(id)) images.current.set(id, 'pending'); return () => { images.current.delete(id); }; },
    loaded: id => { images.current.set(id, 'loaded'); }, failed: id => { images.current.set(id, 'failed'); },
  }), []);
  const year = month.getFullYear(), monthIndex = month.getMonth();
  const cells = monthCells(year, monthIndex), filename = `harukan-${year}-${String(monthIndex + 1).padStart(2, '0')}.png`;
  const count = cells.filter(key => key && album.days[key]?.length).length;
  useEffect(() => {
    if (!width) return;
    let canceled = false, captured = '';
    setUri(''); setError(''); setMessage('');
    void (async () => {
      // Let DayPreview layout mount every layer, then wait for image load events.
      await new Promise(resolve => setTimeout(resolve, 250));
      const deadline = Date.now() + 20000;
      while (!canceled) {
        const states = [...images.current.values()];
        if (states.includes('failed')) throw new Error('불러오지 못한 사진이 있어요. 날짜 페이지에서 확인해 주세요.');
        if (!states.includes('pending')) break;
        if (Date.now() > deadline) throw new Error('사진을 모두 불러오지 못했어요. 다시 시도해 주세요.');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (canceled) return;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (canceled) return;
      captured = await captureMonth(view, filename);
      if (canceled) { disposeMonth(captured); captured = ''; } else setUri(captured);
    })().catch(e => { if (!canceled) setError(e instanceof Error ? e.message : '달력 이미지를 만들지 못했어요.'); });
    return () => { canceled = true; if (captured) disposeMonth(captured); };
  }, [width, events, retry, filename]);
  async function output(action: 'save' | 'share') {
    if (!uri || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (action === 'save') { await saveMonth(uri, filename); setMessage(Platform.OS === 'web' ? '이미지 다운로드를 요청했어요.' : '사진 앨범에 달력을 저장했어요.'); }
      else await shareMonth(uri, filename);
    } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setError(e instanceof Error ? e.message : '이미지를 내보내지 못했어요.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = (label: string, action: () => void, disabled = false) => <Pressable accessibilityRole="button" onPress={action} disabled={disabled} style={[s.button, disabled && { opacity: .45 }]}><Text style={s.buttonText}>{label}</Text></Pressable>;
  return <Modal visible animationType="slide" onRequestClose={() => { if (!lock.current) onClose(); }}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content} removeClippedSubviews={false}>
    <View style={s.header}><Text style={s.title}>한 달을 간직하기</Text>{button('닫기', onClose, busy)}</View>
    <Text style={s.copy}>하루하루 붙인 순간을 한 장의 달력으로 남겨요.</Text>
    <View style={s.option}><Text style={s.copy}>일정 제목도 담기</Text><Switch accessibilityLabel="일정 제목도 담기" value={events} disabled={busy} onValueChange={setEvents} trackColor={{ true: '#AD879B' }}/></View>
    <CaptureContext.Provider value={tracker}>
    <View style={{position:'relative'}}>
      <View key={`${events}-${retry}`} ref={view} collapsable={false} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={[s.print, { backgroundColor: paper }]}>
        <Text style={s.brand}>하루칸 · HARUKAN</Text><Text style={s.month}>{year}년 {monthIndex + 1}월</Text>
        <View style={s.week}>{['일', '월', '화', '수', '목', '금', '토'].map((day, i) => <Text key={day} style={[s.weekday, i === 0 && { color: '#BE7182' }]}>{day}</Text>)}</View>
        <View>{Array.from({length:cells.length/7},(_,row)=><View key={row} style={s.weekRow}>{cells.slice(row*7,row*7+7).map((key, column) => <View key={key ?? `blank-${column}`} style={s.cell}>
          <Text style={[s.day, column === 0 && { color: '#BE7182' }]}>{key ? Number(key.slice(-2)) : ' '}</Text>
          {key ? <DayPreview pieces={album.days[key] ?? []} paper={paper} paperKind={album.papers?.[key]} paperColor={album.paperColors?.[key]}/> : <View style={{ aspectRatio: 1 }}/>}
          {events && <Text numberOfLines={1} style={s.event}>{key && album.events?.[key]?.length ? `${album.events[key][0].title}${album.events[key].length > 1 ? ` +${album.events[key].length - 1}` : ''}` : ' '}</Text>}
        </View>)}</View>)}</View>
        <Text style={s.footer}>하루를 붙이고, 한 달을 꾸미다</Text>
      </View>
      {!!uri&&<Image accessibilityLabel="저장할 달력 이미지" source={{uri}} resizeMode="contain" style={StyleSheet.absoluteFill}/>}
    </View>
    </CaptureContext.Provider>
    <Text style={s.note}>{count}일의 순간을 담았어요. GIF와 영상은 정지 이미지로 저장돼요.</Text>
    {!uri && !error && <View style={s.progress}><ActivityIndicator color="#876675"/><Text style={s.copy}>달력 이미지를 준비하고 있어요…</Text></View>}
    <View style={s.actions}>{button(busy ? '처리 중…' : '이미지 저장', () => void output('save'), !uri || busy)}{button('공유하기', () => void output('share'), !uri || busy)}</View>
    {!!error && <><Text accessibilityRole="alert" style={s.error}>{error}</Text>{!uri && button('다시 만들기', () => setRetry(value => value + 1), busy)}</>}
    {!!message && <Text accessibilityLiveRegion="polite" style={s.copy}>{message}</Text>}
  </ScrollView></SafeAreaView></Modal>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F3ED' }, content: { padding: 20, gap: 18, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, title: { fontSize: 22, fontWeight: '700', color: '#503B46' },
  copy: { fontSize: 14, color: '#71545F', lineHeight: 22 }, option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  print: { padding: 14, width: '100%' }, brand: { color: '#A78997', fontSize: 9, letterSpacing: 1.5, marginTop: 8 }, month: { fontSize: 25, fontWeight: '700', color: '#503B46', marginVertical: 14 },
  week: { flexDirection: 'row', marginBottom: 8 }, weekday: { width: '14.285714%', fontSize: 10, color: '#958B8B', textAlign: 'center' },
  weekRow: { flexDirection: 'row' }, cell: { flex: 1, minWidth: 0, borderWidth: .5, borderColor: '#E9E1DB', overflow: 'hidden', paddingBottom: 3 },
  day: { fontSize: 10, color: '#716167', margin: 4 }, event: { fontSize: 8, height: 14, paddingHorizontal: 2, color: '#876675' },
  footer: { fontSize: 9, color: '#A78997', marginTop: 18, marginBottom: 6, textAlign: 'center', letterSpacing: .5 },
  button: { padding: 15, minHeight: 48, borderRadius: 12, backgroundColor: '#876675', alignItems: 'center' }, buttonText: { color: 'white', fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, note: { fontSize: 12, color: '#95828C', lineHeight: 19 }, error: { color: '#A55063', lineHeight: 22 }, progress: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
