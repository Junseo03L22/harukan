import React,{useRef,useState} from 'react';
import {GestureResponderEvent,PanResponder,View} from 'react-native';
import {Piece,clamp,fitBox,pinchSize,resizePiece,stickers} from './model';
import {Collage,Photo,Sticker} from './Artwork';
import {MotionArt} from './Motion';
import {Paper,Decoration,FramedPhoto} from './DiaryArt';
export function Art({piece,width,height}:{piece:Piece;width:number;height:number}) {return ['text','tape','stamp','doodle'].includes(piece.kind)?<Decoration piece={piece} width={width} height={height}/>:piece.kind==='photo'&&piece.frame&&piece.frame!=='none'?<FramedPhoto piece={piece} width={width} height={height}/>:piece.kind==='collage'?<Collage piece={piece} width={width} height={height}/>:piece.kind==='gif'||piece.kind==='video'?<MotionArt piece={piece} width={width} height={height}/>:piece.kind==='photo'?<Photo piece={piece} width={width} height={height}/>:<Sticker id={piece.source as typeof stickers[number]['id']} size={Math.min(width,height)}/>;}
function ResizeHandle({x,y,onStart,onDrag,onEnd,onCancel}:{x:number;y:number;onStart:()=>void;onDrag:(dx:number,dy:number)=>void;onEnd:(dx:number,dy:number)=>void;onCancel:()=>void}) {
  const live=useRef({onStart,onDrag,onEnd,onCancel});live.current={onStart,onDrag,onEnd,onCancel};
  const pan=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>live.current.onStart(),
    onPanResponderMove:(_,g)=>live.current.onDrag(g.dx,g.dy),
    onPanResponderRelease:(_,g)=>live.current.onEnd(g.dx,g.dy),
    onPanResponderTerminate:()=>live.current.onCancel(),onPanResponderTerminationRequest:()=>false,
  })).current;
  return <View accessibilityLabel={`${y<0?'위':'아래'} ${x<0?'왼쪽':'오른쪽'} 크기 조절점`} {...pan.panHandlers} style={{position:'absolute',...(x<0?{left:0}:{right:0}),...(y<0?{top:0}:{bottom:0}),width:28,height:28,alignItems:x<0?'flex-start':'flex-end',justifyContent:y<0?'flex-start':'flex-end'}}><View style={{width:12,height:12,borderRadius:3,backgroundColor:'white',borderWidth:2,borderColor:'#9B6786'}}/></View>;
}
export function Layer({piece,side,active,onSelect=()=>{},onMove=()=>{},onResize=()=>{},onInteraction=()=>{},interactive=true}:{piece:Piece;side:number;active:boolean;onSelect?:()=>void;onMove?:(x:number,y:number)=>void;onResize?:(patch:Partial<Piece>)=>void;onInteraction?:(busy:boolean)=>void;interactive?:boolean}) {
  const [resized,setResized]=useState<Partial<Piece>|null>(null);
  const display={...piece,...resized};const box=fitBox(display.width,display.height,side*display.size);
  const live=useRef({piece,side,onSelect,onMove,onResize,onInteraction});live.current={piece,side,onSelect,onMove,onResize,onInteraction};
  const start=useRef({x:0,y:0});const resizeStart=useRef(piece);const [delta,setDelta]=useState({x:0,y:0});
  const pinch=useRef<{distance:number;size:number;x:number;y:number;next:number}|null>(null);
  const drag=useRef({x:0,y:0});
  function beginPinch(e:GestureResponderEvent) {
    const touches=e.nativeEvent.touches;
    if(touches.length<2||pinch.current)return;
    const c=live.current;
    const distance=Math.hypot(touches[1].pageX-touches[0].pageX,touches[1].pageY-touches[0].pageY);
    if(distance<1)return;
    const x=clamp(start.current.x+drag.current.x/c.side,.05,.95);
    const y=clamp(start.current.y+drag.current.y/c.side,.05,.95);
    pinch.current={distance,size:c.piece.size,x,y,next:c.piece.size};
    setDelta({x:0,y:0});setResized({size:c.piece.size,x,y});
  }
  const pan=useRef(PanResponder.create({
    onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:e=>{const c=live.current;pinch.current=null;drag.current={x:0,y:0};start.current={x:c.piece.x,y:c.piece.y};c.onSelect();c.onInteraction(true);beginPinch(e);},
    onPanResponderStart:e=>beginPinch(e),
    onPanResponderMove:(e,g)=>{
      beginPinch(e);
      const p=pinch.current;
      if(p){
        const touches=e.nativeEvent.touches;
        if(touches.length>=2){p.next=pinchSize(p.size,p.distance,Math.hypot(touches[1].pageX-touches[0].pageX,touches[1].pageY-touches[0].pageY));setResized({size:p.next,x:p.x,y:p.y});}
        // Keep the final pinch preview stable until both fingers are lifted.
      }else{drag.current={x:g.dx,y:g.dy};setDelta(drag.current);}
    },
    onPanResponderRelease:(_,g)=>{const c=live.current;const p=pinch.current;if(p)c.onResize({size:p.next,x:p.x,y:p.y});else c.onMove(clamp(start.current.x+g.dx/c.side,.05,.95),clamp(start.current.y+g.dy/c.side,.05,.95));pinch.current=null;setResized(null);setDelta({x:0,y:0});c.onInteraction(false);},
    onPanResponderTerminate:()=>{pinch.current=null;setResized(null);setDelta({x:0,y:0});live.current.onInteraction(false);},onPanResponderTerminationRequest:()=>false,
  })).current;
  return <View pointerEvents={piece.kind==='doodle'?'none':'auto'} accessibilityLabel="눌러 선택하고 끌어서 이동" style={{position:'absolute',left:display.x*side-box.width/2+delta.x,top:display.y*side-box.height/2+delta.y,width:box.width,height:box.height,transform:[{rotate:`${piece.rotation}deg`}]}} {...(interactive?pan.panHandlers:{})}>
    <View pointerEvents="none"><Art piece={piece} width={box.width} height={box.height}/></View>
    {active&&<><View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,borderWidth:1,borderColor:'#9B6786'}}/>
    {[-1,1].flatMap(x=>[-1,1].map(y=><ResizeHandle key={`${x}:${y}`} x={x} y={y}
      onStart={()=>{resizeStart.current=piece;onInteraction(true);}}
      onDrag={(dx,dy)=>setResized(resizePiece(resizeStart.current,side,x,y,dx,dy))}
      onEnd={(dx,dy)=>{onResize(resizePiece(resizeStart.current,side,x,y,dx,dy));setResized(null);onInteraction(false);}}
      onCancel={()=>{setResized(null);onInteraction(false);}}/>))}</>}
  </View>;
}
export function DayPreview({pieces,paper,paperKind,paperColor}:{pieces:Piece[];paper:string;paperColor?:string;paperKind?:import('./model').PaperKind}) {
  const [side,setSide]=useState(0);
  return <View pointerEvents="none" onLayout={e=>setSide(e.nativeEvent.layout.width)} style={{width:'100%',aspectRatio:1,overflow:'hidden',backgroundColor:paper,borderRadius:side*.035}}>
    <Paper kind={paperKind} color={paperColor}/>
    {side>0&&pieces.map(piece=><Layer key={piece.id} piece={piece} side={side} active={false} interactive={false}/>)}
  </View>;
}
