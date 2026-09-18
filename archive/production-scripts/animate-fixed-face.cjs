const sharp=require('C:/Users/piman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');
(async()=>{
const W=512,H=512;
const a=await sharp('C:/Users/piman/.codex/generated_images/01a080bf-2283-7f02-81d0-81117a951b58/exec-4122ab68-025a-4021-b740-61cf48a7478e.png').resize(W,H).removeAlpha().raw().toBuffer();
function smooth(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
function sample(x,y,c){x=Math.max(0,Math.min(W-1,x));y=Math.max(0,Math.min(H-1,y));let x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(W-1,x0+1),y1=Math.min(H-1,y0+1),u=x-x0,v=y-y0;return (a[(y0*W+x0)*3+c]*(1-u)+a[(y0*W+x1)*3+c]*u)*(1-v)+(a[(y1*W+x0)*3+c]*(1-u)+a[(y1*W+x1)*3+c]*u)*v;}
const frames=[];
for(let i=0;i<60;i++){
const t=i/20;const envelope=t<.3?0:t>2.3?0:Math.pow(Math.sin(Math.PI*(t-.3)/2),2);const swing=Math.sin(2*Math.PI*1.5*(t-.3))*envelope;
const f=Buffer.from(a);
for(let y=170;y<305;y++)for(let x=363;x<463;x++){
const weight=smooth((x-363)/32)*smooth((305-y)/75)*smooth((y-170)/28)*smooth((463-x)/24);
const sx=x-11*swing*weight,sy=y-7*swing*weight;
for(let c=0;c<3;c++)f[(y*W+x)*3+c]=Math.round(sample(sx,sy,c));
}
frames.push(f);
}
// The entire face lies outside the animated region; verify unchanged pixels.
for(const f of frames)for(let y=170;y<270;y++)for(let x=140;x<340;x++)for(let c=0;c<3;c++)if(f[(y*W+x)*3+c]!==a[(y*W+x)*3+c])throw Error('Face moved');
await sharp(Buffer.concat(frames),{raw:{width:W,height:H*frames.length,channels:3,pageHeight:H}}).gif({loop:0,delay:Array(frames.length).fill(50),dither:0,effort:7}).toFile('outputs/maeum-avatar-wave-v3-fixed-face.gif');
await sharp(frames[25],{raw:{width:W,height:H,channels:3}}).png().toFile('work/wave-v3-check.png');
const m=await sharp('outputs/maeum-avatar-wave-v3-fixed-face.gif',{animated:true}).metadata();console.log(JSON.stringify({face:'unchanged across all 60 source frames',pages:m.pages,duration:m.delay.reduce((a,b)=>a+b,0),bytes:fs.statSync('outputs/maeum-avatar-wave-v3-fixed-face.gif').size}));
})();
