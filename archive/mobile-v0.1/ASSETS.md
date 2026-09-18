# 캐릭터 이미지

기존에 함께 만든 살구·로봇·조약돌 시안을 사용했습니다. 앱의 이름은 각각 살구·삐코·모루입니다.

- `assets/avatars/*-normal.png` 등 18개: 기존 시안의 여섯 상태를 잘라 정규화한 이미지
- `assets/avatars/*-base.png` 3개: 내장 이미지 생성 도구로 만든 눈이 없는 기본 몸체. 앱에서 눈 레이어를 붙여 움직입니다.
- 원본 시안과 생성본은 수정하지 않았으며 앱이 사용하는 파일은 모두 프로젝트에 포함했습니다.

## 기본 몸체 생성 프롬프트

Create a production sprite asset sheet for a mobile app, preserving EXACTLY these three reference character identities. Three equal columns, ONE row, plain pure white background, no text no labels no extra symbols no floor shadows. Left the apricot bean creature from reference1 with short two-lobed tuft, cream belly and relaxed arms down. Center teal rounded square robot from reference2 with dark navy screen, ivory side dial, arms down and navy feet. Right squat lavender pebble from reference3 with crescent cream forehead marking, arms down, tiny feet. Full body front-facing neutral pose, centered in their respective thirds, fully separated with wide margins. Keep original proportions (pebble is wide and squat), thick clean dark outlines and flat softly shaded colors. CRITICAL all three have a SMALL NEUTRAL MOUTH only, but ABSOLUTELY NO EYES (blank smooth face where eyes belong, no eyelids, no brows). Eyes will be drawn as independent animated layers in the app so must be omitted. Do not change mouth when removing eyes. Robot mouth is tiny ivory horizontal line. Peach and pebble tiny relaxed curved smile. Asset sheet only, no presentation design.
