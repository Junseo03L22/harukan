import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseProfile, Profile } from './model';
const KEY = '@maeumsai/profile/v1';
let pending = Promise.resolve();
export async function loadProfile() { return parseProfile(await AsyncStorage.getItem(KEY)); }
// Serialize writes so rapid status changes cannot restore an older choice.
export function saveProfile(profile: Profile) {
  const write = pending.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(profile)));
  pending = write;
  return write;
}
