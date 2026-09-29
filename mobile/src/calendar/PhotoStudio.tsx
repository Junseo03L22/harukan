import React,{useState} from 'react';
import { Modal,Pressable,ScrollView,Text,View,useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Collage,Photo } from './Artwork';
import { fitBox,Piece,uid } from './model';
import { importPhoto } from './storage';
import { tones } from './tones';

export function PhotoStudio({piece,onSave,onClose}:{piece?:Piece;onSave:(piece:Piece)=>Promise<void>;onClose:()=>void}) {
  const [draft,setDraft]=useState<Piece>(piece??{id:uid(),kind:'collage',source:'collage',frames:[],layout:'strip',frameColor:'#FFFDF8',width:300,height:900,x:.5,y:.5,size:.9,rotation:0});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const {width,height}=useWindowDimensions();const box=fitBox(draft.width,draft.height,Math.min(width-48,height*.5,430));
  const patch=(p:Partial<Piece>)=>setDraft(d=>({...d,...p}));
  const button=(label:string,fn:()=>void,selected=false,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={fn} style={{padding:13,minHeight:44,borderRadius:12,backgroundColor:selected?'#876675':'#EEE7E5',opacity:(disabled||busy)?0.5:1}}><Text style={{color:selected?'white':'#71545F'}}>{label}</Text></Pressable>;
  async function choosePhotos() {
    setError('');
    // Open immediately in the button event so browsers allow the file picker.
    const request=ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:4,orderedSelection:true,quality:1});
    setBusy(true);
    try {
      const result=await request;if(result.canceled)return;
      if(result.assets.length!==4)throw new Error('사진을 네 장 선택해 주세요.');
      if(result.assets.some(a=>/gif/i.test(a.mimeType??'')||/\.gif$/i.test(a.fileName??'')))throw new Error('4컷에는 일반 사진을 선택해 주세요. GIF는 달력에 직접 붙일 수 있어요.');
      const frames=[];for(const a of result.assets)frames.push(await importPhoto(a.uri,a.width,a.height));
      patch({frames});
    }catch(e){setError(e instanceof Error?e.message:'사진을 가져오지 못했어요.');}finally{setBusy(false);}
  }
  const ready=draft.kind!=='collage'||draft.frames?.length===4;
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><ScrollView contentContainerStyle={{padding:24,gap:18,maxWidth:560,width:'100%',alignSelf:'center'}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:24,fontWeight:'700',color:'#503B46'}}>{draft.kind==='collage'?'4컷 만들기':'사진 보정'}</Text>{button('취소',onClose)}</View>
    <View style={{alignItems:'center',padding:12,backgroundColor:'#E9E3E5',borderRadius:16}}>{draft.kind==='collage'?<Collage piece={draft} {...box}/>:<Photo piece={draft} {...box}/>}</View>
    {draft.kind==='collage'&&<>
      {button(draft.frames?.length?'사진 네 장 다시 선택':'사진 네 장 선택',()=>void choosePhotos(),true)}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{button('세로 4컷',()=>patch({layout:'strip',width:300,height:900}),draft.layout==='strip')}{button('2 × 2',()=>patch({layout:'grid',width:600,height:600}),draft.layout==='grid')}</View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['#FFFDF8','#29242A','#F4DDE5'] as const).map((color,i)=><View key={color}>{button(['크림 프레임','블랙 프레임','핑크 프레임'][i],()=>patch({frameColor:color}),draft.frameColor===color)}</View>)}</View>
      {!!draft.frames?.length&&<View style={{gap:8}}>{draft.frames.map((f,i)=><View key={i} style={{flexDirection:'row',gap:12,alignItems:'center'}}><Photo piece={{...draft,...f,kind:'photo'}} {...fitBox(f.width,f.height,48)}/><Text>{i+1}번 사진</Text>{button('앞으로',()=>{const frames=[...draft.frames!];[frames[i-1],frames[i]]=[frames[i],frames[i-1]];patch({frames});},false,i===0)}</View>)}</View>}
    </>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{tones.map(t=><View key={t.id}>{button(t.label,()=>patch({tone:t.id}), (draft.tone??'original')===t.id)}</View>)}</View>
    {draft.tone&&draft.tone!=='original'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[.25,.5,.75,1].map(n=><View key={n}>{button(`강도 ${n*100}%`,()=>patch({intensity:n}), (draft.intensity??1)===n)}</View>)}</View>}
    {!!error&&<Text accessibilityRole="alert" style={{color:'#A55063'}}>{error}</Text>}
    {button(busy?'처리 중…':piece?'적용':'캘린더에 붙이기',()=>{setBusy(true);setError('');void onSave(draft).catch(()=>setError('저장하지 못했어요. 다시 시도해 주세요.')).finally(()=>setBusy(false));},true,!ready)}
  </ScrollView></SafeAreaView></Modal>;
}
