import React,{useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DiaryPage,PaperKind} from './model';
import {DayPreview} from './Canvas';
const colors=[['크림','#FFFDF8'],['벚꽃','#F8E4EA'],['세이지','#E4EDDE'],['하늘','#E3EDF5'],['라벤더','#EEE5F5'],['살구','#F7E6D5']];
export function BackgroundEditor({initial,date,paper,onClose,onSave}:{initial:DiaryPage;date:string;paper:string;onClose:()=>void;onSave:(page:DiaryPage)=>Promise<void>}){
 const [page,setPage]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const button=(label:string,action:()=>void,selected=false)=><Pressable accessibilityRole="button" accessibilityState={{selected,disabled:busy}} disabled={busy} onPress={action} style={{padding:13,minHeight:44,borderRadius:12,backgroundColor:selected?'#876675':'#EEE7E5'}}><Text style={{color:selected?'white':'#71545F',fontWeight:'600'}}>{label}</Text></Pressable>;
 return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{if(!busy)onClose();}}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><ScrollView contentContainerStyle={{padding:20,gap:18,maxWidth:560,width:'100%',alignSelf:'center'}}>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:22,fontWeight:'700',color:'#503B46'}}>배경 설정</Text>{button('취소',onClose)}</View>
 <Text style={{color:'#71545F'}}>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일</Text>
 <DayPreview pieces={page.pieces} paper={paper} paperKind={page.paper} paperColor={page.color}/>
 <Text style={{fontWeight:'700',color:'#503B46'}}>종이 패턴</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(['plain','grid','lined','kraft'] as PaperKind[]).map((kind,i)=><View key={kind}>{button(['무지','모눈','줄노트','크라프트'][i],()=>setPage({...page,paper:kind}),page.paper===kind)}</View>)}</View>
 <Text style={{fontWeight:'700',color:'#503B46'}}>배경 색상</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{button('기본 색상',()=>setPage({...page,color:undefined}),!page.color)}{colors.map(([label,color])=><Pressable key={color} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:page.color===color,disabled:busy}} disabled={busy} onPress={()=>setPage({...page,color})} style={{minWidth:85,minHeight:48,padding:12,borderRadius:12,backgroundColor:color,borderWidth:2,borderColor:page.color===color?'#876675':'transparent'}}><Text style={{color:'#503B46'}}>{label}{page.color===color?' ✓':''}</Text></Pressable>)}</View>
 {!!error&&<Text accessibilityRole="alert" style={{color:'#A55063'}}>{error}</Text>}
 {button(busy?'저장 중…':'적용',()=>{setBusy(true);setError('');void onSave(page).then(onClose).catch(()=>setError('저장하지 못했어요. 다시 시도해 주세요.')).finally(()=>setBusy(false));},true)}
 </ScrollView></SafeAreaView></Modal>;
}
