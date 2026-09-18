const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/piman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve('mobile/assets/avatars');
fs.mkdirSync(root,{recursive:true});
const gen = 'C:/Users/piman/.codex/generated_images/01a080bf-2283-7f02-81d0-81117a951b58/';
const sheets = {
salgu: ['exec-11cb6ec7-8325-457d-a306-a6ba43b92f8a.png',[[640,160,260,310],[920,160,280,310],[1220,165,285,305],[630,545,275,315],[925,550,280,310],[1210,570,290,290]]],
pico: ['exec-15cd03f1-c535-4c3c-8f7b-9c54b751484a.png',[[635,180,270,260],[910,145,300,295],[1230,180,280,260],[610,530,290,290],[920,525,290,295],[1220,585,285,235]]],
moru: ['exec-e38d9328-a073-4d9c-8068-0cd3c70267a5.png',[[630,295,285,185],[925,250,285,235],[1210,320,295,160],[620,590,290,225],[925,565,280,250],[1210,625,295,190]]]
};
const states=['normal','happy','tired','focus','complex','rest'];
async function sprite(file,rect,out,kind) {
 const {data,info}=await sharp(file).extract({left:rect[0],top:rect[1],width:rect[2],height:rect[3]}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width:w,height:h}=info;const seen=new Uint8Array(w*h),queue=[];
 const push=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return;const p=y*w+x;if(seen[p])return;seen[p]=1;const i=p*4;const lo=Math.min(data[i],data[i+1],data[i+2]);const hi=Math.max(data[i],data[i+1],data[i+2]);if(lo>205 && hi-lo<45){data[i+3]=0;queue.push(p);}};
 for(let x=0;x<w;x++){push(x,0);push(x,h-1);}for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
 for(let n=0;n<queue.length;n++){const p=queue[n];push(p%w-1,Math.floor(p/w));push(p%w+1,Math.floor(p/w));push(p%w,Math.floor(p/w)-1);push(p%w,Math.floor(p/w)+1);}
 let l=w,t=h,r=0,b=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i+3] && Math.min(data[i],data[i+1],data[i+2])<195){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}}
 l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(w-1,r+2);b=Math.min(h-1,b+2);
 const limits={salgu:[270,290],pico:[280,260],moru:[300,220]}[kind];
 const buf=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize(limits[0],limits[1],{fit:'inside'}).png().toBuffer();
 const meta=await sharp(buf).metadata();const left=Math.round((384-meta.width)/2),top=338-meta.height;
 await sharp({create:{width:384,height:384,channels:4,background:'#00000000'}}).composite([{input:buf,left,top}]).png().toFile(out);
 console.log(path.basename(out),{left,top,width:meta.width,height:meta.height});
}
(async()=>{for(const [id,[file,rects]]of Object.entries(sheets)){for(let i=0;i<rects.length;i++)await sprite(gen+file,rects[i],path.join(root,`${id}-${states[i]}.png`),id);}
 if(process.argv[2]){const meta=await sharp(process.argv[2]).metadata();for(const [i,id]of ['salgu','pico','moru'].entries()){const col=Math.floor(meta.width/3);await sprite(process.argv[2],[i*col,0,col,meta.height],path.join(root,`${id}-base.png`),id);}}
})().catch(e=>{console.error(e);process.exit(1)});
