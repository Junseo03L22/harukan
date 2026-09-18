export const avatars = [
  { id: 'salgu', name: '살구', subtitle: '말랑한 살구빛 친구', color: '#FDEADB', ink: '#9F5436', action: '살랑살랑, 몸을 흔드는 중' },
  { id: 'pico', name: '삐코', subtitle: '호기심 많은 작은 로봇', color: '#DEF2EE', ink: '#28766E', action: '두리번두리번, 주변을 살피는 중' },
  { id: 'moru', name: '모루', subtitle: '느긋한 조약돌 친구', color: '#EAE7FC', ink: '#6A5B9D', action: '데굴데굴, 혼자 노는 중' },
] as const;
export type AvatarId = typeof avatars[number]['id'];
export const moods = [
  { id: 'normal', label: '평온해', symbol: '○', color: '#EAE7FC', description: '지금은 편안하게 지내고 있어' },
  { id: 'happy', label: '신나', symbol: '✦', color: '#FFF0C9', description: '좋은 기분을 함께 나누고 싶어' },
  { id: 'tired', label: '지쳤어', symbol: '☾', color: '#E8EDF6', description: '오늘은 에너지가 조금 부족해' },
  { id: 'focus', label: '집중 중', symbol: '◎', color: '#E0F0EA', description: '지금은 하던 일에 집중하고 있어' },
  { id: 'complex', label: '복잡해', symbol: '≈', color: '#F7E5EB', description: '생각이 많아서 잠깐 정리하고 있어' },
  { id: 'rest', label: '쉬는 중', symbol: '⌁', color: '#F2EADC', description: '잠시 멈추고 충전하는 시간이야' },
] as const;
export type MoodId = typeof moods[number]['id'];
export const responses = ['같이 좋아해 줘', '가볍게 얘기하고 싶어', '내 얘기만 들어줘', '끝나면 내가 연락할게', '잠깐 혼자 있고 싶어', '같이 시간을 보내고 싶어'] as const;
export const decorations = [
  { id: 'basic', label: '포근한 러그', days: 0, color: '#C9BEDC' },
  { id: 'plant', label: '초록 화분', days: 1, color: '#C6D8BB' },
  { id: 'stars', label: '별빛 모빌', days: 3, color: '#D5C8E9' },
  { id: 'cushion', label: '살구 쿠션', days: 5, color: '#EEC8B0' },
] as const;
export type Pet = { careDays: number; lastCareDay: string; decoration: typeof decorations[number]['id'] };
export const initialPet: Pet = { careDays: 0, lastCareDay: '', decoration: 'basic' };
export function validPet(p: any): p is Pet {
  return !!p && Number.isSafeInteger(p.careDays) && p.careDays >= 0 && p.careDays <= 100000
    && typeof p.lastCareDay === 'string' && (p.lastCareDay === '' || /^\d{4}-\d{2}-\d{2}$/.test(p.lastCareDay))
    && decorations.some(d => d.id === p.decoration && p.careDays >= d.days);
}
export function dayKey(now: number) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function feedPet(p: Pet, now: number): Pet {
  const day = dayKey(now);
  return p.lastCareDay >= day ? p : { ...p, careDays: Math.min(100000, p.careDays + 1), lastCareDay: day };
}
export type Profile = { avatar: AvatarId; mood: MoodId; updatedAt: number; response?: string; pet?: Pet };
export function parseProfile(value: string | null): Profile | null {
  if (!value) return null;
  try {
    const p = JSON.parse(value);
    return p && avatars.some(a => a.id === p.avatar) && moods.some(m => m.id === p.mood)
      && Number.isFinite(p.updatedAt) && (p.response === undefined || (typeof p.response === 'string' && p.response.length <= 80))
      ? { avatar: p.avatar, mood: p.mood, updatedAt: p.updatedAt, ...(p.response === undefined ? {} : { response: p.response.trim() }), ...(validPet(p.pet) ? { pet: p.pet } : {}) } : null;
  } catch { return null; }
}
export const IDLE_DELAY = 4000;
