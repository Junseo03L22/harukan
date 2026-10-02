import { Album, Piece, parseAlbum } from './model';

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
export type BackupMedia = { mime: string; base64: string; checksum?: string };
export type Backup = { format: 'harukan-backup'; version: 1; createdAt: string; album: Album; media: Record<string, BackupMedia> };
const mimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];

// Accidental corruption check, not a signature or encryption mechanism.
export function mediaChecksum(value: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export function utf8Size(value: string) {
  let size = 0;
  for (const char of value) { const code = char.codePointAt(0)!; size += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4; }
  return size;
}

// Include reused stickers, all four collage frames and historical monthly margins.
export function mapAlbumMedia(album: Album, map: (source: string) => string): Album {
  const piece = (p: Piece): Piece => ({ ...p,
    ...(['photo', 'gif', 'video'].includes(p.kind) ? { source: map(p.source) } : {}),
    ...(p.frames ? { frames: p.frames.map(f => ({ ...f, source: map(f.source) })) } : {}),
    ...(p.poster ? { poster: map(p.poster) } : {}),
  });
  return { ...album,
    days: Object.fromEntries(Object.entries(album.days).map(([key, items]) => [key, items.map(piece)])),
    shelf: album.shelf.map(piece),
    ...(album.months ? { months: Object.fromEntries(Object.entries(album.months).map(([key, page]) => [key, { ...page, pieces: page.pieces.map(piece) }])) } : {}),
  };
}

export function mediaSources(album: Album) {
  const sources = new Set<string>();
  mapAlbumMedia(album, source => { sources.add(source); return source; });
  return [...sources];
}

export function validateMedia(media: BackupMedia) {
  if (!media || !mimes.includes(media.mime) || typeof media.base64 !== 'string' || !media.base64.length ||
    media.base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(media.base64)) {
    throw new Error('백업의 사진 또는 영상 데이터가 올바르지 않아요.');
  }
}

export async function createBackup(album: Album, read: (source: string) => Promise<BackupMedia>): Promise<Backup> {
  const snapshot = parseAlbum(JSON.stringify(album));
  const media: Backup['media'] = {};
  const keys = new Map<string, string>();
  let length = JSON.stringify(snapshot).length;
  for (const source of mediaSources(snapshot)) {
    const value = await read(source);
    validateMedia(value);
    length += value.base64.length;
    if (length > MAX_BACKUP_BYTES) throw new Error('이번 버전은 100MB 이하 백업을 지원해요.');
    const key = `asset:${keys.size}`;
    keys.set(source, key); media[key] = { ...value, checksum: mediaChecksum(value.base64) };
  }
  return { format: 'harukan-backup', version: 1, createdAt: new Date().toISOString(),
    album: mapAlbumMedia(snapshot, source => keys.get(source)!), media };
}

export function parseBackup(raw: string): Backup {
  if (raw.length > MAX_BACKUP_BYTES || utf8Size(raw) > MAX_BACKUP_BYTES) throw new Error('100MB 이하 백업 파일을 선택해 주세요.');
  let value: Backup;
  try { value = JSON.parse(raw); } catch { throw new Error('백업 파일을 읽지 못했어요. 하루칸 백업 파일을 선택해 주세요.'); }
  if (!value || value.format !== 'harukan-backup' || value.version !== 1 || typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) || !value.media || typeof value.media !== 'object' || Array.isArray(value.media)) {
    throw new Error('지원하지 않는 하루칸 백업 형식이에요.');
  }
  const album = parseAlbum(JSON.stringify(value.album));
  for (const [key, media] of Object.entries(value.media)) {
    if (!/^asset:\d+$/.test(key)) throw new Error('백업 파일 목록이 올바르지 않아요.');
    validateMedia(media);
    if (media.checksum !== mediaChecksum(media.base64)) throw new Error('백업 파일의 사진 또는 영상이 손상되었어요.');
  }
  const sources = mediaSources(album);
  if (sources.length !== Object.keys(value.media).length || sources.some(source => !Object.hasOwn(value.media, source))) {
    throw new Error('백업에 필요한 사진 또는 영상이 빠져 있어요.');
  }
  return { ...value, album };
}

export type RestorePort = {
  write: (media: BackupMedia) => Promise<string>;
  remove: (source: string) => Promise<void>;
  save: (album: Album) => Promise<void>;
};
export async function restoreBackup(backup: Backup, port: RestorePort): Promise<Album> {
  // Validate everything before writing anything; never trust file names from the backup.
  const checked = parseBackup(JSON.stringify(backup));
  const mapping = new Map<string, string>();
  try {
    for (const [key, media] of Object.entries(checked.media)) mapping.set(key, await port.write(media));
    const restored = mapAlbumMedia(checked.album, source => mapping.get(source)!);
    await port.save(restored);
    return restored;
  } catch (error) {
    await Promise.allSettled([...mapping.values()].map(source => port.remove(source)));
    throw error;
  }
}

export function backupSummary(backup: Backup) {
  const dates = new Set([...Object.keys(backup.album.days), ...Object.keys(backup.album.events ?? {})]);
  return { days: dates.size, media: Object.keys(backup.media).length, stickers: backup.album.shelf.length };
}
