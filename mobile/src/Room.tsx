import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { avatars, decorations, dayKey, initialPet, moods, Pet, Profile } from './model';
import { useConnection } from './useConnection';

export function Room({ profile, connection, onPet }: { profile: Profile; connection: ReturnType<typeof useConnection>; onPet: (decoration?: Pet['decoration']) => void }) {
  const [visiting, setVisiting] = useState(false);
  const [decorate, setDecorate] = useState(false);
  const [treat, setTreat] = useState(false);
  const partner = connection.snapshot?.partner;
  const away = visiting && !!partner;
  const shown = away ? partner : profile;
  const pet = shown.pet ?? initialPet;
  const character = avatars.find(a => a.id === shown.avatar)!;
  const mood = moods.find(m => m.id === shown.mood)!;
  const decor = decorations.find(d => d.id === pet.decoration)!;
  const fed = (profile.pet ?? initialPet).lastCareDay >= dayKey(connection.now);
  const next = decorations.find(d => d.days > pet.careDays);
  useEffect(() => { if (!treat) return; const timer = setTimeout(() => setTreat(false), 2200); return () => clearTimeout(timer); }, [treat]);
  useEffect(() => { if (!partner) setVisiting(false); }, [!!partner]);
  return <>
    <View style={s.tabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: !away }} onPress={() => { setVisiting(false); setTreat(false); }} style={[s.tab, !away && s.active]}><Text style={s.tabText}>나의 방</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: away, disabled: !partner }} disabled={!partner} onPress={() => { setVisiting(true); setTreat(false); setDecorate(false); }} style={[s.tab, away && s.active, !partner && { opacity: .4 }]}><Text style={s.tabText}>상대의 방 ↗</Text></Pressable>
    </View>
    <View style={s.room}>
      <View style={s.roomTop}><Text style={s.roomName}>{character.name}의 작은 방</Text><Text style={[s.pill, { backgroundColor: mood.color }]}>{mood.symbol} {mood.label}</Text></View>
      <View accessible={false} style={s.window}><View style={s.sun}/><View style={s.windowBar}/><View style={s.windowCross}/></View>
      <View style={s.floor}/><View style={[s.rug, { backgroundColor: decor.color }]}/>
      {pet.decoration === 'plant' && <View style={s.plant}><View style={s.leaf}/><View style={[s.leaf, { transform: [{ rotate: '55deg' }], left: 18 }]}/><View style={s.pot}/></View>}
      {pet.decoration === 'stars' && <View style={s.mobile}><Text style={s.stars}>│    │</Text><Text style={s.stars}>✦  ·  ☆</Text></View>}
      {(pet.decoration === 'cushion' || shown.mood === 'rest' || shown.mood === 'tired') && <View style={s.cushion}/>}
      <View style={s.character}><Avatar id={shown.avatar} mood={treat && !away ? 'happy' : shown.mood} size={230} motion restart={treat ? 1 : 0} /></View>
      {shown.mood === 'focus' && <View style={s.book}><Text style={s.bookText}>▤  ▤</Text></View>}
      {treat && !away && <View style={s.bubble}><Text style={s.bubbleText}>냠냠! 잘 먹었어 🍪</Text></View>}
      <View style={s.caption}><Text style={s.captionText}>{mood.description}</Text></View>
    </View>
    <View style={s.growth}>
      <View style={s.growthTop}><Text style={s.level}>Lv. {Math.floor(pet.careDays / 3) + 1} · {pet.careDays}일 돌봤어</Text><Text style={s.small}>{next ? `다음 선물까지 ${next.days - pet.careDays}일` : '꾸미기 선물을 모두 모았어'}</Text></View>
      <View style={s.track}><View style={[s.fill, { width: `${next ? Math.min(100, pet.careDays / next.days * 100) : 100}%` }]}/></View>
      <Text style={s.small}>{next ? `다음 선물 · ${next.label}` : '앞으로도 우리 속도로 자라자'}</Text>
    </View>
    {!away ? <>
      <View style={s.actions}><Pressable accessibilityRole="button" disabled={fed} onPress={() => { onPet(); setTreat(true); }} style={[s.feed, fed && { backgroundColor: '#E7E1DA' }]}><Text style={[s.feedText, fed && { color: '#82766C' }]}>{fed ? '✓ 오늘 간식 먹었어' : '🍪 간식 주기'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDecorate(v => !v)} style={s.decorate}><Text style={s.tabText}>방 꾸미기</Text></Pressable></View>
      <Text style={s.note}>하루 한 번, 천천히 자라요. 며칠 쉬어도 괜찮아.</Text>
      {decorate && <View style={s.collection}>{decorations.map(d => { const locked = pet.careDays < d.days; return <Pressable key={d.id} accessibilityRole="radio" accessibilityState={{ checked: pet.decoration === d.id, disabled: locked }} disabled={locked} onPress={() => onPet(d.id)} style={[s.item, pet.decoration === d.id && { borderColor: '#8873A7' }, locked && { opacity: .5 }]}><View style={[s.swatch, { backgroundColor: d.color }]}/><Text style={s.itemText}>{d.label}</Text><Text style={s.small}>{locked ? `${d.days}일 돌보면 열려` : pet.decoration === d.id ? '사용 중 ✓' : '놓아보기'}</Text></Pressable>; })}</View>}
    </> : <>
      <Text style={s.note}>{connection.state === 'live' ? '상대가 꾸민 방에 놀러 왔어.' : '연결 확인 중 · 마지막으로 받은 방이야.'}</Text>
      {!!partner.response && <View style={s.message}><Text style={s.small}>상대가 남긴 한마디</Text><Text style={s.messageText}>{partner.response}</Text><Pressable accessibilityRole="button" disabled={connection.busy || connection.state !== 'live' || partner.acknowledgedAt != null || !connection.snapshot?.connectionId} onPress={() => { if (connection.snapshot?.connectionId) void connection.acknowledge(partner.stateId, connection.snapshot.connectionId); }} style={s.feed}><Text style={s.feedText}>{partner.acknowledgedAt != null ? '✓ 알겠다고 보냈어' : connection.busy ? '보내는 중…' : '알겠어'}</Text></Pressable></View>}
      {connection.error ? <Text accessibilityRole="alert" style={s.error}>{connection.error}</Text> : null}
    </>}
  </>;
}
const s = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#F0ECE6', padding: 5, borderRadius: 18, marginBottom: 16 }, tab: { flex: 1, alignItems: 'center', padding: 13, borderRadius: 14 }, active: { backgroundColor: '#FFF' }, tabText: { color: '#695B73', fontSize: 13, fontWeight: '700' },
  room: { height: 355, backgroundColor: '#F4EADD', borderRadius: 28, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#E9DECF' }, roomTop: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 3 }, roomName: { fontSize: 13, fontWeight: '700', color: '#796956' }, pill: { color: '#716179', padding: 8, borderRadius: 14, fontSize: 11 },
  window: { position: 'absolute', width: 77, height: 95, left: 33, top: 78, borderWidth: 6, borderColor: '#FFFCF3', borderTopLeftRadius: 40, borderTopRightRadius: 40, backgroundColor: '#DAE8E6', overflow: 'hidden' }, sun: { position: 'absolute', width: 26, height: 26, borderRadius: 20, backgroundColor: '#FFF1C4', top: 15, right: 7 }, windowBar: { position: 'absolute', width: 4, height: '100%', backgroundColor: '#FFFCF3', left: 31 }, windowCross: { position: 'absolute', height: 4, width: '100%', backgroundColor: '#FFFCF3', top: 48 },
  floor: { position: 'absolute', bottom: 0, height: 126, width: '100%', backgroundColor: '#E8D7C2', borderTopWidth: 5, borderColor: '#DECCB7' }, rug: { position: 'absolute', width: '76%', height: 64, borderRadius: 100, bottom: 39, left: '12%', borderWidth: 4, borderColor: '#FFFFFF40' }, character: { position: 'absolute', alignSelf: 'center', bottom: 46 }, caption: { position: 'absolute', bottom: 15, left: 10, right: 10, alignItems: 'center' }, captionText: { color: '#806D59', fontSize: 11 },
  plant: { position: 'absolute', right: 28, bottom: 100, width: 45, height: 77 }, pot: { position: 'absolute', bottom: 0, width: 39, height: 32, backgroundColor: '#C39172', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }, leaf: { width: 23, height: 46, backgroundColor: '#8CA581', borderRadius: 20, transform: [{ rotate: '-30deg' }] }, mobile: { position: 'absolute', right: 24, top: 61 }, stars: { color: '#B59853', fontSize: 27, textAlign: 'center' }, cushion: { position: 'absolute', width: 88, height: 39, borderRadius: 18, backgroundColor: '#EAAF97', bottom: 76, right: 25, transform: [{ rotate: '-9deg' }], borderWidth: 3, borderColor: '#F5C9B5' }, book: { position: 'absolute', bottom: 68, alignSelf: 'center', borderRadius: 7, paddingHorizontal: 12, backgroundColor: '#F9F3DB', borderBottomWidth: 4, borderColor: '#8F9D88' }, bookText: { color: '#A3A18E', fontSize: 22 },
  bubble: { position: 'absolute', top: 70, alignSelf: 'center', backgroundColor: '#FFFCF5', padding: 12, borderRadius: 18 }, bubbleText: { fontSize: 13, color: '#8B674E', fontWeight: '700' }, growth: { marginTop: 18, marginBottom: 17, gap: 8 }, growthTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 7 }, level: { color: '#62536D', fontWeight: '700', fontSize: 13 }, small: { color: '#948794', fontSize: 11, lineHeight: 17 }, track: { height: 6, borderRadius: 4, backgroundColor: '#EBE5EC', overflow: 'hidden' }, fill: { height: '100%', backgroundColor: '#A995BC', borderRadius: 4 },
  actions: { flexDirection: 'row', gap: 10 }, feed: { flex: 1, minHeight: 50, backgroundColor: '#88739E', borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 12 }, feedText: { color: '#FFF', fontWeight: '700', fontSize: 13 }, decorate: { minHeight: 50, padding: 15, backgroundColor: '#EEE9E2', borderRadius: 16, justifyContent: 'center' }, note: { textAlign: 'center', color: '#A2979F', fontSize: 11, lineHeight: 18, marginTop: 12 }, collection: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, item: { width: '47%', flexGrow: 1, borderWidth: 1.5, borderColor: '#E9E1EA', borderRadius: 18, padding: 13, gap: 6, backgroundColor: '#FFF' }, itemText: { fontSize: 13, color: '#685975', fontWeight: '600' }, swatch: { width: 29, height: 18, borderRadius: 9 }, message: { padding: 18, borderRadius: 20, backgroundColor: '#F1ECF5', marginTop: 15, gap: 12 }, messageText: { fontSize: 16, color: '#594665', lineHeight: 24 }, error: { color: '#A34F69', padding: 12 },
});
