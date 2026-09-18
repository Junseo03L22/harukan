import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Image, View } from 'react-native';
import { AvatarId, MoodId, IDLE_DELAY } from './model';

const art = {
  salgu: { base: require('../assets/avatars/salgu-base.png'), normal: require('../assets/avatars/salgu-normal.png'), happy: require('../assets/avatars/salgu-happy.png'), tired: require('../assets/avatars/salgu-tired.png'), focus: require('../assets/avatars/salgu-focus.png'), complex: require('../assets/avatars/salgu-complex.png'), rest: require('../assets/avatars/salgu-rest.png') },
  pico: { base: require('../assets/avatars/pico-base.png'), normal: require('../assets/avatars/pico-normal.png'), happy: require('../assets/avatars/pico-happy.png'), tired: require('../assets/avatars/pico-tired.png'), focus: require('../assets/avatars/pico-focus.png'), complex: require('../assets/avatars/pico-complex.png'), rest: require('../assets/avatars/pico-rest.png') },
  moru: { base: require('../assets/avatars/moru-base.png'), normal: require('../assets/avatars/moru-normal.png'), happy: require('../assets/avatars/moru-happy.png'), tired: require('../assets/avatars/moru-tired.png'), focus: require('../assets/avatars/moru-focus.png'), complex: require('../assets/avatars/moru-complex.png'), rest: require('../assets/avatars/moru-rest.png') },
};
// Coordinates in the normalized 384 × 384 sprite, independent of display size.
const eyeMap = {
  salgu: { y: 156, xs: [144, 224], w: 15, h: 21, color: '#41213E' },
  pico: { y: 162, xs: [137, 214], w: 22, h: 30, color: '#FFF2D6' },
  moru: { y: 226, xs: [147, 221], w: 13, h: 19, color: '#282849' },
};

export function Avatar({ id, mood = 'normal', size = 270, motion = false, restart = 0, onPhase }: {
  id: AvatarId; mood?: MoodId; size?: number; motion?: boolean; restart?: number;
  onPhase?: (phase: 'still' | 'fidget' | 'reduced') => void;
}) {
  const eye = useRef(new Animated.Value(1)).current;
  const body = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [reduced, setReduced] = useState(false);
  const phaseRef = useRef(onPhase); phaseRef.current = onPhase;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (mounted) setReduced(v); }).catch(() => {});
    const a = AppState.addEventListener('change', s => setActive(s === 'active'));
    const r = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; a.remove(); r.remove(); };
  }, []);
  useEffect(() => {
    eye.setValue(1); body.setValue(0);
    phaseRef.current?.(reduced ? 'reduced' : 'still');
    if (!motion || !active || reduced) return;
    let blink: Animated.CompositeAnimation | undefined;
    let movement: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timing = (toValue: number, duration: number) => Animated.timing(body, { toValue, duration, useNativeDriver: true });
    if (mood === 'normal') {
      blink = Animated.loop(Animated.sequence([
        Animated.delay(1450), Animated.timing(eye, { toValue: 0.12, duration: 65, useNativeDriver: true }),
        Animated.timing(eye, { toValue: 1, duration: 85, useNativeDriver: true }), Animated.delay(1700),
      ]));
      blink.start();
      timer = setTimeout(() => {
        phaseRef.current?.('fidget');
        movement = Animated.loop(Animated.sequence([
          timing(1, id === 'pico' ? 550 : 700), Animated.delay(id === 'pico' ? 550 : 100),
          timing(-1, 1000), Animated.delay(id === 'pico' ? 700 : 100), timing(0, 700), Animated.delay(2800),
        ])); movement.start();
      }, IDLE_DELAY);
    } else if (mood === 'happy' || mood === 'rest' || mood === 'tired' || mood === 'complex') {
      movement = Animated.loop(Animated.sequence([timing(1, mood === 'happy' ? 450 : 1700), timing(0, mood === 'happy' ? 450 : 1700), Animated.delay(mood === 'happy' ? 800 : 1000)]));
      movement.start();
    }
    return () => { if (timer) clearTimeout(timer); blink?.stop(); movement?.stop(); eye.stopAnimation(); body.stopAnimation(); };
  }, [id, mood, motion, restart, reduced, active, body, eye]);
  const rotation = mood === 'normal' ? (id === 'moru' ? 12 : id === 'pico' ? 7 : 5) : mood === 'complex' ? 3 : 0;
  const displacement = mood === 'normal' && id === 'moru' ? 12 : 0;
  const y = mood === 'happy' ? -12 : mood === 'tired' ? 3 : 0;
  const scale = size / 384;
  const eyes = eyeMap[id];
  return <View accessible accessibilityLabel={`${id === 'salgu' ? '살구' : id === 'pico' ? '삐코' : '모루'} 아바타`} style={{ width: size, height: size }}>
    <Animated.View style={{ width: size, height: size, transform: [
      { translateX: body.interpolate({ inputRange: [-1, 0, 1], outputRange: [-displacement, 0, displacement] }) },
      { translateY: body.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, y] }) },
      { rotate: body.interpolate({ inputRange: [-1, 0, 1], outputRange: [`-${rotation}deg`, '0deg', `${rotation}deg`] }) },
      { scale: body.interpolate({ inputRange: [-1, 0, 1], outputRange: [1, 1, mood === 'rest' ? 1.025 : 1] }) },
    ] }}>
      <Image source={mood === 'normal' && motion ? art[id].base : art[id][mood]} style={{ width: size, height: size }} resizeMode="contain" />
      {mood === 'normal' && motion && eyes.xs.map((x, i) => <Animated.View key={i} style={{ position: 'absolute', left: x * scale, top: eyes.y * scale, width: eyes.w * scale, height: eyes.h * scale, borderRadius: eyes.w * scale / 2, backgroundColor: eyes.color, transform: [{ scaleY: eye }] }} />)}
    </Animated.View>
  </View>;
}
