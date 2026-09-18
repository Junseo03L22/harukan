const sharp=require('C:/Users/piman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs=require('fs');
const root='outputs/maeum-avatar-wave-v1.gif';
const W=512,H=512,S=128,G=32;
function flow(a,b){
 const out=new Float32Array(G*G*2);
 for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){
 const x=gx*4+2,y=gy*4+2; let best=Infinity,bx=0,by=0;
 for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
 let cost=0,n=0;
 for(let py=-4;py<=4;py+=2)for(let px=-4;px<=4;px+=2){let xx=x+px,yy=y+py,tx=xx+dx,ty=yy+dy;if(xx<0||yy<0||xx>=S||yy>=S||tx<0||ty<0||tx>=S||ty>=S)continue;cost+=Math.abs(a[yy*S+xx]-b[ty*S+tx]);n++;}
 cost=cost/Math.max(n,1)+.6*(dx*dx+dy*dy);if(cost<best){best=cost;bx=dx;by=dy;}}
 let i=(gy*G+gx)*2;out[i]=bx*4;out[i+1]=by*4;
 }
 const sm=new Float32Array(out.length);
 for(let y=0;y<G;y++)for(let x=0;x<G;x++)for(let c=0;c<2;c++){let sum=0,n=0;for(let yy=Math.max(0,y-1);yy<=Math.min(G-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(G-1,x+1);xx++){sum+=out[(yy*G+xx)*2+c];n++;}sm[(y*G+x)*2+c]=sum/n;}
 return sm;
}
function field(f,x,y,c){const xx=Math.max(0,Math.min(G-1,x/16-.5)),yy=Math.max(0,Math.min(G-1,y/16-.5));let x0=Math.floor(xx),y0=Math.floor(yy),x1=Math.min(G-1,x0+1),y1=Math.min(G-1,y0+1),u=xx-x0,v=yy-y0;return (f[(y0*G+x0)*2+c]*(1-u)+f[(y0*G+x1)*2+c]*u)*(1-v)+(f[(y1*G+x0)*2+c]*(1-u)+f[(y1*G+x1)*2+c]*u)*v;}
function pixel(a,x,y,c){x=Math.max(0,Math.min(W-1,x));y=Math.max(0,Math.min(H-1,y));let x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(W-1,x0+1),y1=Math.min(H-1,y0+1),u=x-x0,v=y-y0;return (a[(y0*W+x0)*3+c]*(1-u)+a[(y0*W+x1)*3+c]*u)*(1-v)+(a[(y1*W+x0)*3+c]*(1-u)+a[(y1*W+x1)*3+c]*u)*v;}
(async()=>{
 const frames=[],gray=[];
 for(let i=0;i<8;i++){frames.push(await sharp(root,{page:i,pages:1}).removeAlpha().raw().toBuffer());gray.push(await sharp(root,{page:i,pages:1}).resize(S,S).greyscale().raw().toBuffer());}
 const starts=[0,650,830,920,1050,1140,1390,1550,2200],out=[];
 const fwd=[],back=[];for(let i=0;i<8;i++){fwd.push(flow(gray[i],gray[(i+1)%8]));back.push(flow(gray[(i+1)%8],gray[i]));}
 for(let t=0;t<2200;t+=50){let i=0;while(i<7&&t>=starts[i+1])i++;let end=starts[i+1],begin=Math.max(starts[i],end-150),u=Math.max(0,Math.min(1,(t-begin)/(end-begin)));if(u===0){out.push(frames[i]);continue;}u=u*u*(3-2*u);let a=frames[i],b=frames[(i+1)%8],buf=Buffer.alloc(W*H*3);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let dx=field(fwd[i],x,y,0),dy=field(fwd[i],x,y,1),rx=field(back[i],x,y,0),ry=field(back[i],x,y,1);for(let c=0;c<3;c++)buf[(y*W+x)*3+c]=Math.round(pixel(a,x-u*dx,y-u*dy,c)*(1-u)+pixel(b,x-(1-u)*rx,y-(1-u)*ry,c)*u);}out.push(buf);}
 await sharp(Buffer.concat(out),{raw:{width:W,height:H*out.length,channels:3,pageHeight:H}}).gif({loop:0,delay:Array(out.length).fill(50),dither:0,effort:7}).toFile('outputs/maeum-avatar-wave-v2-20fps.gif');
 await sharp(out[15],{raw:{width:W,height:H,channels:3}}).png().toFile('work/interpolation-check.png');
 const m=await sharp('outputs/maeum-avatar-wave-v2-20fps.gif',{animated:true}).metadata();console.log(JSON.stringify({pages:m.pages,totalMs:m.delay.reduce((a,b)=>a+b,0),delay:m.delay,size:fs.statSync('outputs/maeum-avatar-wave-v2-20fps.gif').size}));
})();

