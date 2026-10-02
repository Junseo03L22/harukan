import { ImagePickerAsset } from 'expo-image-picker';
import { uid, validateVideoDuration } from './model';

function openDB():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('maeumsai-media',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('files');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('브라우저 미디어 저장소를 열지 못했어.'));
  });
}
export async function writeBlob(key:string,blob:Blob) {
  const db=await openDB();
  try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put(blob,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('미디어 저장 공간이 부족해.'));tx.onerror=()=>reject(new Error('미디어를 저장하지 못했어.'));});}finally{db.close();}
}
export async function removeBlob(key:string) {
  const db=await openDB();
  try {await new Promise<void>((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').delete(key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('임시 파일을 정리하지 못했어요.'));tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
export async function resolveMedia(source:string) {
  if(!source.startsWith('media:'))return {uri:source,dispose:()=>{}};
  const db=await openDB();let blob:Blob;
  try {blob=await new Promise<Blob>((resolve,reject)=>{const r=db.transaction('files').objectStore('files').get(source);r.onsuccess=()=>r.result?resolve(r.result):reject(new Error('저장된 파일이 없어.'));r.onerror=()=>reject(r.error);});}finally{db.close();}
  const uri=URL.createObjectURL(blob);return {uri,dispose:()=>URL.revokeObjectURL(uri)};
}
export async function importMotion(asset:ImagePickerAsset,kind:'gif'|'video') {
  const blob=asset.file??await (await fetch(asset.uri)).blob();
  if(blob.size>30*1024*1024)throw new Error('30MB 이하 파일을 선택해 줘.');
  const uri=URL.createObjectURL(blob);
  let width=asset.width,height=asset.height,duration:number|undefined,poster:string|undefined;
  try {
    if(kind==='video') {
      const video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;
      try {
        await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('영상 정보를 읽지 못했어.')),15000);video.onloadeddata=()=>{clearTimeout(timer);resolve();};video.onerror=()=>{clearTimeout(timer);reject(new Error('이 브라우저에서 재생할 수 없는 영상이야. MP4를 선택해 줘.'));};video.src=uri;});
        duration=video.duration;validateVideoDuration(duration);width=video.videoWidth;height=video.videoHeight;
        const canvas=document.createElement('canvas');const scale=Math.min(1,480/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('미리보기를 만들지 못했어.');ctx.drawImage(video,0,0,canvas.width,canvas.height);poster=canvas.toDataURL('image/jpeg',.75);
      } finally {video.pause();video.removeAttribute('src');video.load();}
    } else {
      const image=new window.Image();
      await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('GIF 파일을 읽지 못했어.'));image.src=uri;});width=image.naturalWidth;height=image.naturalHeight;
    }
    if(!width||!height)throw new Error('미디어 크기를 읽지 못했어.');
    const source=`media:${uid()}`;await writeBlob(source,blob);
    return {source,width,height,duration,poster};
  } finally {URL.revokeObjectURL(uri);}
}
