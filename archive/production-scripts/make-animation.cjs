const sharp=require('C:/Users/piman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');
(async()=>{
 const src='C:/Users/piman/.codex/generated_images/01a080bf-2283-7f02-81d0-81117a951b58/exec-f5e2458d-31b5-4624-8504-5cea0f814643.png';
 const frames=[];
 for(let i=0;i<6;i++){
  const col=i%3,row=Math.floor(i/3);
  const raw=await sharp(src).extract({left:col*512,top:row*512,width:512,height:512}).removeAlpha().raw().toBuffer();
  let minx=512,miny=512,maxy=0;
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){let p=(y*512+x)*3;if(raw[p]<100&&raw[p+1]<80&&raw[p+2]<110){minx=Math.min(minx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);}}
  const top=Math.max(0,miny-4),left=Math.max(0,minx-4),h=maxy-top+5,w=Math.min(380,512-left);
  const tile=await sharp(raw,{raw:{width:512,height:512,channels:3}}).extract({left,top,width:w,height:h}).resize({height:400}).png().toBuffer();
  const meta=await sharp(tile).metadata();
  frames.push(await sharp({create:{width:512,height:512,channels:3,background:'#ffffff'}}).composite([{input:tile,left:72,top:52}]).removeAlpha().raw().toBuffer());
 }
 const order=[0,1,2,3,4,5,1,0];
 const delays=[650,180,90,130,90,250,160,650];
 fs.mkdirSync('outputs',{recursive:true});
 await sharp(Buffer.concat(order.map(i=>frames[i])),{raw:{width:512,height:512*order.length,channels:3,pageHeight:512}}).gif({loop:0,delay:delays,effort:7,dither:0}).toFile('outputs/maeum-avatar-wave-v1.gif');
 await sharp(frames[0],{raw:{width:512,height:512,channels:3}}).png().toFile('work/animation-preview.png');
 const result=await sharp('outputs/maeum-avatar-wave-v1.gif',{animated:true}).metadata();console.log(JSON.stringify({width:result.width,pageHeight:result.pageHeight,pages:result.pages,delay:result.delay,size:fs.statSync('outputs/maeum-avatar-wave-v1.gif').size}));
})();

