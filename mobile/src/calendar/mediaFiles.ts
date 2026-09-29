import * as FS from 'expo-file-system/legacy';
import { createVideoPlayer } from 'expo-video';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { photoUri } from './storage';
import { uid, validateVideoDuration } from './model';

export async function resolveMedia(source: string) { return {uri:photoUri(source),dispose:()=>{}}; }
export async function importMotion(asset: ImagePickerAsset, kind:'gif'|'video') {
  const info=await FS.getInfoAsync(asset.uri);
  if(!info.exists) throw new Error('파일을 찾지 못했어. 다시 선택해 줘.');
  if(info.size>30*1024*1024) throw new Error('30MB 이하 파일을 선택해 줘.');
  let duration:number|undefined; let poster:string|undefined;
  let width=asset.width,height=asset.height;
  if(kind==='video') {
    const player=createVideoPlayer(null);
    try {
      // Subscribe before loading, including a timeout for inaccessible iCloud files.
      await new Promise<void>((resolve,reject)=>{
        const timer=setTimeout(()=>{sub.remove();reject(new Error('영상을 읽는 데 너무 오래 걸려. 기기에 다운로드한 파일을 선택해 줘.'));},20000);
        const sub=player.addListener('statusChange',({status})=>{
          if(status==='readyToPlay'||status==='error') {clearTimeout(timer);sub.remove();status==='readyToPlay'?resolve():reject(new Error('재생할 수 없는 영상이야. MP4 영상을 선택해 줘.'));}
        });
        player.replaceAsync(asset.uri).catch(e=>{clearTimeout(timer);sub.remove();reject(e);});
      });
      duration=player.duration;validateVideoDuration(duration);
      const [thumb]=await player.generateThumbnailsAsync(0,{maxWidth:480,maxHeight:480});
      width=width||thumb.width;height=height||thumb.height;
      const context=ImageManipulator.manipulate(thumb);
      const image=await context.renderAsync();
      const output=await image.saveAsync({format:SaveFormat.JPEG,compress:.75,base64:true});
      poster=`data:image/jpeg;base64,${output.base64}`;
      context.release();image.release();thumb.release();
    } finally {player.release();}
  }
  if(!width||!height) throw new Error('미디어 크기를 읽지 못했어. 다른 파일을 선택해 줘.');
  if(!FS.documentDirectory) throw new Error('기기 저장 공간을 열지 못했어.');
  const dir=`${FS.documentDirectory}calendar-photos/`;
  await FS.makeDirectoryAsync(dir,{intermediates:true});
  const ext=kind==='gif'?'gif':(/\.mov(?:$|\?)/i.test(asset.fileName??asset.uri)?'mov':'mp4');
  const source=`${uid()}.${ext}`;
  await FS.copyAsync({from:asset.uri,to:dir+source});
  return {source,width,height,duration,poster};
}
