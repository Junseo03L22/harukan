import React, { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Photo } from './Artwork';
import { clamp, Cutout, fitBox, pathOf, Piece, Point } from './model';

export function Editor({piece,onClose,onSave}:{piece:Piece;onClose:()=>void;onSave:(cutout:Cutout)=>Promise<void>}) {
  const {width,height}=useWindowDimensions();
  const box=fitBox(piece.width,piece.height,Math.min(width-48,height*.48,480));
  const [mask,setMask]=useState<Cutout>(piece.cutout ?? {outline:[],strokes:[]});
  const [history,setHistory]=useState<Cutout[]>([]);
  const [tool,setTool]=useState<'outline'|'erase'|'restore'>('outline');
  const [brush,setBrush]=useState(45);
  const [points,setPoints]=useState<Point[]>([]);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const active=useRef<Point[]>([]); const [confirm,setConfirm]=useState(false);
  const current=useRef({mask,tool,brush,box});current.current={mask,tool,brush,box};
  function commit(next:Cutout) {setHistory(h=>[...h.slice(-29),current.current.mask]);setMask(next);}
  const responders=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:e=>{const b=current.current.box;active.current=[{x:clamp(e.nativeEvent.locationX/b.width*1000,0,1000),y:clamp(e.nativeEvent.locationY/b.height*1000,0,1000)}];setPoints([...active.current]);},
    onPanResponderMove:e=>{const b=current.current.box;if(active.current.length<1500)active.current.push({x:clamp(e.nativeEvent.locationX/b.width*1000,0,1000),y:clamp(e.nativeEvent.locationY/b.height*1000,0,1000)});setPoints([...active.current]);},
    onPanResponderRelease:()=>{const c=current.current;const p=active.current;if(c.tool==='outline' && p.length>=3)commit({outline:p,strokes:[]});else if(c.tool!=='outline' && p.length)commit({...c.mask,strokes:[...c.mask.strokes,{points:p,width:c.brush,restore:c.tool==='restore'}]});active.current=[];setPoints([]);},
    onPanResponderTerminate:()=>{active.current=[];setPoints([]);},onPanResponderTerminationRequest:()=>false,
  })).current;
  const preview:Cutout=points.length && tool!=='outline'?{...mask,strokes:[...mask.strokes,{points,width:brush,restore:tool==='restore'}]}:mask;
  const button=(label:string,fn:()=>void,selected=false,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={fn} style={{padding:12,minHeight:44,borderRadius:13,backgroundColor:selected?'#7C596D':'#F0EAE6',opacity:disabled?.4:1}}><Text style={{color:selected?'white':'#674F5C',fontWeight:'600'}}>{label}</Text></Pressable>;
  return <Modal visible animationType="slide" onRequestClose={()=>setConfirm(true)}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><ScrollView contentContainerStyle={{padding:24,gap:17,alignItems:'center'}} scrollEnabled={!points.length}>
    <View style={{width:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{fontSize:24,fontWeight:'800',color:'#493640'}}>사진 편집실</Text>{button('닫기',()=>setConfirm(true),false,busy)}</View>
    <Text style={{color:'#887580',lineHeight:22,textAlign:'center'}}>{tool==='outline'?'남길 부분을 손가락으로 한 바퀴 둘러 그려줘.':'사진 위를 문질러 '+(tool==='erase'?'배경을 지워줘.':'지운 부분을 다시 살려줘.')} 원본은 그대로 남아 있어.</Text>
    <View style={{width:box.width,height:box.height,backgroundColor:'#DDD7DE',overflow:'hidden',borderRadius:12}} {...responders.panHandlers}>
      <View pointerEvents="none" style={{position:'absolute',width:'100%',height:'100%',flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:400},(_,i)=><View key={i} style={{width:'5%',height:'5%',backgroundColor:(Math.floor(i/20)+i)%2?'#F7F3F7':'#DCD6DE'}}/>)}</View>
      <View pointerEvents="none"><Photo piece={piece} width={box.width} height={box.height} cutout={preview}/></View>
      {tool==='outline' && points.length>0 && <View pointerEvents="none" style={{position:'absolute'}}><Svg width={box.width} height={box.height} viewBox="0 0 1000 1000" preserveAspectRatio="none"><Path d={pathOf(points)} stroke="#BA5B97" strokeWidth={7} strokeDasharray="12 8" fill="none"/></Svg></View>}
    </View>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{button('둘러서 남기기',()=>setTool('outline'),tool==='outline')}{button('지우개',()=>setTool('erase'),tool==='erase')}{button('복원',()=>setTool('restore'),tool==='restore')}</View>
    {tool!=='outline' && <View style={{flexDirection:'row',gap:8}}>{[20,45,90].map((n,i)=><View key={n}>{button(['가는 붓','보통 붓','굵은 붓'][i],()=>setBrush(n),brush===n)}</View>)}</View>}
    <View style={{flexDirection:'row',gap:8}}>{button('되돌리기',()=>{const last=history[history.length-1];if(last){setMask(last);setHistory(h=>h.slice(0,-1));}},false,!history.length)}{button('원본으로',()=>commit({outline:[],strokes:[]}))}</View>
    <Text style={{fontSize:11,color:'#988792'}}>다시 둘러 그리면 기존 영역과 붓 편집이 바뀌어. 되돌릴 수 있어.</Text>
    {!!error && <Text accessibilityRole="alert" style={{color:'#A44860'}}>{error}</Text>}
    {button(busy?'저장 중…':'스티커로 저장하고 붙이기',async()=>{setBusy(true);setError('');try{await onSave(mask);}catch{setError('저장하지 못했어. 편집 내용은 유지 중이야.');}finally{setBusy(false);}},true,busy)}
    {confirm && <View style={{padding:20,backgroundColor:'#F3E5E8',gap:12,borderRadius:16}}><Text>저장하지 않은 편집을 닫을까?</Text><View style={{flexDirection:'row',gap:10}}>{button('계속 편집',()=>setConfirm(false))}{button('닫기',onClose)}</View></View>}
  </ScrollView></SafeAreaView></Modal>;
}
