# 하루칸 GitHub 동기화

공개 저장소: https://github.com/Junseo03L22/harukan

```sh
git clone https://github.com/Junseo03L22/harukan.git
cd harukan/mobile
npm ci
```

이 PC의 업로드용 저장소는 release-repo/이고 실제 앱 소스는 그 아래 mobile/입니다. 변경은 pull → 수정/검증 → commit → push 순으로 진행합니다. node_modules, .expo, 인증·서명 키와 기기 기록은 업로드하지 않습니다.
