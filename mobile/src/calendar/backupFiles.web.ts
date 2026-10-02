import { BackupMedia, MAX_BACKUP_BYTES } from './backup';
import { resolveMedia, writeBlob, removeBlob } from './mediaFiles.web';
import { uid } from './model';

export async function readBackupMedia(source: string): Promise<BackupMedia> {
  if (!source.startsWith('data:') && !source.startsWith('media:')) throw new Error('사진 파일 경로가 올바르지 않아요.');
  const resolved = await resolveMedia(source);
  try {
    const blob = await (await fetch(resolved.uri)).blob();
    if (blob.size > MAX_BACKUP_BYTES / 1.4) throw new Error('백업에 포함하기에는 너무 큰 파일이에요.');
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('사진 파일을 읽지 못했어요.')); reader.readAsDataURL(blob);
    });
    return { mime: blob.type, base64: data.slice(data.indexOf(',') + 1) };
  } finally { resolved.dispose(); }
}
export async function writeBackupMedia(media: BackupMedia) {
  const data = `data:${media.mime};base64,${media.base64}`;
  if (media.mime.startsWith('image/') && media.mime !== 'image/gif') return data;
  const source = `media:restore-${uid()}`;
  await writeBlob(source, await (await fetch(data)).blob());
  return source;
}
export async function removeBackupMedia(source: string) {
  if (source.startsWith('media:restore-')) await removeBlob(source);
}
export async function exportBackupFile(raw: string) {
  const uri = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = uri; link.download = `harukan-backup-${uid()}.json`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(uri), 60000);
}
export async function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.style.display = 'none'; document.body.appendChild(input);
    input.oncancel = () => { input.remove(); resolve(null); };
    input.onchange = async () => {
      try { const file = input.files?.[0]; if (!file) return resolve(null);
        if (file.size > MAX_BACKUP_BYTES) throw new Error('100MB 이하 백업 파일을 선택해 주세요.');
        resolve(await file.text());
      } catch (error) { reject(error); } finally { input.remove(); }
    };
    input.click();
  });
}
