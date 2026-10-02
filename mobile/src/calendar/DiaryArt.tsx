import React,{useId} from 'react';
import {Platform,Text,View} from 'react-native';
import Svg,{Circle,ClipPath,Defs,G,Path,Rect,Text as SvgText} from 'react-native-svg';
import {PaperKind,Piece,pathOf,fitBox} from './model';
import {Photo} from './Artwork';
export function Paper({kind='plain',color}:{kind?:PaperKind;color?:string}){
 return <View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,overflow:'hidden',backgroundColor:color??(kind==='kraft'?'#D9BE96':'transparent')}}><Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">{(kind==='grid'||kind==='lined')&&Array.from({length:25},(_,i)=><React.Fragment key={i}><Path d={`M0 ${i*40}H1000`} stroke="#BCB0A5" opacity={.3}/>{kind==='grid'&&<Path d={`M${i*40} 0V1000`} stroke="#BCB0A5" opacity={.3}/>}</React.Fragment>)}{kind==='kraft'&&Array.from({length:80},(_,i)=><Circle key={i} cx={(i*137)%1000} cy={(i*263)%1000} r={2} fill="#8B7153" opacity={.2}/>)}</Svg></View>;
}
export function Decoration({piece:p,width,height}:{piece:Piece;width:number;height:number}){
 const color=p.color??'#876675';const tapeId=`tape${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
 if(p.kind==='tape'){
  const edge=Math.min(width*.012,height*.065),inset=height*.025;
  const shape=`M${edge} ${inset}L${width-edge} 0L${width-edge*.4} ${height*.22}L${width-edge} ${height*.49}L${width} ${height*.76}L${width-edge} ${height-inset}L${edge*.5} ${height}L${edge} ${height*.72}L0 ${height*.48}L${edge} ${height*.23}Z`;
  const pitch=Math.max(3,height*.34);
  return <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><Defs><ClipPath id={tapeId}><Path d={shape}/></ClipPath></Defs><G clipPath={`url(#${tapeId})`} opacity={.72}><Path d={shape} fill={color}/><Rect width={width} height={height} fill='#FFFDF8' opacity={.23}/>{p.pattern==='dots'&&Array.from({length:Math.ceil(width/pitch)*3},(_,i)=><Circle key={i} cx={(Math.floor(i/3)+.5+(i%3===1?.35:0))*pitch} cy={(i%3+.5)*height/3} r={height*.027} fill='#FFFDF8' opacity={.7}/>)}{p.pattern==='stripes'&&Array.from({length:Math.ceil(width/pitch)+3},(_,i)=><Path key={i} d={`M${i*pitch-height} 0l${height*.5} ${height}`} stroke='#FFFDF8' strokeWidth={height*.035} opacity={.55}/>)}<Path d={`M0 ${inset}H${width}M0 ${height-inset}H${width}`} stroke='#FFFDF8' strokeWidth={height*.018} opacity={.35}/></G></Svg>;
 }
 if(p.kind==='text')return <View style={{width,height,justifyContent:'center'}}><Text adjustsFontSizeToFit numberOfLines={4} style={{color,fontSize:height*.3,fontFamily:p.font==='serif'?'serif':p.font==='hand'?(Platform.OS==='web'?'cursive':undefined):undefined,fontStyle:p.font==='hand'?'italic':'normal',fontWeight:p.font==='round'?'700':'400',textAlign:'center'}}>{p.text}</Text></View>;
 return <Svg width={width} height={height} viewBox="0 0 1000 1000" preserveAspectRatio="none">
 {p.kind==='stamp'&&<><Rect x={20} y={80} width={960} height={840} rx={70} stroke={color} strokeWidth={25} fill="none" strokeDasharray="45 15"/><SvgText x={500} y={580} textAnchor="middle" fontSize={Math.min(240,850/Math.max(1,(p.text??'').length))} fontWeight="bold" fill={color}>{p.text}</SvgText></>}
 {p.kind==='doodle'&&p.drawing?.map((d,i)=><React.Fragment key={i}><Path d={pathOf(d.points)} stroke={d.color} strokeWidth={d.width} strokeLinecap="round" strokeLinejoin="round" fill="none"/>{d.points.length===1&&<Circle cx={d.points[0].x} cy={d.points[0].y} r={d.width/2} fill={d.color}/>}</React.Fragment>)}
 </Svg>;
}
export function FramedPhoto({piece,width,height}:{piece:Piece;width:number;height:number}){
 const border=Math.min(width,height)*(piece.frame==='torn'?.028:.018);
 const bottom=piece.frame==='polaroid'?Math.min(width,height)*(piece.caption?.trim()?0.09:0.05):border;
 const scale=Math.min((width-border*2)/piece.width,(height-bottom-border)/piece.height);
 const w=piece.width*scale,h=piece.height*scale;
 const paperW=w+border*2,paperH=h+border+bottom;
 // Draw the paper silhouette itself, with transparent space beyond each torn edge.
 const points:{x:number;y:number}[]=[];
 const count=32,depth=border*.72;
 for(let edge=0;edge<4;edge++)for(let i=0;i<count;i++){
  const t=i/count,notch=depth*(.12+((i*17+edge*11)%23)/26);
  points.push(edge===0?{x:t*paperW,y:notch}:edge===1?{x:paperW-notch,y:t*paperH}:edge===2?{x:(1-t)*paperW,y:paperH-notch}:{x:notch,y:(1-t)*paperH});
 }
 const outline=points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' ')+' Z';
 return <View style={{width,height,alignItems:'center',justifyContent:'center'}}><View style={{width:paperW,height:paperH,backgroundColor:piece.frame==='torn'?'transparent':piece.frame==='film'?'#29242A':'#FFFDF8',padding:border,alignItems:'center',justifyContent:'flex-start'}}>{piece.frame==='torn'&&<Svg pointerEvents="none" width={paperW} height={paperH} style={{position:'absolute',left:0,top:0}} viewBox={`0 0 ${paperW} ${paperH}`}><Path d={outline} fill="#FFFDF8" stroke="#D6CCBD" strokeWidth={.45} strokeLinejoin="round"/></Svg>}<View style={{width:w,height:h,zIndex:1}}><Photo piece={piece} width={w} height={h}/></View>{piece.frame==='polaroid'&&!!piece.caption&&<Text numberOfLines={1} adjustsFontSizeToFit style={{fontSize:bottom*.43,lineHeight:bottom*.65,color:'#71545F',marginTop:bottom*.07}}>{piece.caption}</Text>}{piece.frame==='film'&&Array.from({length:8},(_,i)=><React.Fragment key={i}><View style={{position:'absolute',left:1,top:paperH*(i+.3)/8,width:border*.5,height:paperH*.045,backgroundColor:'#FFFDF8'}}/><View style={{position:'absolute',right:1,top:paperH*(i+.3)/8,width:border*.5,height:paperH*.045,backgroundColor:'#FFFDF8'}}/></React.Fragment>)}</View></View>;
}
