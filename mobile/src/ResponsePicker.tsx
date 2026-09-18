import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { responses } from './model';

export function ResponsePicker({ initial, onSave, onClose }: { initial: string; onSave: (response: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial);
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.top}><Text style={s.tag}>상대에게 한마디</Text><Pressable accessibilityRole="button" onPress={onClose} style={s.button}><Text>취소</Text></Pressable></View>
        <Text style={s.title}>남기고 싶은 말이 있어?</Text>
        <Text style={s.hint}>원하는 반응을 골라봐. 직접 적어도 좋아.</Text>
        <View style={s.options}>{responses.map(response => <Pressable key={response} accessibilityRole="radio" accessibilityState={{ checked: text === response }} onPress={() => setText(text === response ? '' : response)} style={[s.option, text === response && s.selected]}><Text style={s.label}>{response}{text === response ? '  ✓' : ''}</Text></Pressable>)}</View>
        <Text style={s.label}>내 말로 남기기</Text>
        <TextInput accessibilityLabel="원하는 반응 직접 입력" value={text} onChangeText={setText} maxLength={80} placeholder="예: 오늘 저녁에 같이 산책하고 싶어" placeholderTextColor="#9B929F" multiline style={s.input} />
        <Text style={s.count}>{text.length}/80</Text>
        <Pressable accessibilityRole="button" onPress={() => onSave(text.trim())} style={[s.button, s.primary]}><Text style={s.primaryText}>{text.trim() ? '한마디 남기기' : '한마디 지우기'}</Text></Pressable>
        {!!text.trim() && <Pressable accessibilityRole="button" onPress={() => onSave('')} style={s.button}><Text style={s.hint}>지금은 필요 없어요 · 지우기</Text></Pressable>}
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCFBF8' }, content: { padding: 24, width: '100%', maxWidth: 480, alignSelf: 'center', paddingBottom: 40 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, tag: { color: '#77629F', fontWeight: '700' }, title: { fontSize: 25, fontWeight: '800', color: '#302C43', marginTop: 20 }, hint: { color: '#82758E', fontSize: 13, lineHeight: 21, marginTop: 8 },
  options: { gap: 9, marginVertical: 25 }, option: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5DEEB', backgroundColor: '#FFF' }, selected: { borderColor: '#77629F', backgroundColor: '#EFE9F8' }, label: { fontSize: 14, color: '#554361', lineHeight: 21 },
  input: { marginTop: 10, padding: 16, minHeight: 95, textAlignVertical: 'top', borderWidth: 1, borderColor: '#DCD3E6', borderRadius: 16, color: '#302C43', backgroundColor: '#FFF', fontSize: 15 }, count: { textAlign: 'right', color: '#94869E', fontSize: 11, marginTop: 7, marginBottom: 20 }, button: { padding: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, primary: { backgroundColor: '#77629F', borderRadius: 18 }, primaryText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
