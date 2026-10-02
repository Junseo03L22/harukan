import type { RefObject } from 'react';
import { Platform, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

export async function captureMonth(ref: RefObject<View | null>, _filename: string) {
  if (!ref.current) throw new Error('달력 미리보기를 먼저 열어 주세요.');
  const size = await new Promise<{ width: number; height: number }>(resolve => ref.current!.measure((_x, _y, width, height) => resolve({ width, height })));
  if (!size.width || !size.height) throw new Error('달력 크기를 확인하지 못했어요. 다시 시도해 주세요.');
  return captureRef(ref, { format: 'png', result: 'tmpfile', quality: 1, width: 1600, height: Math.round(1600 * size.height / size.width) });
}
export async function saveMonth(uri: string, _filename: string) {
  // The SDK 57 legacy implementation checks WRITE_EXTERNAL_STORAGE through API 32.
  if (Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) < 33)) {
    const permission = await MediaLibrary.requestPermissionsAsync(true, []);
    if (!permission.granted) throw new Error('사진 저장 권한이 필요해요. 설정에서 허용하거나 공유하기를 이용해 주세요.');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
}
export async function shareMonth(uri: string, _filename: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('이 기기에서는 공유를 사용할 수 없어요. 이미지 저장을 이용해 주세요.');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: '내가 꾸민 한 달 공유' });
}
export function disposeMonth(uri: string) { releaseCapture(uri); }
