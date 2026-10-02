import * as FS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { BackupMedia, MAX_BACKUP_BYTES } from './backup';
import { photoUri } from './storage';
import { uid } from './model';

const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
export async function readBackupMedia(source: string): Promise<BackupMedia> {
  if (source.startsWith('data:')) {
    const match = /^data:([^;,]+);base64,(.*)$/.exec(source);
    if (!match) throw new Error('사진 데이터를 읽지 못했어요.');
    return { mime: match[1], base64: match[2] };
  }
  if (!/^[\w-]+\.(jpg|jpeg|png|gif|webp|mp4|mov)$/i.test(source)) throw new Error('사진 파일 경로가 올바르지 않아요.');
  const uri = photoUri(source), info = await FS.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error('저장된 사진 또는 영상 파일을 찾지 못했어요.');
  if (info.size > MAX_BACKUP_BYTES / 1.4) throw new Error('백업에 포함하기에는 너무 큰 파일이에요.');
  const ext = source.split('.').pop()!.toLowerCase();
  return { mime: Object.keys(extensions).find(key => extensions[key] === ext) ?? 'image/jpeg',
    base64: await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 }) };
}
export async function writeBackupMedia(media: BackupMedia) {
  if (!FS.documentDirectory) throw new Error('기기 저장 공간을 열지 못했어요.');
  const directory = `${FS.documentDirectory}calendar-photos/`;
  await FS.makeDirectoryAsync(directory, { intermediates: true });
  const source = `restore-${uid()}.${extensions[media.mime]}`;
  try { await FS.writeAsStringAsync(directory + source, media.base64, { encoding: FS.EncodingType.Base64 }); }
  catch (error) { await FS.deleteAsync(directory + source, { idempotent: true }).catch(() => {}); throw error; }
  return source;
}
export async function removeBackupMedia(source: string) {
  if (!/^restore-[\w-]+\.(jpg|png|gif|webp|mp4|mov)$/.test(source)) return;
  await FS.deleteAsync(photoUri(source), { idempotent: true });
}
export async function exportBackupFile(raw: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('이 기기에서는 파일 공유를 사용할 수 없어요.');
  if (!FS.cacheDirectory) throw new Error('임시 저장 공간을 열지 못했어요.');
  const uri = `${FS.cacheDirectory}harukan-backup-${uid()}.json`;
  try {
    await FS.writeAsStringAsync(uri, raw);
    await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: '하루칸 백업 파일 보관' });
  } finally { await FS.deleteAsync(uri, { idempotent: true }).catch(() => {}); }
}
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'application/octet-stream'], copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  try {
    const info = await FS.getInfoAsync(asset.uri);
    if (!info.exists || info.isDirectory || info.size > MAX_BACKUP_BYTES) throw new Error('100MB 이하 백업 파일을 선택해 주세요.');
    return await FS.readAsStringAsync(asset.uri);
  } finally {
    if (FS.cacheDirectory && asset.uri.startsWith(FS.cacheDirectory)) await FS.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
  }
}
