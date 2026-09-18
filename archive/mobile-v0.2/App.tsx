import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Avatar } from './src/Avatar';
import { avatars, AvatarId, moods, MoodId, Profile } from './src/model';
import { loadProfile, saveProfile } from './src/storage';
import { useConnection } from './src/useConnection';
import { ConnectionPanel, DuoStage } from './src/ConnectionPanel';

const ink = '#302C43';
function AppContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState<AvatarId>('salgu');
  const [restart, setRestart] = useState(0);
  const [phase, setPhase] = useState<'still' | 'fidget' | 'reduced'>('still');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [loadError, setLoadError] = useState(false);
  const version = useRef(0);
  const lastEdit = useRef(0);
  const connection = useConnection(profile);
  useEffect(() => {
    let alive = true;
    loadProfile().then(p => { if (alive) { setProfile(p); if (p) { setDraft(p.avatar); lastEdit.current = p.updatedAt; } } })
      .catch(() => { if (alive) setLoadError(true); }).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  async function commit(avatar: AvatarId, mood: MoodId) {
    lastEdit.current = Math.max(Date.now(), lastEdit.current + 1);
    const p = { avatar, mood, updatedAt: lastEdit.current };
    const thisVersion = ++version.current;
    setProfile(p); setRestart(n => n + 1); setSaveState('saving'); setLoadError(false);
    try { await saveProfile(p); if (version.current === thisVersion) setSaveState('saved'); }
    catch { if (version.current === thisVersion) setSaveState('error'); }
  }
  const character = avatars.find(a => a.id === (profile?.avatar ?? draft))!;
  const status = moods.find(m => m.id === (profile?.mood ?? 'normal'))!;
  const selected = avatars.find(a => a.id === draft)!;
  function openPicker() { setDraft(profile?.avatar ?? 'salgu'); setPicker(true); }
  const choiceContent = (initial: boolean) => <>
    <View style={s.pickerHeading}>
      <Text style={s.eyebrow}>{initial ? '반가워, 마음사이' : 'MY AVATAR'}</Text>
      <Text style={s.title}>{initial ? '나를 보여줄\n친구를 골라봐' : '오늘의 나는 누구?'}</Text>
      <Text style={s.subtitle}>내 상태를 대신 보여줄 세 친구가 있어.</Text>
    </View>
    <View style={[s.choiceHero, { backgroundColor: selected.color }]}>
      <View style={s.heroCircle} />
      <Avatar key={`picker-${draft}`} id={draft} size={230} motion={true} />
      <Text style={s.choiceName}>{selected.name}</Text>
      <Text style={[s.choiceSubtitle, { color: selected.ink }]}>{selected.subtitle}</Text>
    </View>
    <View style={s.choices}>
      {avatars.map(a => <Pressable key={a.id} onPress={() => setDraft(a.id)} accessibilityRole="radio" accessibilityState={{ checked: draft === a.id }} accessibilityLabel={`${a.name}, ${a.subtitle}`} style={({ pressed }) => [s.choice, draft === a.id && { borderColor: '#7764AD', backgroundColor: '#F7F5FF' }, pressed && s.pressed]}>
        <View style={[s.check, draft === a.id && s.checkActive]}><Text style={s.checkText}>{draft === a.id ? '✓' : ''}</Text></View>
        <Avatar id={a.id} size={88} />
        <Text style={s.choiceLabel}>{a.name}</Text>
      </Pressable>)}
    </View>
    <View style={s.introNote}><Text style={s.noteSymbol}>↔</Text><Text style={s.noteText}>기분은 달라도 괜찮아.{"\n"}어떤 상태인지, 한눈에 알 수 있게.</Text></View>
    <Pressable accessibilityRole="button" onPress={() => { void commit(draft, profile?.mood ?? 'normal'); setPicker(false); }} style={({ pressed }) => [s.primary, pressed && s.pressed]}><Text style={s.primaryText}>{initial ? `${selected.name}와 시작하기` : `${selected.name}로 바꾸기`}  →</Text></Pressable>
    <Text style={s.smallCenter}>캐릭터는 언제든 바꿀 수 있어.</Text>
  </>;
  if (!ready) return <SafeAreaView style={s.loading}><ActivityIndicator color="#7764AD" /><Text style={s.smallCenter}>내 친구를 데려오는 중…</Text></SafeAreaView>;
  return <SafeAreaView style={s.safe}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.brand}><View style={s.brandMark}><Text style={s.brandIcon}>↔</Text></View><Text style={s.brandName}>마음사이</Text></View>
        {profile && <Pressable accessibilityRole="button" onPress={openPicker} style={({ pressed }) => [s.editButton, pressed && s.pressed]}><Text style={s.editText}>아바타 변경</Text></Pressable>}
      </View>
      {loadError && <Text accessibilityRole="alert" style={s.error}>저장된 설정을 읽지 못했어. 캐릭터를 다시 선택해 줘.</Text>}
      {!profile ? choiceContent(true) : <>
        <View style={s.mainHeading}><Text style={s.eyebrow}>{connection.snapshot?.partner ? 'OUR LITTLE SIGNALS' : 'MY LITTLE SIGNAL'}</Text><Text style={s.title}>{connection.snapshot?.partner ? '지금, 우리' : '지금, 나는'}</Text><Text style={s.subtitle}>{connection.snapshot?.partner ? '말하기 전에, 서로의 지금을 알아봐.' : '한 번의 선택으로 보여주는 내 상태.'}</Text></View>
        <ConnectionPanel connection={connection} />
        {connection.snapshot?.partner ? <DuoStage profile={profile} connection={connection} restart={restart} onPressSelf={() => setRestart(n => n + 1)} /> : <View style={[s.stage, { backgroundColor: status.color }]}>
          <View style={s.stageTop}><View style={s.statusPill}><View style={s.dot} /><Text style={s.statusPillText}>{status.label}</Text></View><Text style={s.stageName}>{character.name}</Text></View>
          <View style={s.stageCircle} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${character.name} 움직임 다시 보기`} onPress={() => setRestart(n => n + 1)} style={s.avatarTouch}>
            <Avatar id={profile.avatar} mood={profile.mood} size={280} motion restart={restart} onPhase={setPhase} />
          </Pressable>
          <View style={s.stageCaption}><Text style={s.stageTitle}>{status.description}</Text><Text style={s.stageHint}>{phase === 'reduced' ? '동작 줄이기 설정이 적용되어 있어' : profile.mood === 'normal' ? phase === 'fidget' ? character.action : '잠깐 기다리면 혼자서도 잘 놀아' : profile.mood === 'focus' ? '집중하는 동안에는 조용히 기다릴게' : '캐릭터를 누르면 움직임을 다시 볼 수 있어'}</Text></View>
        </View>}
        <View style={s.sectionHeading}><Text style={s.sectionTitle}>어떤 상태야?</Text><Text style={s.sectionHint}>지금 가장 가까운 하나</Text></View>
        <View style={s.moodGrid}>{moods.map(m => <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: profile.mood === m.id }} onPress={() => void commit(profile.avatar, m.id)} style={({ pressed }) => [s.moodButton, profile.mood === m.id && s.moodSelected, pressed && s.pressed]}>
          <View style={[s.moodSymbol, { backgroundColor: m.color }]}><Text style={s.symbolText}>{m.symbol}</Text></View>
          <Text style={[s.moodLabel, profile.mood === m.id && s.selectedLabel]}>{m.label}</Text>
          {profile.mood === m.id && <Text style={s.moodCheck}>✓</Text>}
        </Pressable>)}</View>
        <View accessibilityLiveRegion="polite" style={s.savedRow}><Text style={[s.savedText, saveState === 'error' && { color: '#A33C45' }]}>{saveState === 'saving' ? '저장하는 중…' : saveState === 'error' ? '저장하지 못했어. 다시 시도해 줘.' : `✓  내 기기에 저장했어 · ${new Date(profile.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`}</Text>{saveState === 'error' && <Pressable accessibilityRole="button" onPress={() => void commit(profile.avatar, profile.mood)} style={s.retry}><Text style={s.editText}>다시 저장</Text></Pressable>}</View>
        <View style={s.footerNote}><Text style={s.footerIcon}>↔</Text><View style={{ flex: 1 }}><Text style={s.footerTitle}>말하기 전에, 알아볼 수 있게.</Text><Text style={s.footerText}>{connection.snapshot?.partner ? connection.synced && connection.state === 'live' ? '내 상태가 전달됐어. 상대가 읽었다는 뜻은 아니야.' : '전달 대기 중이야. 연결되면 최신 상태를 보내줄게.' : '상대와 연결하면 서로의 상태를 함께 볼 수 있어.'}</Text></View></View>
      </>}
    </ScrollView>
    <Modal visible={picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(false)}>
      <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><View style={s.modalHeader}><Text style={s.brandName}>내 아바타</Text><Pressable accessibilityRole="button" accessibilityLabel="변경 취소하고 닫기" onPress={() => setPicker(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>{choiceContent(false)}</ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCFBF8' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFBF8', gap: 12 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 30 },
  header: { paddingTop: 16, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMark: { backgroundColor: '#E9E4F8', width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, brandIcon: { color: '#7764AD', fontSize: 23, fontWeight: '700', lineHeight: 26 }, brandName: { fontSize: 19, fontWeight: '800', color: ink, letterSpacing: -0.7 },
  editButton: { minHeight: 44, paddingHorizontal: 13, justifyContent: 'center', backgroundColor: '#F0EDE7', borderRadius: 20 }, editText: { fontSize: 12, fontWeight: '600', color: '#676170' },
  mainHeading: { marginBottom: 22 }, eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: '700', color: '#8B7BA6', marginBottom: 10 }, title: { fontSize: 32, lineHeight: 42, letterSpacing: -1.3, fontWeight: '800', color: ink }, subtitle: { fontSize: 14, color: '#8B8591', marginTop: 8, lineHeight: 21 },
  stage: { borderRadius: 30, minHeight: 365, overflow: 'hidden', alignItems: 'center' }, stageTop: { width: '100%', paddingHorizontal: 22, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFFD9', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7A699F' }, statusPillText: { fontSize: 12, fontWeight: '700', color: ink }, stageName: { fontSize: 13, color: '#716783', fontWeight: '600' }, stageCircle: { width: 235, height: 235, borderRadius: 118, position: 'absolute', top: 69, backgroundColor: '#FFFFFF5C' }, avatarTouch: { marginTop: -12, marginBottom: -18 }, stageCaption: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 25 }, stageTitle: { fontSize: 16, fontWeight: '700', color: ink, textAlign: 'center', lineHeight: 23 }, stageHint: { fontSize: 11, color: '#82758E', marginTop: 8, textAlign: 'center', lineHeight: 17 },
  sectionHeading: { marginTop: 27, marginBottom: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { fontSize: 18, fontWeight: '800', color: ink, letterSpacing: -0.5 }, sectionHint: { fontSize: 11, color: '#9A929C' }, moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, moodButton: { width: '31%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#EAE6E3', backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 14, gap: 8, minHeight: 94 }, moodSelected: { backgroundColor: '#F6F3FC', borderColor: '#8B78B7' }, moodSymbol: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, symbolText: { fontSize: 22, color: '#6C6279', lineHeight: 28 }, moodLabel: { color: '#7B7381', fontSize: 13, fontWeight: '600' }, selectedLabel: { color: '#665086', fontWeight: '800' }, moodCheck: { position: 'absolute', top: 6, right: 9, fontSize: 12, color: '#8066AD' },
  savedRow: { minHeight: 43, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }, savedText: { fontSize: 10, color: '#A39BA5' }, retry: { padding: 12 }, footerNote: { backgroundColor: '#F2F0EC', borderRadius: 20, padding: 18, flexDirection: 'row', gap: 14, alignItems: 'center' }, footerIcon: { fontSize: 29, color: '#A797BB' }, footerTitle: { fontSize: 12, color: '#68616F', fontWeight: '700', marginBottom: 5 }, footerText: { fontSize: 10, color: '#A29AA4', lineHeight: 17 },
  pickerHeading: { marginTop: 14, marginBottom: 22 }, choiceHero: { alignItems: 'center', borderRadius: 28, paddingTop: 4, paddingBottom: 23, overflow: 'hidden' }, heroCircle: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: 28, backgroundColor: '#FFFFFF70' }, choiceName: { fontSize: 24, fontWeight: '800', color: ink, marginTop: -10 }, choiceSubtitle: { fontSize: 12, marginTop: 5 }, choices: { flexDirection: 'row', gap: 10, marginTop: 16 }, choice: { flex: 1, borderWidth: 1.5, borderColor: '#EAE6E3', borderRadius: 18, alignItems: 'center', paddingTop: 12, paddingBottom: 16, backgroundColor: '#FFF' }, choiceLabel: { color: ink, fontSize: 13, fontWeight: '700' }, check: { position: 'absolute', top: 8, right: 8, width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: '#E4DEEB', justifyContent: 'center', alignItems: 'center' }, checkActive: { backgroundColor: '#8872B5', borderColor: '#8872B5' }, checkText: { fontSize: 11, color: '#FFF' }, introNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 }, noteSymbol: { fontSize: 28, color: '#A99BBB' }, noteText: { fontSize: 12, lineHeight: 20, color: '#928998' }, primary: { minHeight: 56, borderRadius: 19, backgroundColor: '#77629F', alignItems: 'center', justifyContent: 'center', padding: 14 }, primaryText: { color: '#FFF', fontSize: 15, fontWeight: '700' }, smallCenter: { fontSize: 11, color: '#A69DAC', textAlign: 'center', marginTop: 13 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, close: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0EDE7', alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 28, color: '#736A7C' }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, error: { padding: 12, color: '#A33C45', backgroundColor: '#FBE8EB', borderRadius: 10, fontSize: 12 },
});
