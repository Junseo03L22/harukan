import React,{useEffect,useState} from 'react';
import { AppState, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Piece } from './model';
import { resolveMedia } from './mediaFiles';
import { photoUri } from './storage';
import { useCaptureImage } from './CaptureContext';

function useMedia(source:string) {
  const [result,setResult]=useState({uri:'',error:''});
  useEffect(()=>{let alive=true;let dispose=()=>{};setResult({uri:'',error:''});(source?resolveMedia(source):Promise.resolve({uri:'',dispose:()=>{}})).then(r=>{if(!alive){r.dispose();return;}dispose=r.dispose;setResult({uri:r.uri,error:''});}).catch(()=>{if(alive)setResult({uri:'',error:'파일을 열지 못했어.'});});return()=>{alive=false;dispose();};},[source]);
  return result;
}
export function MotionArt({piece,width,height}:{piece:Piece;width:number;height:number}) {
  const capture=useCaptureImage(piece.kind==='video'?piece.poster??'':piece.source);
  const {uri,error}=useMedia(piece.kind==='gif'?piece.source:'');
  return <View style={{width,height,backgroundColor:piece.kind==='video'?'#E5DEE3':'transparent'}}>
    {(piece.kind==='video'?piece.poster:uri)?<Image source={piece.kind==='video'?photoUri(piece.poster!):uri} style={{width,height}} contentFit="contain" autoplay={!capture.capturing} onLoad={capture.onLoad} onError={capture.onError}/>:null}
    {piece.kind==='video'&&<View style={{position:'absolute',bottom:2,right:2,backgroundColor:'#493640CC',borderRadius:6,paddingHorizontal:4}}><Text style={{color:'white',fontSize:Math.max(8,Math.min(15,width/8))}}>▶</Text></View>}
    {!!error&&<Text style={{fontSize:10}}>{error}</Text>}
  </View>;
}
function Clip({uri}:{uri:string}) {
  const player=useVideoPlayer(uri,p=>{p.loop=true;p.muted=true;p.play();});
  const {status}=useEvent(player,'statusChange',{status:player.status});
  const [muted,setMuted]=useState(true);
  const {isPlaying}=useEvent(player,'playingChange',{isPlaying:player.playing});
  useEffect(()=>{if(status==='readyToPlay')player.play();},[status,player]);
  useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active')player.pause();});return()=>sub.remove();},[player]);
  return <>
    <VideoView player={player} nativeControls contentFit="contain" style={{width:'100%',flex:1}}/>
    {status==='loading'&&<Text style={{color:'white'}}>영상을 불러오는 중…</Text>}
    {status==='error'&&<Text accessibilityRole="alert" style={{color:'white'}}>영상을 재생하지 못했어. 파일 형식을 확인해 줘.</Text>}
    <Pressable accessibilityRole="button" onPress={()=>isPlaying?player.pause():player.play()} style={{padding:16}}><Text style={{color:'white'}}>{isPlaying?'일시정지':'재생'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>{player.muted=!muted;setMuted(!muted);}} style={{padding:16}}><Text style={{color:'white'}}>{muted?'소리 켜기':'소리 끄기'}</Text></Pressable>
  </>;
}
function ResolvedClip({piece}:{piece:Piece}) {const {uri,error}=useMedia(piece.source);return uri?<Clip uri={uri}/>:<Text style={{color:'white'}}>{error||'영상을 여는 중…'}</Text>;}
export function VideoScreen({pieces,onClose,date}:{pieces:Piece[];onClose:()=>void;date:string}) {
  const [index,setIndex]=useState(0);
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:'#241D23',padding:20}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={{color:'white',fontSize:18}}>{date} · {index+1}/{pieces.length}</Text><Pressable accessibilityRole="button" onPress={onClose} style={{padding:16}}><Text style={{color:'white'}}>닫기</Text></Pressable></View>
    <ResolvedClip key={pieces[index].id} piece={pieces[index]}/>
    <View style={{flexDirection:'row',justifyContent:'space-around'}}>{pieces.map((p,i)=><Pressable accessibilityRole="button" key={p.id} onPress={()=>setIndex(i)} style={{padding:14}}><Text style={{color:index===i?'#FFC6D9':'white'}}>영상 {i+1} · {p.duration?.toFixed(1)}초</Text></Pressable>)}</View>
  </SafeAreaView></Modal>;
}
