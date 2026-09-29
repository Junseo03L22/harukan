# 하루칸 · Android 테스트

현재 목표는 스토어 출시가 아니라 Android 기기에 설치할 독립 실행 APK 검증입니다.

## 설정
- 표시 이름: 하루칸
- Expo slug: harukan
- Android application ID: com.junseo03l22.harukan
- 앱 버전: 0.6.0 / versionCode: 1
- preview: 직접 설치용 APK / production: 추후 Play 업로드용 AAB
- 기존 다이어리 데이터 보존을 위해 저장소 키는 변경하지 않았습니다.

## 빌드
```sh
cd mobile
npm ci
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```
Expo 계정에 프로젝트를 연결하면 app.json에 owner와 extra.eas.projectId가 생성됩니다. 공개 가능한 프로젝트 ID는 커밋하고, 토큰과 서명 키는 커밋하지 않습니다. Android 서명 키는 EAS가 관리하도록 설정할 수 있습니다. 유료 플랜 전환은 별도 결정 사항입니다.

빌드가 성공하면 EAS 링크에서 APK를 받아 Android 기기에 설치합니다. 설치 출처 허용은 해당 브라우저/파일 앱에 한정하며 테스트 후 해제할 수 있습니다. 이 preview 앱은 Expo Go나 PC 개발 서버 없이 실행됩니다. 다른 기기의 데이터와 자동으로 동기화되지는 않습니다.

## 기기에서 확인할 항목
1. 하루칸 이름으로 실행, 오늘 날짜와 일정 표시.
2. 월간 달력 열기, 월/연도 이동, 날짜 선택, 오늘로 돌아오기.
3. 사진 가져오기와 카메라 권한 허용/거절/취소.
4. 사진 이동, 핀치 크기 조절, 테두리, 누끼, 4컷, 색감 편집.
5. GIF와 5초 이내 영상 추가/재생, 긴 영상 거절.
6. 배경 색상·패턴, 일정 저장 후 앱 완전 종료 및 재실행.
7. 비행기 모드에서 기존 기록 열기.

앱 삭제 시 로컬 기록을 잃을 수 있습니다. 웹/Expo Go의 기록이 새 APK로 자동 이전되는 기능은 없습니다.

## 현재 검증 범위
타입 검사·단위/통합 테스트·Expo 번들 export와 실제 APK 빌드/기기 테스트는 서로 다릅니다. APK 생성과 실기기 검증 결과는 수행 후 별도로 기록합니다.
