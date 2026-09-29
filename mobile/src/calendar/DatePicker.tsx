import React,{useState} from 'react';
import { Modal,Pressable,ScrollView,Text,View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dateKey,monthCells } from './model';

export function DatePicker({date,onClose,onSelect}:{date:string;onClose:()=>void;onSelect:(key:string)=>void}) {
  const [year,setYear]=useState(Number(date.slice(0,4)));
  const [month,setMonth]=useState(Number(date.slice(5,7))-1);
  const [day,setDay]=useState(Number(date.slice(8)));
  const [page,setPage]=useState(Math.floor(year/12)*12);
  const actualDay=Math.min(day,new Date(year,month+1,0).getDate());
  const choose=(label:string,action:()=>void,selected=false)=><Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={action} style={{minHeight:44,padding:12,borderRadius:12,backgroundColor:selected?'#876675':'#EEE7E5',alignItems:'center',justifyContent:'center'}}><Text style={{color:selected?'white':'#71545F'}}>{label}</Text></Pressable>;
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:'#FCFAF6'}}><ScrollView contentContainerStyle={{padding:24,gap:18,maxWidth:560,width:'100%',alignSelf:'center'}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:24,fontWeight:'700'}}>날짜 선택</Text>{choose('닫기',onClose)}</View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>{choose('이전 12년',()=>setPage(Math.max(1900,page-12)))}<Text>{page}–{Math.min(2200,page+11)}</Text>{choose('다음 12년',()=>setPage(Math.min(2189,page+12)))}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{Array.from({length:12},(_,i)=>page+i).filter(y=>y>=1900&&y<=2200).map(y=><View key={y} style={{width:'23%'}}>{choose(`${y}년`,()=>setYear(y),year===y)}</View>)}</View>
    <Text style={{fontSize:18,fontWeight:'600'}}>{year}년</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{Array.from({length:12},(_,m)=><View key={m} style={{width:'23%'}}>{choose(`${m+1}월`,()=>setMonth(m),month===m)}</View>)}</View>
    <Text style={{fontSize:18,fontWeight:'600'}}>{year}년 {month+1}월 {actualDay}일</Text>
    <View style={{flexDirection:'row'}}>{['일','월','화','수','목','금','토'].map(d=><Text key={d} style={{width:'14.2857%',textAlign:'center'}}>{d}</Text>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{monthCells(year,month).map((key,i)=><View key={key??i} style={{width:'14.2857%',padding:2}}>{key&&choose(`${Number(key.slice(8))}`,()=>setDay(Number(key.slice(8))),Number(key.slice(8))===actualDay)}</View>)}</View>
    {choose('이 날짜 꾸미기',()=>onSelect(dateKey(new Date(year,month,actualDay))),true)}
    {choose('오늘',()=>onSelect(dateKey(new Date())))}
  </ScrollView></SafeAreaView></Modal>;
}
