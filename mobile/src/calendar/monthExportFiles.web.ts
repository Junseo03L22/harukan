import type { RefObject } from 'react';
import type { View } from 'react-native';
import { toPng } from 'html-to-image';

export async function captureMonth(ref: RefObject<View | null>, _filename: string) {
  const element = ref.current as unknown as HTMLElement | null;
  if (!element) throw new Error('달력 미리보기를 먼저 열어 주세요.');
  await document.fonts.ready;
  return toPng(element, { pixelRatio: 1600 / element.clientWidth, cacheBust: false });
}
export async function saveMonth(uri: string, filename: string) {
  const link = document.createElement('a'); link.href = uri; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
}
export async function shareMonth(uri: string, filename: string) {
  const file = new File([await (await fetch(uri)).blob()], filename, { type: 'image/png' });
  if (!navigator.canShare?.({ files: [file] })) throw new Error('이 브라우저에서는 이미지 공유를 지원하지 않아요. 이미지 저장을 이용해 주세요.');
  await navigator.share({ files: [file], title: '하루칸 · 내가 꾸민 한 달' });
}
export function disposeMonth(_uri: string) {}
