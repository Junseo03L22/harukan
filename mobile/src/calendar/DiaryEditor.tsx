import React,{useRef,useState} from 'react';
import {Modal,PanResponder,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Art,Layer} from './Canvas';
import {Paper} from './DiaryArt';
import {clamp,DiaryPage,Piece,Point,stickers,uid} from './model';
const colors=['#876675','#D68792','#D6AE59','#83A78B','#98B6C6','#503B46'];
const blank=():DiaryPage=>({pieces:[],paper:'plain'});
export function DiaryPreview({page}:{page?:DiaryPage}) {
 const [side,setSide]=useState(0);
 return <View pointerEvents="none" onLayout={e=>setSide(e.nativeEvent.layout.width)} style={{width:'100%',aspectRatio:1,overflow:'hidden',backgroundColor:'#FFFDF8',borderRadius:12}}><Paper kind={page?.paper} color={page?.color}/>{side>0&&page?.pieces.map(p=><Layer key={p.id} piece={p} side={side} active={false} interactive={false}/>)}</View>;
}
export function DiaryEditor({initial,title,date,onSave,onClose}:{initial:DiaryPage;title:string;date:string;onSave:(page:DiaryPage)=>Promise<void>;onClose:()=>void}) {
 const [page,setPage]=useState(initial??blank()),[history,setHistory]=useState<DiaryPage[]>([]),[selected,setSelected]=useState<string|null>(null);
 const [side,setSide]=useState(320),[dragging,setDragging]=useState(false),[mode,setMode]=useState<'arrange'|'pen'|'erase'>('arrange');
 const [color,setColor]=useState(colors[0]),[brush,setBrush]=useState(8),[text,setText]=useState(''),[font,setFont]=useState<Piece['font']>('round');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[closing,setClosing]=useState(false);
 const [stroke,setStroke]=useState<Point[]>([]);const points=useRef<Point[]>([]);
 const live=useRef({page,side,mode,color,brush});live.current={page,side,mode,color,brush};
 const active=page.pieces.find(p=>p.id===selected);
 function change(next:DiaryPage){setHistory(h=>[...h.slice(-29),live.current.page]);setPage(next);}
 function patch(id:string,p:Partial<Piece>){change({...live.current.page,pieces:live.current.page.pieces.map(q=>q.id===id?{...q,...p}:q)});}
 function make(kind:Piece['kind'],extra:Partial<Piece>={}):Piece{return {id:uid(),kind,source:kind,width:400,height:120,x:.5,y:.5,size:.55,rotation:0,color,...extra};}
 function add(p:Piece){change({...live.current.page,pieces:[...live.current.page.pieces,p]});setSelected(p.id);setMode('arrange');}
 const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
 onPanResponderGrant:e=>{setDragging(true);const c=live.current;points.current=[{x:clamp(e.nativeEvent.locationX/c.side*1000,0,1000),y:clamp(e.nativeEvent.locationY/c.side*1000,0,1000)}];setStroke([...points.current]);},
 onPanResponderMove:e=>{const c=live.current;if(points.current.length<1200)points.current.push({x:clamp(e.nativeEvent.locationX/c.side*1000,0,1000),y:clamp(e.nativeEvent.locationY/c.side*1000,0,1000)});setStroke([...points.current]);},
 onPanResponderRelease:()=>{const c=live.current;
  if(c.mode==='pen'){change({...c.page,pieces:[...c.page.pieces,{id:uid(),kind:'doodle',source:'doodle',width:1000,height:1000,x:.5,y:.5,size:1,rotation:0,drawing:[{points:[...points.current],width:c.brush,color:c.color}]}]});}
  else if(c.mode==='erase'){
   const hits=(p:Piece)=>p.kind==='doodle'&&p.drawing?.some(d=>d.points.some(pt=>{const a=p.rotation*Math.PI/180;const x=(pt.x-500)*p.size,y=(pt.y-500)*p.size;const px=p.x*1000+x*Math.cos(a)-y*Math.sin(a),py=p.y*1000+x*Math.sin(a)+y*Math.cos(a);return points.current.some(v=>Math.hypot(v.x-px,v.y-py)<30+d.width*p.size/2);}));
   change({...c.page,pieces:c.page.pieces.filter(p=>!hits(p))});
  }
  points.current=[];setStroke([]);setDragging(false);
 },onPanResponderTerminate:()=>{points.current=[];setStroke([]);setDragging(false);},onPanResponderTerminationRequest:()=>false})).current;
 const button=(label:string,fn:()=>void,on=false,disabled=false)=><Pressable accessibilityRole="button" disabled={busy||disabled} onPress={fn} style={{padding:12,minHeight:44,borderRadius:12,backgroundColor:on?'#876675':'#EEE7E5',opacity:(busy||disabled)?0.5:1}}><Text style={{color:on?'white':'#71545F'}}>{label}</Text></Pressable>;
 function preset(which:number){const presets=[{paper:'grid' as const,color:'#98B6C6',label:'바다 여행',sticker:'sun'},{paper:'kraft' as const,color:'#D6AE59',label:'카페 기록',sticker:'leaf'},{paper:'lined' as const,color:'#D68792',label:'HAPPY BIRTHDAY',sticker:'star'}];const p=presets[which];change({...page,paper:p.paper,pieces:[...page.pieces,make('text',{text:p.label,color:p.color,x:.5,y:.15,size:.65,font:'hand'}),make('tape',{color:p.color,pattern:'stripes',x:.35,y:.3,rotation:-12}),make('sticker',{source:p.sticker,width:100,height:100,size:.25,x:.8,y:.75})]});}
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)setClosing(true);}}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><ScrollView scrollEnabled={!dragging} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:14,maxWidth:560,width:'100%',alignSelf:'center'}}>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:22,fontWeight:'700',color:'#503B46'}}>{title}</Text>{button('닫기',()=>setClosing(true))}</View>
 <View onLayout={e=>setSide(e.nativeEvent.layout.width)} style={{width:'100%',aspectRatio:1,backgroundColor:'#FFFDF8',overflow:'hidden',borderRadius:16}}><Paper kind={page.paper} color={page.color}/>
 {page.pieces.map(p=><Layer key={p.id} piece={p} side={side} active={mode==='arrange'&&selected===p.id} interactive={mode==='arrange'} onSelect={()=>setSelected(p.id)} onMove={(x,y)=>patch(p.id,{x,y})} onResize={v=>patch(p.id,v)} onInteraction={setDragging}/>)}
 {stroke.length>0&&mode==='pen'&&<View pointerEvents="none" style={{position:'absolute',left:0,top:0}}><Art piece={make('doodle',{drawing:[{points:stroke,color,width:brush}]})} width={side} height={side}/></View>}
 {mode!=='arrange'&&<View style={{position:'absolute',left:0,right:0,top:0,bottom:0}} {...pan.panHandlers}/>}
 </View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{button('배치',()=>setMode('arrange'),mode==='arrange')}{button('낙서 펜',()=>{setMode('pen');setSelected(null);},mode==='pen')}{button('선 지우개',()=>setMode('erase'),mode==='erase')}{button('되돌리기',()=>{setPage(history[history.length-1]);setHistory(h=>h.slice(0,-1));setSelected(null);},false,!history.length)}</View>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{colors.map(c=><Pressable key={c} accessibilityRole="button" accessibilityLabel={`색상 ${c}`} onPress={()=>{setColor(c);if(active&&['text','tape','stamp'].includes(active.kind))patch(active.id,{color:c});}} style={{width:40,height:40,borderRadius:20,backgroundColor:c,borderWidth:color===c?3:0,borderColor:'#29242A'}}/>)}{mode==='pen'&&[4,8,16].map(n=><View key={n}>{button(`${n}px`,()=>setBrush(n),brush===n)}</View>)}</View>
 <Text style={{fontWeight:'700'}}>종이</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['plain','grid','lined','kraft'] as const).map((p,i)=><View key={p}>{button(['무지','모눈','줄노트','크라프트'][i],()=>change({...page,paper:p}),page.paper===p)}</View>)}</View>
 <Text style={{fontWeight:'700'}}>마스킹테이프</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['plain','dots','stripes'] as const).map((pattern,i)=><View key={pattern}>{button(['단색 테이프','도트 테이프','줄무늬 테이프'][i],()=>add(make('tape',{pattern,rotation:-8})))}</View>)}</View>
 <Text style={{fontWeight:'700'}}>글쓰기</Text><TextInput accessibilityLabel="꾸미기 문구" placeholder="짧은 기록" maxLength={160} value={text} onChangeText={setText} multiline style={{borderWidth:1,borderColor:'#D5C7CE',borderRadius:12,padding:14,minHeight:60}}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['round','serif','hand'] as const).map((f,i)=><View key={f}>{button(['또박또박','명조','기울임'][i],()=>setFont(f),font===f)}</View>)}{button('글 붙이기',()=>{if(text.trim())add(make('text',{text:text.trim(),font,height:200}));},false,!text.trim())}{active?.kind==='text'&&button('선택 글 수정',()=>patch(active.id,{text:text.trim(),font}),false,!text.trim())}</View>
 <Text style={{fontWeight:'700'}}>스티커</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{stickers.map(st=><View key={st.id}>{button(st.label,()=>add(make('sticker',{source:st.id,width:100,height:100,size:.25})))}</View>)}</View>
 <Text style={{fontWeight:'700'}}>도장</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{[date,'맑음 ☀','비 ☂','여행','생일','좋은 날'].map(label=><View key={label}>{button(label,()=>add(make('stamp',{text:label,width:300,height:160,size:.35,rotation:-5})))}</View>)}</View>
 <Text style={{fontWeight:'700'}}>꾸미기 세트</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{['바다 여행','카페','생일'].map((label,i)=><View key={label}>{button(label,()=>preset(i))}</View>)}</View>
 {active&&mode==='arrange'&&<View style={{gap:10,padding:12,backgroundColor:'#F3EAEE',borderRadius:14}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{button('↶ 회전',()=>patch(active.id,{rotation:active.rotation-10}))}{button('회전 ↷',()=>patch(active.id,{rotation:active.rotation+10}))}{active.kind==='tape'&&button('길게',()=>patch(active.id,{width:Math.min(1000,active.width+80),size:clamp(active.size*Math.min(1000,active.width+80)/active.width,.2,1)}))}{active.kind==='tape'&&button('짧게',()=>patch(active.id,{width:Math.max(140,active.width-80),size:clamp(active.size*Math.max(140,active.width-80)/active.width,.2,1)}))}{button('맨 앞으로',()=>change({...page,pieces:[...page.pieces.filter(p=>p.id!==active.id),active]}))}{button('삭제',()=>{change({...page,pieces:page.pieces.filter(p=>p.id!==active.id)});setSelected(null);})}</View>
 {active.kind==='photo'&&<><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['none','polaroid','torn','film'] as const).map((frame,i)=><View key={frame}>{button(['테두리 없음','폴라로이드','찢어진 종이','필름'][i],()=>patch(active.id,{frame}),active.frame===frame)}</View>)}</View><TextInput accessibilityLabel="사진 아래 문구" placeholder="폴라로이드 아래 문구" maxLength={60} value={active.caption??''} onChangeText={caption=>patch(active.id,{caption})} style={{padding:12,backgroundColor:'white',borderRadius:10}}/></>}
 </View>}
 {!!error&&<Text accessibilityRole="alert" style={{color:'#A55063'}}>{error}</Text>}
 {button(busy?'저장 중…':'꾸미기 완료',()=>{setBusy(true);setError('');void onSave(page).then(onClose).catch(()=>setError('저장하지 못했어요. 다시 시도해 주세요.')).finally(()=>setBusy(false));},true)}
 {closing&&<View style={{gap:8}}><Text>저장하지 않은 변경을 닫을까요?</Text>{button('계속 꾸미기',()=>setClosing(false))}{button('저장하지 않고 닫기',onClose)}</View>}
 </ScrollView></SafeAreaView></Modal>;
}
