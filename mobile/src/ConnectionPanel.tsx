import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from './Avatar';
import { avatars, moods, Profile } from './model';
import { ageLabel } from './connection';
import { useConnection } from './useConnection';

type Connection = ReturnType<typeof useConnection>;
export function DuoStage({ profile, connection, restart, onPressSelf }: { profile: Profile; connection: Connection; restart: number; onPressSelf: () => void }) {
  const partner = connection.snapshot?.partner;
  if (!partner) return null;
  return <View style={s.duo}>
    <View style={s.duoHeading}><Text style={s.duoTitle}>우리의 지금</Text><Text style={s.duoSub}>같은 하루, 각자의 상태</Text></View>
    <View style={s.duoRow}>{[{ p: profile, own: true }, { p: partner, own: false }].map(({ p, own }) => {
      const character = avatars.find(a => a.id === p.avatar)!; const mood = moods.find(m => m.id === p.mood)!;
      return <View key={own ? 'me' : 'partner'} style={[s.person, { backgroundColor: mood.color }]}>
        <Text style={s.personLabel}>{own ? '나' : '상대'} · {character.name}</Text>
        {own ? <Pressable accessibilityRole="button" accessibilityLabel="내 아바타 움직임 다시 보기" onPress={onPressSelf}><Avatar id={p.avatar} mood={p.mood} size={130} motion restart={restart} /></Pressable>
          : <Avatar id={p.avatar} mood={p.mood} size={130} motion restart={p.updatedAt} />}
        <Text style={s.personMood}>{mood.label}</Text>
        <Text style={{ color: '#665476', fontSize: 12, lineHeight: 19, textAlign: 'center', paddingHorizontal: 10, marginTop: 10 }}>{p.response || '상태만 남겼어'}</Text>
        {!own && <Pressable accessibilityRole="button" disabled={connection.busy || connection.state !== 'live' || partner.acknowledgedAt != null || !connection.snapshot?.connectionId} onPress={() => { if (connection.snapshot?.connectionId) void connection.acknowledge(partner.stateId, connection.snapshot.connectionId); }} style={[s.primary, { marginTop: 12, padding: 10, minHeight: 44 }, (connection.busy || connection.state !== 'live') && s.disabled]}><Text style={s.primaryText}>{partner.acknowledgedAt != null ? '✓ 알겠다고 보냈어' : connection.busy ? '보내는 중…' : '알겠어'}</Text></Pressable>}
        <Text style={s.age}>{own && !connection.synced ? '전달 대기 중' : ageLabel(own ? connection.snapshot!.me.updatedAt : p.updatedAt, connection.now)}</Text>
      </View>;
    })}</View>
    {connection.error ? <Text accessibilityRole="alert" style={s.error}>{connection.error}</Text> : null}
    <Text style={s.duoFoot}>{connection.state !== 'live' ? '연결 확인 중 · 상대는 마지막으로 받은 상태야' : connection.now - partner.updatedAt >= 21600000 ? '상대가 상태를 바꾼 지 오래됐어. 지금과 다를 수 있어.' : '내 상태를 바꾸면 연결된 상대에게 전달돼'}</Text>
  </View>;
}

export function ConnectionPanel({ connection }: { connection: Connection }) {
  const [open, setOpen] = useState(false); const [code, setCode] = useState(''); const [confirm, setConfirm] = useState(false);
  const connected = !!connection.snapshot?.partner;
  const invite = connection.snapshot?.invite;
  const left = invite ? Math.max(0, Math.ceil((invite.expiresAt - connection.now) / 1000)) : 0;
  const online = connection.state === 'live';
  const show = () => { setOpen(true); setConfirm(false); connection.clearError(); };
  const close = () => { setOpen(false); setConfirm(false); };
  async function share() { if (invite) { try { await Share.share({ message: `마음사이에서 내 상태를 함께 보자. 초대 코드: ${invite.code.slice(0,4)}-${invite.code.slice(4)} (10분 동안 유효)` }); } catch {} } }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={connected ? '연결 관리' : '상대와 연결하기'} onPress={show} style={s.banner}>
      <Text style={s.linkIcon}>↔</Text><View style={{ flex: 1 }}><Text style={s.bannerTitle}>{connected ? '둘의 상태가 이어졌어' : '누구와 하루를 함께 볼까?'}</Text><Text style={s.bannerSub}>{connected ? online ? '연결됨 · 상태 공유 중' : '연결 확인 중 · 마지막 상태 표시' : '초대 코드로 한 사람과 연결하기'}</Text></View><Text style={s.arrow}>›</Text>
    </Pressable>
    {connection.state !== 'live' && <View style={s.network}><Text style={s.networkText}>{connection.state === 'setup' ? '연결 기능을 준비하고 있어' : connection.state === 'connecting' ? '연결을 확인하는 중…' : '연결이 끊겼어. 내 상태는 기기에 남아 있어.'}</Text><Pressable accessibilityRole="button" onPress={connection.retry} style={s.retry}><Text style={s.retryText}>다시 연결</Text></Pressable></View>}
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={s.safe}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modal}>
        <View style={s.modalTop}><Text style={s.modalEyebrow}>TOGETHER</Text><Pressable accessibilityRole="button" accessibilityLabel="연결 화면 닫기" onPress={close} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
        <Text style={s.title}>{connected ? '우리, 연결됐어' : '서로의 지금을\n함께 보는 사이'}</Text>
        <Text style={s.description}>{connected ? '서로의 캐릭터, 상태와 원하는 반응을 공유해.\n언제든 상태 공유를 멈출 수 있어.' : '한 명이 코드를 만들고, 다른 한 명이 입력해.\n연결하면 서로의 캐릭터와 상태를 볼 수 있어.'}</Text>
        {connection.error ? <Text accessibilityRole="alert" style={s.error}>{connection.error}</Text> : null}
        {connected ? <>
          <View style={s.connectedCard}><Text style={s.connectedSymbol}>↔</Text><Text style={s.connectedTitle}>이제 홈에서 함께 볼 수 있어</Text><Text style={s.description}>상대의 상태가 바뀌면 여기도 바뀌어.</Text></View>
          <Pressable accessibilityRole="button" onPress={close} style={s.primary}><Text style={s.primaryText}>우리 상태 보러 가기 →</Text></Pressable>
          {!confirm ? <Pressable accessibilityRole="button" onPress={() => setConfirm(true)} style={s.secondary}><Text style={s.secondaryText}>연결 해제</Text></Pressable> : <View style={s.confirmBox}><Text style={s.confirmText}>서로의 상태 공유를 멈출까?{ '\n' }다시 연결하려면 새 초대 코드가 필요해.</Text><View style={s.confirmRow}><Pressable accessibilityRole="button" disabled={connection.busy} onPress={() => setConfirm(false)} style={s.secondary}><Text style={s.secondaryText}>유지하기</Text></Pressable><Pressable accessibilityRole="button" disabled={connection.busy} onPress={async () => { if (await connection.disconnect()) setConfirm(false); }} style={s.secondary}><Text style={s.danger}>{connection.busy ? '해제 중…' : '공유 중단하기'}</Text></Pressable></View></View>}
        </> : <>
          <View style={s.inviteCard}><Text style={s.cardLabel}>내가 초대하기</Text><Text style={s.cardDescription}>아래 코드를 상대에게 알려줘.</Text>
            {invite ? <><Text selectable style={s.code}>{invite.code.slice(0,4)} {invite.code.slice(4)}</Text><Text style={[s.expiry, !left && s.danger]}>{left ? `${Math.floor(left / 60)}분 ${String(left % 60).padStart(2,'0')}초 남았어 · 한 번만 사용 가능` : '코드가 만료됐어. 새 코드를 만들어 줘.'}</Text>
              <Pressable accessibilityRole="button" disabled={connection.busy} onPress={left ? share : connection.createInvite} style={s.primary}><Text style={s.primaryText}>{left ? '초대 코드 공유하기' : '새 코드 만들기'}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={connection.busy} onPress={connection.cancelInvite} style={s.secondary}><Text style={s.secondaryText}>초대 취소</Text></Pressable></> : <Pressable accessibilityRole="button" disabled={connection.busy} onPress={connection.createInvite} style={[s.primary, connection.busy && s.disabled]}><Text style={s.primaryText}>{connection.busy ? '잠깐만…' : '초대 코드 만들기'}</Text></Pressable>}
          </View>
          <View style={s.divider}><View style={s.line}/><Text style={s.or}>또는</Text><View style={s.line}/></View>
          <Text style={s.cardLabel}>초대받았어</Text><Text style={s.cardDescription}>상대가 알려준 8자리 코드를 입력해.</Text>
          <TextInput accessibilityLabel="초대 코드 8자리" value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0,8))} autoCapitalize="characters" autoCorrect={false} placeholder="ABCD2345" placeholderTextColor="#BEB5C8" maxLength={9} style={s.input} returnKeyType="done" />
          <Pressable accessibilityRole="button" disabled={connection.busy || code.length !== 8} onPress={() => connection.join(code)} style={[s.join, (connection.busy || code.length !== 8) && s.disabled]}><Text style={s.joinText}>{connection.busy ? '확인 중…' : '이 코드로 연결하기'}</Text></Pressable>
          <Text style={s.footnote}>코드는 연결할 사람에게만 알려줘.{ '\n' }지금은 한 사람과 연결할 수 있어.</Text>
        </>}
      </ScrollView></SafeAreaView>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  banner: { flexDirection:'row', alignItems:'center', gap:12, borderWidth:1, borderColor:'#E8E0EF', backgroundColor:'#F5F0F9', borderRadius:19, padding:16, marginBottom:18 }, linkIcon:{fontSize:27,color:'#9B85B9'}, bannerTitle:{fontSize:13,fontWeight:'700',color:'#5A486E'}, bannerSub:{fontSize:10,color:'#9C8CA7',marginTop:5},arrow:{fontSize:24,color:'#9C8CA7'},
  network:{flexDirection:'row',alignItems:'center',gap:8,marginTop:-12,marginBottom:12},networkText:{flex:1,fontSize:11,color:'#A0856C'},retry:{padding:10},retryText:{fontSize:11,fontWeight:'700',color:'#8066A2'},
  duo:{borderRadius:26,backgroundColor:'#F0EAF8',padding:14},duoHeading:{paddingHorizontal:5,paddingVertical:8,marginBottom:10},duoTitle:{fontSize:16,fontWeight:'800',color:'#4A3C60'},duoSub:{fontSize:11,color:'#95869F',marginTop:5},duoRow:{flexDirection:'row',gap:10},person:{flex:1,alignItems:'center',borderRadius:20,paddingVertical:17,overflow:'hidden'},personLabel:{fontSize:12,fontWeight:'600',color:'#756682'},personMood:{fontSize:15,fontWeight:'800',color:'#4B3F5C'},age:{fontSize:10,color:'#95899D',marginTop:8},duoFoot:{fontSize:10,textAlign:'center',color:'#9688A0',lineHeight:16,marginTop:14,marginBottom:4},
  safe:{flex:1,backgroundColor:'#FCFBF8'},modal:{width:'100%',maxWidth:480,alignSelf:'center',padding:24,paddingBottom:40},modalTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20},modalEyebrow:{fontSize:10,letterSpacing:2,fontWeight:'700',color:'#9786A9'},close:{width:44,height:44,borderRadius:22,backgroundColor:'#F1ECEF',justifyContent:'center',alignItems:'center'},closeText:{fontSize:26,color:'#88768D'},title:{fontSize:30,lineHeight:40,fontWeight:'800',letterSpacing:-1,color:'#392E47'},description:{fontSize:13,lineHeight:22,color:'#978B9D',marginTop:12,marginBottom:22},inviteCard:{backgroundColor:'#F0EAF8',borderRadius:24,padding:22,marginTop:4},cardLabel:{fontSize:15,fontWeight:'700',color:'#52415E'},cardDescription:{fontSize:12,color:'#97859D',marginTop:8,marginBottom:17},code:{fontSize:31,letterSpacing:3,fontWeight:'800',color:'#705A8F',textAlign:'center',marginTop:8},expiry:{fontSize:10,color:'#9D8CAA',textAlign:'center',marginTop:12,marginBottom:22},primary:{backgroundColor:'#7C65A2',minHeight:52,borderRadius:16,padding:14,alignItems:'center',justifyContent:'center'},primaryText:{fontSize:14,fontWeight:'700',color:'#FFF'},secondary:{padding:15,alignItems:'center',minHeight:44},secondaryText:{fontSize:12,color:'#A18EA9'},divider:{flexDirection:'row',alignItems:'center',gap:16,marginVertical:26},line:{flex:1,height:1,backgroundColor:'#ECE5ED'},or:{fontSize:11,color:'#B1A3B7'},input:{borderWidth:1.5,borderColor:'#E5DDEB',backgroundColor:'#FFF',borderRadius:16,fontSize:21,fontWeight:'700',letterSpacing:3,color:'#635173',padding:16,textAlign:'center',minHeight:58},join:{borderWidth:1.5,borderColor:'#8E75AD',borderRadius:16,minHeight:52,justifyContent:'center',alignItems:'center',marginTop:12},joinText:{fontSize:14,color:'#7C65A2',fontWeight:'700'},disabled:{opacity:0.4},footnote:{fontSize:11,color:'#AF9FB7',lineHeight:19,textAlign:'center',marginTop:24},error:{padding:14,marginBottom:16,backgroundColor:'#FAE8EE',color:'#A75670',borderRadius:12,fontSize:12,lineHeight:19},connectedCard:{padding:28,alignItems:'center',backgroundColor:'#F0EAF8',borderRadius:24,marginVertical:15},connectedSymbol:{fontSize:64,color:'#AC96C5'},connectedTitle:{fontSize:16,fontWeight:'700',color:'#705981',marginTop:16},confirmBox:{padding:15,marginTop:15,backgroundColor:'#F7ECF0',borderRadius:16},confirmText:{fontSize:12,color:'#916B7C',lineHeight:20},confirmRow:{flexDirection:'row',justifyContent:'space-between'},danger:{color:'#AE607B',fontSize:12},
});
