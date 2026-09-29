import { PhotoTone } from './model';
export const tones:{id:PhotoTone;label:string}[]=[{id:'original',label:'원본'},{id:'warm',label:'따뜻하게'},{id:'vivid',label:'선명하게'},{id:'soft',label:'부드럽게'},{id:'mono',label:'흑백'}];
const identity=[1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
const matrices:Record<PhotoTone,number[]>={
  original:identity,
  warm:[1.06,0,0,0,.025, 0,1.01,0,0,.008, 0,0,.9,0,0, 0,0,0,1,0],
  vivid:[1.25,-.08,-.02,0,-.06, -.03,1.2,-.02,0,-.06, -.03,-.08,1.26,0,-.06, 0,0,0,1,0],
  soft:[.86,0,0,0,.09, 0,.86,0,0,.08, 0,0,.89,0,.08, 0,0,0,1,0],
  mono:[.213,.715,.072,0,0, .213,.715,.072,0,0, .213,.715,.072,0,0, 0,0,0,1,0],
};
export function toneMatrix(tone:PhotoTone='original',intensity=1) {return identity.map((v,i)=>v+(matrices[tone][i]-v)*intensity).join(' ');}
