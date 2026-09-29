import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FS from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Album, parseAlbum, uid } from './model';
const KEY = '@maeumsai/calendar/v1';
let pending = Promise.resolve();
export async function loadAlbum() { return parseAlbum(await AsyncStorage.getItem(KEY)); }
export function saveAlbum(album: Album) {
  const text = JSON.stringify(album);
  const next = pending.catch(() => {}).then(() => AsyncStorage.setItem(KEY, text)); pending = next; return next;
}
export function photoUri(source: string) { return source.startsWith('data:') ? source : `${FS.documentDirectory}calendar-photos/${source}`; }
export async function importPhoto(uri: string, width: number, height: number) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width,height) > 1600) context.resize(width >= height ? {width:1600} : {height:1600});
  const image = await context.renderAsync();
  const output = await image.saveAsync({format: SaveFormat.JPEG, compress:.85, base64: Platform.OS === 'web'});
  if (Platform.OS === 'web') {
    if (!output.base64) throw new Error('사진을 저장하지 못했어.');
    return { source: `data:image/jpeg;base64,${output.base64}`, width:output.width,height:output.height };
  }
  if (!FS.documentDirectory) throw new Error('기기 저장 공간을 열지 못했어.');
  const dir = `${FS.documentDirectory}calendar-photos/`;
  await FS.makeDirectoryAsync(dir,{intermediates:true});
  const name = `${uid()}.jpg`;
  await FS.copyAsync({from:output.uri,to:dir+name});
  return {source:name,width:output.width,height:output.height};
}
