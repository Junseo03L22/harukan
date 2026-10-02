# 하루칸 · 0.7.0

사진으로 하루 한 칸을 꾸미고, 한 달 전체를 완성하는 다이어리 캘린더입니다.

- 현재 앱: `App.tsx` → `src/calendar/CalendarApp.tsx`.
- 오늘 중심 홈, 월 달력, 사진·누끼·스티커·4컷·GIF·짧은 영상·다꾸와 일정.
- 월 달력 PNG 저장/공유, 미디어를 포함한 백업/복원 추가.
- 로컬 중심 저장. 클라우드 동기화는 아직 없습니다.

## 실행 및 검사
Node.js 24에서:
```sh
npm ci
npm start
npm test
npm run typecheck
npm run export
```
현재 캘린더는 별도 페어링 서버가 필요하지 않습니다. `LegacyApp.tsx`와 기존 아바타/연결 코드는 과거 기능으로 보존합니다.

## Android
`eas.json`의 `preview` 프로필은 독립 실행 APK, `production`은 AAB입니다. 0.7에는 네이티브 모듈이 추가되어 새 APK 빌드가 필요합니다. `export` 성공은 APK 빌드나 실기기 QA 완료를 뜻하지 않습니다.

- [0.7 변경사항과 한계](../docs/UPDATE-0.7.md)
- [Android 테스트](../docs/ANDROID-TESTING.md)
- [개발 인수인계](../docs/HANDOFF.md)
- [다음 패치와 테스터 계획](ROADMAP.md)
