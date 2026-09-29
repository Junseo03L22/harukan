import React,{useState} from 'react';
import { KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Switch,Text,TextInput,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Schedule,uid,validateSchedule } from './model';
export function ScheduleEditor({date,event,onSave,onDelete,onClose}:{date:string;event?:Schedule;onSave:(event:Schedule)=>Promise<void>;onDelete:()=>Promise<void>;onClose:()=>void}) {
 const [title,setTitle]=useState(event?.title??''),[note,setNote]=useState(event?.note??''),[time,setTime]=useState(event?.time??'09:00'),[allDay,setAllDay]=useState(!event?.time);
 const [style,setStyle]=useState<Schedule['style']>(event?.style??'plain'),[done,setDone]=useState(event?.done??false);
 const [id]=useState(()=>event?.id??uid());const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const button=(label:string,fn:()=>void)=><Pressable accessibilityRole="button" disabled={busy} onPress={fn} style={{backgroundColor:'#EEE7E5',padding:15,borderRadius:12,opacity:busy?.5:1}}><Text style={{color:'#71545F',textAlign:'center'}}>{label}</Text></Pressable>;
 async function save(){const next:Schedule={id,title:title.trim(),note:note.trim(),time:allDay?null:time.trim(),style,done};try{validateSchedule(next);setBusy(true);setError('');await onSave(next);onClose();}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');}finally{setBusy(false);}}
 const field={borderWidth:1,borderColor:'#DED3D8',borderRadius:12,padding:14,color:'#503B46',fontSize:16} as const;
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose();}}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:24,gap:18,maxWidth:560,width:'100%',alignSelf:'center'}}>
 <Text style={{fontSize:24,fontWeight:'700',color:'#503B46'}}>{event?'일정 수정':'일정 추가'}</Text><Text>{date}</Text>
 <TextInput accessibilityLabel="일정 제목" placeholder="일정 제목" maxLength={80} value={title} onChangeText={setTitle} editable={!busy} style={field}/>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text>종일</Text><Switch accessibilityLabel="종일 일정" value={allDay} disabled={busy} onValueChange={setAllDay}/></View>
 {!allDay&&<TextInput accessibilityLabel="일정 시간" placeholder="시간 (예: 14:30)" maxLength={5} value={time} onChangeText={setTime} editable={!busy} style={field}/>}
 <TextInput accessibilityLabel="일정 메모" placeholder="메모" multiline maxLength={1000} value={note} onChangeText={setNote} editable={!busy} style={[field,{minHeight:120,textAlignVertical:'top'}]}/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['plain','label','highlight'] as const).map((value,i)=><View key={value}>{button(`${style===value?'✓ ':''}${['기본','라벨','형광펜'][i]}`,()=>setStyle(value))}</View>)}</View>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text>완료 체크</Text><Switch accessibilityLabel="일정 완료" value={done} onValueChange={setDone}/></View>
 {!!error&&<Text accessibilityRole="alert" style={{color:'#A55063'}}>{error}</Text>}
 {button(busy?'처리 중…':'저장',()=>void save())}{button('취소',onClose)}
 {event&&button('일정 삭제',()=>setConfirm(true))}
 {confirm&&<View style={{gap:12,padding:16,backgroundColor:'#F3E5E8',borderRadius:12}}><Text>이 일정을 삭제할까요?</Text>{button('삭제 확인',()=>{setBusy(true);void onDelete().then(onClose).catch(()=>setError('삭제하지 못했어요. 다시 시도해 주세요.')).finally(()=>setBusy(false));})}{button('유지',()=>setConfirm(false))}</View>}
 </ScrollView></KeyboardAvoidingView></SafeAreaView></Modal>;
}
