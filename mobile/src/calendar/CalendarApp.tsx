import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg,{Rect,Path} from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Album, clamp, dateKey, emptyAlbum, fitBox, monthCells, Piece, Schedule, pinchSize, resizePiece, stickers, uid } from './model';
import { importPhoto, loadAlbum, saveAlbum } from './storage';
import { Collage, Photo, Sticker } from './Artwork';
import { Editor } from './Editor';
import { MotionArt, VideoScreen } from './Motion';
import { importMotion } from './mediaFiles';
import { DatePicker } from './DatePicker';
import { PhotoStudio } from './PhotoStudio';
import { ScheduleEditor } from './ScheduleEditor';
import {Art,Layer,DayPreview} from './Canvas';
import {DiaryEditor} from './DiaryEditor';
import {Paper} from './DiaryArt';
import {BackgroundEditor} from './BackgroundEditor';
import {MonthExport} from './MonthExport';
import {BackupPanel} from './BackupPanel';
const themes={paper:{paper:'#FFFDF8',accent:'#876675',back:'#F7F3ED'},pink:{paper:'#FFF4F4',accent:'#A76D7E',back:'#F9EDED'},sage:{paper:'#F4F7EE',accent:'#668775',back:'#EDF2E9'}};
function CalendarApp() {
  const today=dateKey(new Date());
  const [interacting,setInteracting]=useState(false);
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [exportOpen,setExportOpen]=useState(false);
  const [backupOpen,setBackupOpen]=useState(false);
  const [isEditing,setIsEditing]=useState(false);
  const scroll=useRef<ScrollView>(null);const [finishing,setFinishing]=useState(false);
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const [date,setDate]=useState(today);const [album,setAlbum]=useState<Album>(emptyAlbum);
  const current=useRef(album);const [ready,setReady]=useState(false);const [loadError,setLoadError]=useState('');
  const [error,setError]=useState('');const [saveState,setSaveState]=useState('저장됨');const revision=useRef(0);
  const [busy,setBusy]=useState(false);const importing=useRef(false);
  const [active,setActive]=useState<string|null>(null);const [side,setSide]=useState(320);
  const [panel,setPanel]=useState<'stickers'|'shelf'|'theme'|null>(null);const [editing,setEditing]=useState<Piece|null>(null);
  const [watching,setWatching]=useState<{date:string;pieces:Piece[]}|null>(null);
  const [studio,setStudio]=useState<{piece?:Piece;date:string}|null>(null);
  const [schedule,setSchedule]=useState<{date:string;event?:Schedule}|null>(null);
  const [background,setBackground]=useState<string|null>(null);
  const [diary,setDiary]=useState<{key:string}|null>(null);
  const [choosingDate,setChoosingDate]=useState(false);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const days=album.days[date]??[];const selected=days.find(p=>p.id===active);const theme=themes[album.theme];
  async function load() {setLoadError('');try{const a=await loadAlbum();current.current=a;setAlbum(a);setReady(true);}catch(e){setLoadError(e instanceof Error?e.message:'달력을 읽지 못했어.');}}
  useEffect(()=>{void load();},[]);
  async function commit(next:Album) {current.current=next;setAlbum(next);const version=++revision.current;setSaveState('저장 중…');try{await saveAlbum(next);if(version===revision.current)setSaveState('기기에 저장했어');}catch(e){if(version===revision.current)setSaveState('저장 실패 · 다시 저장');throw e;}}
  function change(fn:(a:Album)=>Album) {void commit(fn(current.current)).catch(()=>setError('저장 공간을 확인해 줘. 화면의 변경 내용은 유지 중이야.'));}
  function update(id:string,patch:Partial<Piece>) {change(a=>({...a,days:{...a.days,[date]:(a.days[date]??[]).map(p=>p.id===id?{...p,...patch}:p)}}));}
  function add(piece:Piece) {change(a=>({...a,days:{...a.days,[date]:[...(a.days[date]??[]),piece]}}));setActive(piece.id);}
  async function finish() {
    setFinishing(true);setError('');
    try {await commit(current.current);setActive(null);setIsEditing(false);setSaveState('꾸미기 완료 · 저장했어');scroll.current?.scrollTo({y:0,animated:true});}
    catch {setError('저장하지 못했어. 다시 완료를 눌러 줘.');}
    finally {setFinishing(false);}
  }
  async function pick(camera=false,video=false) {
    if(importing.current)return;importing.current=true;setBusy(true);setError('');const target=date;
    try {
      if(camera){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('카메라 권한이 필요해. 앨범에서 사진을 가져와도 좋아.');}
      const options:ImagePicker.ImagePickerOptions={mediaTypes:video?['videos']:['images'],allowsEditing:false,quality:1,videoMaxDuration:5};
      const result=camera?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);
      if(result.canceled)return;
      const asset=result.assets[0];
      const kind=asset.type==='video'?'video':(/gif/i.test(asset.mimeType??'')||/\.gif(?:$|\?)/i.test(asset.fileName??asset.uri))?'gif':'photo';
      const media=kind==='photo'?await importPhoto(asset.uri,asset.width,asset.height):await importMotion(asset,kind);
      const piece:Piece={id:uid(),kind,...media,x:.5,y:.5,size:.78,rotation:0};
      await commit({...current.current,days:{...current.current.days,[target]:[...(current.current.days[target]??[]),piece]}});setActive(piece.id);
    } catch(e) {setError(e instanceof Error?e.message:'사진을 가져오지 못했어. 다시 시도해 줘.');}finally{importing.current=false;setBusy(false);}
  }
  const button=(text:string,fn:()=>void,primary=false,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={fn} style={[s.button,primary&&{backgroundColor:theme.accent},disabled&&{opacity:.45}]}><Text style={[s.buttonText,primary&&{color:'#FFF'}]}>{text}</Text></Pressable>;
  if(!ready)return <SafeAreaView style={s.safe}><View style={{padding:30,gap:20}}>{loadError?<><Text accessibilityRole="alert">{loadError}</Text>{button('다시 읽기',()=>void load())}</>:<ActivityIndicator/>}</View></SafeAreaView>;
  return <SafeAreaView style={[s.safe,{backgroundColor:theme.back}]}><StatusBar style="dark"/>
    <ScrollView scrollEnabled={!interacting} ref={scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.top}><View><Text style={s.eyebrow}>{date===today?'TODAY':'MY DIARY'} · {date.slice(0,4)}</Text><Text style={s.title}>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일 <Text style={{fontSize:15,fontWeight:'400'}}>{['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][new Date(Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8))).getDay()]}</Text></Text></View><Pressable accessibilityRole="button" accessibilityLabel="월 전체 달력 열기" onPress={()=>{setMonth(new Date(Number(date.slice(0,4)),Number(date.slice(5,7))-1,1));setCalendarOpen(true);}} style={[s.button,{backgroundColor:theme.paper,width:48,height:48}]}><Svg width={25} height={25} viewBox="0 0 24 24" fill="none"><Rect x={3} y={5} width={18} height={16} rx={3} stroke={theme.accent} strokeWidth={1.6}/><Path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 3h3" stroke={theme.accent} strokeWidth={1.6} strokeLinecap="round"/></Svg></Pressable></View>
      {date!==today&&<View style={{alignSelf:'flex-start',marginBottom:12}}>{button('오늘로',()=>{setDate(today);setActive(null);setIsEditing(false);})}</View>}
      <View onLayout={e=>setSide(e.nativeEvent.layout.width)} style={[s.board,{backgroundColor:theme.paper,borderRadius:side*.035}]}><Paper kind={album.papers?.[date]} color={album.paperColors?.[date]}/>
        {!days.length && <Pressable accessibilityRole="button" accessibilityLabel="빈 날짜에 사진 추가" disabled={busy} onPress={()=>{setIsEditing(true);void pick();}} style={s.empty}><Text style={s.emptyIcon}>{busy?'…':'＋'}</Text></Pressable>}
        {days.map(p=><Layer key={p.id} piece={p} side={side} active={isEditing&&active===p.id} interactive={isEditing} onSelect={()=>setActive(p.id)} onMove={(x,y)=>update(p.id,{x,y})} onResize={patch=>update(p.id,patch)} onInteraction={setInteracting}/>)}
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>{date===today?'오늘 일정':'이날의 일정'}</Text>{button('＋ 일정',()=>setSchedule({date}))}</View>
      {(album.events?.[date]??[]).slice().sort((a,b)=>(a.time??'').localeCompare(b.time??'')).map(event=><Pressable accessibilityRole="button" key={event.id} onPress={()=>setSchedule({date,event})} style={{padding:14,marginBottom:8,borderRadius:12,backgroundColor:theme.paper,borderLeftWidth:3,borderLeftColor:theme.accent}}><Text style={{color:theme.accent,fontWeight:'700',textDecorationLine:event.done?'line-through':'none',backgroundColor:event.style==='highlight'?'#F4E4A6':event.style==='label'?'#E9D8E4':'transparent',padding:event.style==='label'?8:0,borderRadius:8}}>{event.done?'✓ ':''}{event.time??'종일'} · {event.title}</Text>{!!event.note&&<Text numberOfLines={2} style={{marginTop:6,color:'#71545F'}}>{event.note}</Text>}</Pressable>)}
      {!(album.events?.[date]?.length)&&<Text style={{color:'#A08E96',paddingVertical:12}}>등록된 일정이 없어요.</Text>}
      {!isEditing&&<View style={[s.row,{marginTop:16}]}>{button('페이지 꾸미기',()=>setIsEditing(true),true)}{days.some(p=>p.kind==='video')&&button('영상 보기',()=>setWatching({date,pieces:days.filter(p=>p.kind==='video')}))}</View>}
      {isEditing&&<>
      {!!selected && <View style={[s.tools,{marginTop:12}]}><View style={s.row}>{button('↶ 회전',()=>update(selected.id,{rotation:selected.rotation-10}))}{button('회전 ↷',()=>update(selected.id,{rotation:selected.rotation+10}))}</View><View style={s.row}>{selected.kind==='video'&&button('영상 재생',()=>setWatching({date,pieces:[selected]}),true)}{(selected.kind==='photo'||selected.kind==='collage')&&button(selected.kind==='collage'?'4컷 편집':'사진 보정',()=>setStudio({piece:selected,date}),true)}{selected.kind==='photo'&&button('직접 누끼 따기',()=>setEditing(selected),true)}{button('맨 앞으로',()=>change(a=>({...a,days:{...a.days,[date]:[...(a.days[date]??[]).filter(p=>p.id!==selected.id),selected]}})))}{button('삭제',()=>setDeleteId(selected.id))}</View></View>}
      <View style={[s.row,{marginTop:12}]}>{button('배경 설정',()=>setBackground(date))}{button('다이어리 꾸미기',()=>setDiary({key:date}),true)}{button(busy?'사진 가져오는 중…':'＋ 사진 · GIF',()=>void pick(),true,busy)}{button('촬영',()=>void pick(true),false,busy)}{button('스티커',()=>setPanel('stickers'))}{button('4컷 만들기',()=>setStudio({date}),false,busy)}{button('＋ 짧은 영상',()=>void pick(false,true),false,busy)}</View>
      <Text style={s.hint}>GIF는 움직이는 그대로 · 동영상은 5초 이내, 30MB 이하</Text>
      <View style={{marginTop:12}}>{button(finishing?'저장 중…':'완료',()=>void finish(),true,finishing||busy)}</View>
      </>}
      {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {saveState.startsWith('저장 실패')&&<Pressable accessibilityRole="button" onPress={()=>void commit(current.current).then(()=>setError('')).catch(()=>setError('저장 공간을 확인해 줘.'))} style={{padding:13}}><Text style={s.hint}>다시 저장</Text></Pressable>}
      {isEditing&&<View style={s.bottom}>{button('내 스티커 보관함',()=>setPanel('shelf'))}{button('앱 색상',()=>setPanel('theme'))}</View>}
      {!isEditing&&<View style={{marginTop:28,alignItems:'flex-start'}}>{button('기록 백업 · 복원',()=>setBackupOpen(true),false,busy||finishing)}</View>}
    </ScrollView>
    <Modal visible={calendarOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setCalendarOpen(false)}><SafeAreaView style={[s.safe,{backgroundColor:theme.back}]}><ScrollView contentContainerStyle={s.content}><View style={s.top}><Text style={s.title}>나의 달력</Text>{button('닫기',()=>setCalendarOpen(false))}</View>
      <View style={s.monthTop}>{button('‹',()=>{setMonth(new Date(month.getFullYear(),month.getMonth()-1,1));setActive(null);})}<Pressable accessibilityRole="button" accessibilityLabel="연도 월 날짜 선택" onPress={()=>setChoosingDate(true)}><Text style={s.month}>{month.getFullYear()}년 {month.getMonth()+1}월 ▾</Text></Pressable>{button('›',()=>{setMonth(new Date(month.getFullYear(),month.getMonth()+1,1));setActive(null);})}</View>
      <View style={[s.calendar,{backgroundColor:theme.paper}]}><View style={s.week}>{['일','월','화','수','목','금','토'].map((v,i)=><Text key={v} style={[s.weekText,i===0&&{color:'#BE7182'}]}>{v}</Text>)}</View>
        <View style={s.grid}>{monthCells(month.getFullYear(),month.getMonth()).map((key,i)=><Pressable key={key??`blank${i}`} disabled={!key} accessibilityRole="button" accessibilityLabel={key?`${key}, ${(album.days[key]??[]).length}개 기록`:undefined} onPress={()=>{if(key){setDate(key);setActive(null);setIsEditing(false);setCalendarOpen(false);scroll.current?.scrollTo({y:0,animated:false});}}} style={[s.cell,key===date&&{backgroundColor:'#EDE2EA',borderColor:theme.accent,borderWidth:1}]}>
          <Text style={[s.day,key===today&&{color:theme.accent,fontWeight:'900'}]}>{key?Number(key.slice(-2)):''}</Text>
          {key && <DayPreview pieces={album.days[key]??[]} paper={theme.paper} paperKind={album.papers?.[key]} paperColor={album.paperColors?.[key]}/>}
          {key&&!!album.events?.[key]?.length&&<Text numberOfLines={1} style={{fontSize:9,color:theme.accent,paddingHorizontal:3}}>● {album.events[key][0].title}{album.events[key].length>1?` +${album.events[key].length-1}`:''}</Text>}
          {key&&(album.days[key]??[]).some(p=>p.kind==='video')&&<Text style={{position:'absolute',right:3,top:3,fontSize:10,color:theme.accent}}>▶</Text>}
        </Pressable>)}</View>
      </View>
      <View style={{marginTop:18}}>{button('이 달 이미지 저장 · 공유',()=>setExportOpen(true),true)}</View>
    </ScrollView>
    {exportOpen&&<MonthExport album={album} month={month} paper={theme.paper} onClose={()=>setExportOpen(false)}/>}
    {choosingDate&&<DatePicker date={`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${date.slice(8)}`} onClose={()=>setChoosingDate(false)} onSelect={key=>{setDate(key);setMonth(new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1));setActive(null);setChoosingDate(false);setCalendarOpen(false);setIsEditing(false);scroll.current?.scrollTo({y:0,animated:false});}}/>}</SafeAreaView></Modal>
    {backupOpen&&<BackupPanel album={album} onClose={()=>setBackupOpen(false)} onRestored={restored=>{++revision.current;current.current=restored;setAlbum(restored);setActive(null);setIsEditing(false);setError('');setSaveState('기기에 저장했어');}}/>}
    {background&&<BackgroundEditor date={background} paper={theme.paper} initial={{pieces:album.days[background]??[],paper:album.papers?.[background]??'plain',color:album.paperColors?.[background]}} onClose={()=>setBackground(null)} onSave={async page=>{const a=current.current;const paperColors={...a.paperColors};if(page.color)paperColors[background]=page.color;else delete paperColors[background];await commit({...a,papers:{...a.papers,[background]:page.paper},paperColors});}}/>}
    {diary&&<DiaryEditor title="하루 꾸미기" date={diary.key} initial={{pieces:album.days[diary.key]??[],paper:album.papers?.[diary.key]??'plain',color:album.paperColors?.[diary.key]}} onClose={()=>setDiary(null)} onSave={async page=>{const a=current.current;await commit({...a,days:{...a.days,[diary.key]:page.pieces},papers:{...a.papers,[diary.key]:page.paper}});setActive(null);}}/>}
    {schedule&&<ScheduleEditor date={schedule.date} event={schedule.event} onClose={()=>setSchedule(null)} onSave={async event=>{const a=current.current;const items=a.events?.[schedule.date]??[];await commit({...a,events:{...a.events,[schedule.date]:items.some(e=>e.id===event.id)?items.map(e=>e.id===event.id?event:e):[...items,event]}});}} onDelete={async()=>{const a=current.current;await commit({...a,events:{...a.events,[schedule.date]:(a.events?.[schedule.date]??[]).filter(e=>e.id!==schedule.event?.id)}});}}/>}
    {studio&&<PhotoStudio piece={studio.piece} onClose={()=>setStudio(null)} onSave={async piece=>{
      const a=current.current;const items=a.days[studio.date]??[];
      await commit({...a,days:{...a.days,[studio.date]:items.some(p=>p.id===piece.id)?items.map(p=>p.id===piece.id?piece:p):[...items,piece]}});
      setActive(piece.id);setStudio(null);
    }}/>}

    {watching&&<VideoScreen date={watching.date} pieces={watching.pieces} onClose={()=>setWatching(null)}/>}
    {editing&&<Editor piece={editing} onClose={()=>setEditing(null)} onSave={async cutout=>{const original=editing;const edited={...original,cutout};const a=current.current;await commit({...a,days:{...a.days,[date]:(a.days[date]??[]).map(p=>p.id===original.id?edited:p)},shelf:[...a.shelf.filter(p=>p.id!==original.id),edited]});setEditing(null);}}/>}
    <Modal visible={!!panel} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setPanel(null)}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}><View style={s.top}><Text style={s.title}>{panel==='stickers'?'기본 스티커':panel==='shelf'?'내 스티커 보관함':'종이 고르기'}</Text>{button('닫기',()=>setPanel(null))}</View>
      <Text style={s.hint}>{panel==='theme'?'사진과 배치는 그대로, 종이 분위기만 바꿔봐.':`${Number(date.slice(5,7))}월 ${Number(date.slice(8))}일에 붙일 수 있어.`}</Text>
      {panel==='stickers'&&<View style={s.choices}>{stickers.map(sticker=><Pressable key={sticker.id} accessibilityRole="button" accessibilityLabel={`${sticker.label} 스티커 붙이기`} onPress={()=>{add({id:uid(),kind:'sticker',source:sticker.id,width:100,height:100,x:.65,y:.6,size:.3,rotation:-8});setPanel(null);}} style={s.choice}><Sticker id={sticker.id} size={65}/><Text style={s.buttonText}>{sticker.label}</Text></Pressable>)}</View>}
      {panel==='shelf'&&<>{!album.shelf.length&&<Text style={s.hint}>사진을 선택해 ‘직접 누끼 따기’를 해봐.{ '\n' }저장한 스티커를 다른 날에도 붙일 수 있어.</Text>}<View style={s.choices}>{album.shelf.map(p=><View key={p.id} style={s.choice}><Pressable accessibilityRole="button" accessibilityLabel="이 스티커 붙이기" onPress={()=>{add({...p,id:uid(),x:.5,y:.5,rotation:0});setPanel(null);}}><Art piece={p} {...fitBox(p.width,p.height,90)}/><Text style={s.buttonText}>붙이기</Text></Pressable>{button('보관함에서 삭제',()=>change(a=>({...a,shelf:a.shelf.filter(q=>q.id!==p.id)})))}</View>)}</View></>}
      {panel==='theme'&&<View style={s.choices}>{Object.entries(themes).map(([key,value],i)=><Pressable accessibilityRole="radio" accessibilityState={{checked:album.theme===key}} key={key} onPress={()=>change(a=>({...a,theme:key as Album['theme']}))} style={[s.choice,{backgroundColor:value.paper,borderWidth:2,borderColor:album.theme===key?value.accent:'transparent',minHeight:100}]}><Text style={s.buttonText}>{['크림 종이','벚꽃 종이','세이지 종이'][i]}{album.theme===key?' ✓':''}</Text></Pressable>)}</View>}
    </ScrollView></SafeAreaView></Modal>
    <Modal transparent visible={!!deleteId} onRequestClose={()=>setDeleteId(null)}><View style={s.shade}><View style={s.dialog}><Text style={s.sectionTitle}>이 페이지에서 지울까?</Text><Text style={s.muted}>휴대폰 앨범의 원본 사진은 지워지지 않아.</Text><View style={s.row}>{button('취소',()=>setDeleteId(null))}{button('페이지에서 삭제',()=>{change(a=>({...a,days:{...a.days,[date]:(a.days[date]??[]).filter(p=>p.id!==deleteId)}}));setDeleteId(null);setActive(null);},true)}</View></View></View></Modal>
  </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><CalendarApp/></SafeAreaProvider>;}
const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:'#FCFAF6'},content:{padding:20,paddingBottom:35,maxWidth:560,width:'100%',alignSelf:'center'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:22,marginTop:12},eyebrow:{fontSize:9,letterSpacing:2,color:'#AC8794',marginBottom:7},title:{fontSize:23,fontWeight:'800',color:'#503B46'},monthTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},month:{fontSize:22,fontWeight:'700',color:'#503B46'},button:{paddingHorizontal:13,paddingVertical:12,minHeight:44,backgroundColor:'#EEE7E5',borderRadius:13,justifyContent:'center',alignItems:'center'},buttonText:{fontSize:12,color:'#71545F',fontWeight:'600'},calendar:{borderRadius:19,padding:8,borderWidth:1,borderColor:'#EBE3DE'},week:{flexDirection:'row',marginVertical:9},weekText:{width:'14.2857%',textAlign:'center',fontSize:11,color:'#958B8B'},grid:{flexDirection:'row',flexWrap:'wrap'},cell:{width:'14.2857%',paddingBottom:3,borderWidth:.5,borderColor:'#EDE7E2',overflow:'hidden'},day:{fontSize:11,color:'#716167',margin:5},more:{position:'absolute',right:3,bottom:3,fontSize:9,color:'#866579'},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:25,marginBottom:12},sectionTitle:{fontSize:17,fontWeight:'700',color:'#57424B'},muted:{fontSize:11,color:'#A08E96',lineHeight:18},board:{width:'100%',aspectRatio:1,borderRadius:18,overflow:'hidden'},empty:{flex:1,alignItems:'center',justifyContent:'center',gap:10},emptyIcon:{fontSize:38,color:'#C8B6BF'},emptyTitle:{fontSize:17,color:'#A8919D'},hint:{fontSize:11,color:'#A08E96',textAlign:'center',lineHeight:19,marginVertical:12},row:{flexDirection:'row',flexWrap:'wrap',gap:7},tools:{padding:10,gap:8,backgroundColor:'#F2EAEC',borderRadius:16,marginBottom:14},error:{color:'#A55063',padding:12,fontSize:12},bottom:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},choices:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:18},choice:{minWidth:'44%',flexGrow:1,padding:18,borderRadius:18,backgroundColor:'#F4EEEB',alignItems:'center',gap:10},shade:{flex:1,backgroundColor:'#0006',justifyContent:'center',padding:25},dialog:{backgroundColor:'#FFFDF9',borderRadius:22,padding:24,gap:18},
});


