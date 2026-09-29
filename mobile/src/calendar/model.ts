export type Point = { x: number; y: number };
export type Stroke = { points: Point[]; width: number; restore: boolean };
export type Cutout = { outline: Point[]; strokes: Stroke[] };
export const stickers = [
  { id: 'heart', label: '하트', color: '#D68792' }, { id: 'star', label: '반짝', color: '#D6AE59' },
  { id: 'flower', label: '꽃', color: '#B39BC8' }, { id: 'leaf', label: '새싹', color: '#83A78B' },
  { id: 'sun', label: '햇살', color: '#E3B15E' }, { id: 'cloud', label: '구름', color: '#98B6C6' },
] as const;
export type StickerId = typeof stickers[number]['id'];
export type PhotoTone = 'original'|'warm'|'vivid'|'soft'|'mono';
export type FramePhoto = {source:string;width:number;height:number};
export type Piece = { id: string; kind: 'photo' | 'sticker' | 'gif' | 'video' | 'collage' | 'text' | 'tape' | 'stamp' | 'doodle'; source: string; width: number; height: number; x: number; y: number; size: number; rotation: number; cutout?: Cutout; duration?: number; poster?: string; tone?:PhotoTone; intensity?:number; frames?:FramePhoto[]; layout?:'strip'|'grid'; frameColor?:string; text?:string; color?:string; font?:'round'|'serif'|'hand'; pattern?:'plain'|'dots'|'stripes'; drawing?:{points:Point[];color:string;width:number}[]; frame?:'none'|'polaroid'|'torn'|'film'; caption?:string };
export type Schedule = {id:string;title:string;time:string|null;note:string;style?:'plain'|'label'|'highlight';done?:boolean};
export type PaperKind = 'plain'|'grid'|'lined'|'kraft';
export type DiaryPage = {pieces:Piece[];paper:PaperKind;color?:string};
export type Album = { paperColors?:Record<string,string>; papers?:Record<string,PaperKind>; months?:Record<string,DiaryPage>; events?:Record<string,Schedule[]>; version: 1; days: Record<string, Piece[]>; shelf: Piece[]; theme: 'paper' | 'pink' | 'sage' };
export const emptyAlbum = (): Album => ({ version: 1, days: {}, shelf: [], theme: 'paper' });
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function monthCells(year: number, month: number) {
  const offset = new Date(year, month, 1).getDay(); const count = new Date(year, month+1, 0).getDate();
  return Array.from({ length: Math.ceil((offset+count)/7)*7 }, (_, i) => i < offset || i >= offset+count ? null : dateKey(new Date(year, month, i-offset+1)));
}
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function pathOf(points: Point[], close = false) { return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + (close && points.length >= 3 ? ' Z' : ''); }
export function fitBox(width: number, height: number, available: number) {
  const scale = available / Math.max(width, height);
  return { width: width * scale, height: height * scale };
}
function validPiece(p: any): boolean {
  return p && typeof p.id === 'string' && ['photo','sticker','gif','video','collage','text','tape','stamp','doodle'].includes(p.kind) && typeof p.source === 'string'
    && validDecoration(p)
    && (p.tone===undefined||['original','warm','vivid','soft','mono'].includes(p.tone))
    && (p.intensity===undefined||(Number.isFinite(p.intensity)&&p.intensity>=0&&p.intensity<=1))
    && (p.kind!=='collage'||(Array.isArray(p.frames)&&p.frames.length===4&&p.frames.every((f:any)=>typeof f.source==='string'&&Number.isFinite(f.width)&&f.width>0&&Number.isFinite(f.height)&&f.height>0)&&['strip','grid'].includes(p.layout)&&['#FFFDF8','#29242A','#F4DDE5'].includes(p.frameColor)))
    && (p.kind !== 'video' || (Number.isFinite(p.duration) && p.duration>0 && p.duration<=5.05 && typeof p.poster==='string'))
    && (p.kind !== 'sticker' || stickers.some(s => s.id === p.source))
    && ['width','height','x','y','size','rotation'].every(k => Number.isFinite(p[k])) && p.width > 0 && p.height > 0
    && p.size >= .2 && p.size <= 1 && p.x >= .05 && p.x <= .95 && p.y >= .05 && p.y <= .95
    && (!p.cutout || (Array.isArray(p.cutout.outline) && p.cutout.outline.every(validPoint) && Array.isArray(p.cutout.strokes)
      && p.cutout.strokes.every((s: any) => typeof s.restore === 'boolean' && s.width > 0 && s.width <= 200 && Array.isArray(s.points) && s.points.every(validPoint))));
}
function validPoint(p: any) { return p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 1000; }
export function parseAlbum(raw: string | null): Album {
  if (raw === null) return emptyAlbum();
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !value.days || typeof value.days !== 'object' || Array.isArray(value.days) || !Array.isArray(value.shelf)
    || !['paper','pink','sage'].includes(value.theme) || !value.shelf.every(validPiece)
    || !Object.entries(value.days).every(([key, items]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(items) && items.every(validPiece))) throw new Error('저장된 달력을 읽지 못했어. 기존 데이터는 그대로 보관하고 있어.');
  if(value.events!==undefined){
    if(!value.events||typeof value.events!=='object'||Array.isArray(value.events))throw new Error('일정 데이터를 읽지 못했어요.');
    for(const [date,items] of Object.entries(value.events)){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Array.isArray(items))throw new Error('일정 데이터를 읽지 못했어요.');items.forEach(validateSchedule);}
  }
  if(value.paperColors!==undefined&&(!isRecord(value.paperColors)||!Object.entries(value.paperColors).every(([key,color])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&typeof color==='string'&&/^#[0-9a-fA-F]{6}$/.test(color))))throw new Error('배경 색상을 읽지 못했어요.');
  if(value.papers!==undefined&&(!isRecord(value.papers)||!Object.values(value.papers).every(validPaper)))throw new Error('종이 설정을 읽지 못했어요.');
  if(value.months!==undefined&&(!isRecord(value.months)||!Object.values(value.months).every((v:any)=>v&&validPaper(v.paper)&&Array.isArray(v.pieces)&&v.pieces.every(validPiece))))throw new Error('월 꾸미기를 읽지 못했어요.');
  return value;
}

export function validateVideoDuration(seconds:number) {
  if(!Number.isFinite(seconds)||seconds<=0)throw new Error("영상 길이를 확인하지 못했어.");
  if(seconds>5.05)throw new Error("5초 이내 영상을 선택해 줘. 사진 앱에서 원하는 구간으로 잘라서 가져올 수 있어.");
}

// Project the drag onto the rotated corner diagonal; keep the opposite corner fixed.
export function resizePiece(piece:Piece, side:number, cornerX:number, cornerY:number, dx:number, dy:number) {
  const box=fitBox(piece.width,piece.height,side*piece.size);
  const angle=piece.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const vx=cornerX*box.width*c-cornerY*box.height*s;
  const vy=cornerX*box.width*s+cornerY*box.height*c;
  const factor=1+(dx*vx+dy*vy)/(vx*vx+vy*vy);
  const size=clamp(piece.size*factor,.2,1);
  const scale=size/piece.size;
  return {size,x:clamp(piece.x+vx*(scale-1)/(2*side),.05,.95),y:clamp(piece.y+vy*(scale-1)/(2*side),.05,.95)};
}

export function pinchSize(size:number,initialDistance:number,distance:number) {
  if(!Number.isFinite(initialDistance)||initialDistance<=0||!Number.isFinite(distance))return size;
  return clamp(size*distance/initialDistance,.2,1);
}

export function validateSchedule(event:Schedule) {
 if(event?.style!==undefined&&!['plain','label','highlight'].includes(event.style))throw new Error('일정 스타일을 읽지 못했어요.');
 if(event?.done!==undefined&&typeof event.done!=='boolean')throw new Error('완료 상태를 읽지 못했어요.');
 if(!event||typeof event.id!=='string'||typeof event.title!=='string'||!event.title.trim()||event.title.length>80)throw new Error('일정 제목을 입력해 주세요. (80자 이내)');
 if(event.time!==null&&(typeof event.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)))throw new Error('시간을 24시간 형식으로 입력해 주세요. 예: 14:30');
 if(typeof event.note!=='string'||event.note.length>1000)throw new Error('메모는 1,000자 이내로 입력해 주세요.');
}

function isRecord(v:any){return v&&typeof v==='object'&&!Array.isArray(v);}
function validPaper(v:any){return ['plain','grid','lined','kraft'].includes(v);}
function validDecoration(p:any){
 if(p.text!==undefined&&(typeof p.text!=='string'||p.text.length>160))return false;
 if(p.caption!==undefined&&(typeof p.caption!=='string'||p.caption.length>60))return false;
 if(p.color!==undefined&&(typeof p.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(p.color)))return false;
 if(p.font!==undefined&&!['round','serif','hand'].includes(p.font))return false;
 if(p.pattern!==undefined&&!['plain','dots','stripes'].includes(p.pattern))return false;
 if(p.frame!==undefined&&!['none','polaroid','torn','film'].includes(p.frame))return false;
 if(p.kind==='doodle'&&(!Array.isArray(p.drawing)||!p.drawing.every((d:any)=>Array.isArray(d.points)&&d.points.every(validPoint)&&typeof d.color==='string'&&/^#[0-9a-fA-F]{6}$/.test(d.color)&&Number.isFinite(d.width)&&d.width>0&&d.width<=100)))return false;
 return true;
}
