import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Album } from './model';
import { Backup, backupSummary, createBackup, MAX_BACKUP_BYTES, parseBackup, restoreBackup, utf8Size } from './backup';
import { exportBackupFile, pickBackupFile, readBackupMedia, removeBackupMedia, writeBackupMedia } from './backupFiles';
import { saveAlbum } from './storage';

export function BackupPanel({ album, onClose, onRestored }: { album: Album; onClose: () => void; onRestored: (album: Album) => void }) {
  const [busy, setBusy] = useState(false), lock = useRef(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const [candidate, setCandidate] = useState<Backup | null>(null);
  const summary = candidate ? backupSummary(candidate) : null;
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '작업을 마치지 못했어요. 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const button = (label: string, action: () => void, primary = false) => <Pressable accessibilityRole="button" disabled={busy} onPress={action} style={[s.button, primary && s.primary, busy && { opacity: .45 }]}><Text style={[s.buttonText, primary && { color: 'white' }]}>{label}</Text></Pressable>;
  return <Modal visible animationType="slide" onRequestClose={() => { if (!lock.current) onClose(); }}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <View style={s.header}><Text style={s.title}>기록 백업</Text>{button('닫기', onClose)}</View>
    <Text style={s.copy}>사진으로 채운 하루를 파일 하나에 보관해요. 사진, GIF, 영상, 꾸미기, 일정과 내 스티커가 함께 담겨요.</Text>
    <View style={s.card}><Text style={s.subtitle}>백업 파일 만들기</Text><Text style={s.copy}>파일 앱이나 원하는 보관 장소에 저장해 주세요. 앱을 삭제해도 꺼내 쓸 수 있도록 앱 밖에 보관해요.</Text>
      {button('백업 파일 내보내기', () => void run(async () => {
        await saveAlbum(album);
        const backup = await createBackup(album, readBackupMedia);
        const raw = JSON.stringify(backup);
        if (utf8Size(raw) > MAX_BACKUP_BYTES) throw new Error('이번 버전은 100MB 이하 백업을 지원해요.');
        await exportBackupFile(raw);
        setMessage(Platform.OS === 'web' ? '백업 파일 다운로드를 요청했어요. 다운로드 폴더를 확인해 주세요.' : '선택한 보관 장소에 백업 파일이 저장됐는지 확인해 주세요.');
      }), true)}
    </View>
    <View style={s.card}><Text style={s.subtitle}>백업에서 복원하기</Text><Text style={s.copy}>백업을 복원하면 현재 기록 전체가 백업 속 기록으로 바뀌어요. 현재 기록도 먼저 백업해 두세요.</Text>
      {button('백업 파일 선택', () => void run(async () => { setCandidate(null); const raw = await pickBackupFile(); if (raw !== null) setCandidate(parseBackup(raw)); }))}
      {candidate && summary && <View style={s.confirm}><Text style={s.subtitle}>이 기록으로 바꿀까요?</Text><Text style={s.copy}>{new Date(candidate.createdAt).toLocaleString('ko-KR')}{'\n'}날짜 {summary.days}개 · 미디어 {summary.media}개 · 내 스티커 {summary.stickers}개</Text>
        {button('현재 기록을 교체하고 복원', () => void run(async () => {
          const restored = await restoreBackup(candidate, { write: writeBackupMedia, remove: removeBackupMedia, save: saveAlbum });
          onRestored(restored); setCandidate(null); setMessage('백업 속 기록을 복원했어요.');
        }), true)}{button('취소', () => setCandidate(null))}
      </View>}
    </View>
    {busy && <View style={s.progress}><ActivityIndicator color="#876675"/><Text style={s.copy}>기록을 처리하고 있어요. 잠시 기다려 주세요.</Text></View>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={s.copy}>{message}</Text>}
    <Text style={s.note}>백업 파일은 최대 100MB까지 지원해요. 자동 동기화되지 않으므로 기록을 추가한 뒤 새 백업을 만들어 주세요.</Text>
  </ScrollView></SafeAreaView></Modal>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCFAF6' }, content: { padding: 20, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 24, fontWeight: '700', color: '#503B46' },
  subtitle: { fontSize: 17, fontWeight: '700', color: '#503B46' }, copy: { fontSize: 14, lineHeight: 23, color: '#71545F' },
  card: { backgroundColor: '#FFFDF8', padding: 20, gap: 14, borderRadius: 18, borderWidth: 1, borderColor: '#EBE3DE' },
  button: { backgroundColor: '#EEE7E5', padding: 15, borderRadius: 12, alignItems: 'center', minHeight: 48 }, primary: { backgroundColor: '#876675' }, buttonText: { color: '#71545F', fontWeight: '600' },
  confirm: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderColor: '#EBE3DE' }, note: { color: '#95828C', fontSize: 12, lineHeight: 19 }, error: { color: '#A55063', lineHeight: 22 }, progress: { gap: 10, alignItems: 'center' },
});
