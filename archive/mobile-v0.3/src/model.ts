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
export type Profile = { avatar: AvatarId; mood: MoodId; updatedAt: number; response?: string };
export function parseProfile(value: string | null): Profile | null {
  if (!value) return null;
  try {
    const p = JSON.parse(value);
    return p && avatars.some(a => a.id === p.avatar) && moods.some(m => m.id === p.mood)
      && Number.isFinite(p.updatedAt) && (p.response === undefined || (typeof p.response === 'string' && p.response.length <= 80))
      ? { avatar: p.avatar, mood: p.mood, updatedAt: p.updatedAt, ...(p.response === undefined ? {} : { response: p.response.trim() }) } : null;
  } catch { return null; }
}
export const IDLE_DELAY = 4000;
