import React, { useId } from 'react';
import { Text, View } from 'react-native';
import { toneMatrix } from './tones';
import Svg, { Filter, FeColorMatrix, Circle, Defs, G, Image as SvgImage, Mask, Path, Rect } from 'react-native-svg';
import { Cutout, pathOf, Piece, StickerId, stickers } from './model';
import { photoUri } from './storage';
export function Sticker({ id, size }: {id:StickerId;size:number}) {
  const color = stickers.find(s=>s.id===id)?.color ?? '#B39BC8';
  return <Svg width={size} height={size} viewBox="0 0 100 100"><G stroke="#FFFDF8" strokeWidth={4} strokeLinejoin="round" fill={color}>
    {id==='heart' && <Path d="M50 86C40 78 9 55 9 31C9 10 37 5 50 25C63 5 91 10 91 31C91 55 60 78 50 86Z"/>}
    {id==='star' && <Path d="M50 5L61 34L92 36L68 57L76 90L50 73L24 90L32 57L8 36L39 34Z"/>}
    {id==='flower' && <><Circle cx={50} cy={24} r={19}/><Circle cx={75} cy={42} r={19}/><Circle cx={65} cy={72} r={19}/><Circle cx={35} cy={72} r={19}/><Circle cx={25} cy={42} r={19}/><Circle cx={50} cy={49} r={15} fill="#EED393"/></>}
    {id==='leaf' && <><Path d="M49 88L49 41" stroke={color} strokeWidth={7}/><Path d="M49 61C5 63 6 22 9 17C39 17 51 33 49 61ZM51 49C48 22 70 9 91 13C94 35 76 55 51 49Z"/></>}
    {id==='sun' && <><Path d="M50 2V15M50 85V98M2 50H15M85 50H98M15 15L24 24M76 76L85 85M15 85L24 76M76 24L85 15" stroke={color} strokeWidth={6}/><Circle cx={50} cy={50} r={29}/></>}
    {id==='cloud' && <Path d="M23 76C1 75 1 44 21 42C17 11 57 6 66 33C89 24 102 56 88 70C79 81 39 75 23 76Z"/>}
  </G></Svg>;
}
export function Photo({ piece, width, height, cutout = piece.cutout }: {piece:Piece;width:number;height:number;cutout?:Cutout}) {
  const id = `mask${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
  return <Svg width={width} height={height} viewBox="0 0 1000 1000" preserveAspectRatio="none">
    <Defs><Filter id={`${id}tone`}><FeColorMatrix type="matrix" values={toneMatrix(piece.tone,piece.intensity??1)}/></Filter><Mask id={id} x={0} y={0} width={1000} height={1000} maskUnits="userSpaceOnUse" maskType="luminance">
      <Rect width={1000} height={1000} fill={cutout?.outline.length ? 'black' : 'white'}/>
      {!!cutout?.outline.length && <Path d={pathOf(cutout.outline,true)} fill="white"/>}
      {cutout?.strokes.map((s,i)=><G key={i} fill={s.restore?'white':'black'} stroke={s.restore?'white':'black'} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round"><Path d={pathOf(s.points)} fill="none"/>{s.points.length===1 && <Circle cx={s.points[0].x} cy={s.points[0].y} r={s.width/2} strokeWidth={0}/>}</G>)}
    </Mask></Defs>
    <G mask={`url(#${id})`}><SvgImage filter={piece.tone&&piece.tone!=='original'?`url(#${id}tone)`:undefined} href={{uri:photoUri(piece.source)}} width={1000} height={1000} preserveAspectRatio="none"/></G>
  </Svg>;
}

export function Collage({piece,width,height}:{piece:Piece;width:number;height:number}) {
  const columns=piece.layout==='grid'?2:1,rows=piece.layout==='grid'?2:4;
  const gap=width*.035,slotWidth=(width-gap*(columns+1))/columns,slotHeight=(height-gap*(rows+1))/rows;
  return <View style={{width,height,backgroundColor:piece.frameColor??'#FFFDF8'}}>
    {!piece.frames?.length&&Array.from({length:4},(_,i)=><View key={i} style={{position:'absolute',left:gap+(i%columns)*(slotWidth+gap),top:gap+Math.floor(i/columns)*(slotHeight+gap),width:slotWidth,height:slotHeight,backgroundColor:'#DDD4D9',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#876675',fontSize:Math.min(20,slotWidth*.15)}}>{i+1}</Text></View>)}
    {piece.frames?.map((f,i)=>{
      const scale=Math.min(slotWidth/f.width,slotHeight/f.height);const w=f.width*scale,h=f.height*scale;
      return <View key={i} style={{position:'absolute',left:gap+(i%columns)*(slotWidth+gap)+(slotWidth-w)/2,top:gap+Math.floor(i/columns)*(slotHeight+gap)+(slotHeight-h)/2}}><Photo piece={{...piece,...f,kind:'photo',cutout:undefined}} width={w} height={h}/></View>;
    })}
  </View>;
}
