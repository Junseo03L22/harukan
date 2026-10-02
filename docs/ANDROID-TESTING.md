# 하루칸 · Android 테스트

현재 목표는 스토어 출시가 아니라 Android 기기에 설치할 독립 실행 APK 검증입니다.

## 설정
- 표시 이름: 하루칸
- Expo slug: harukan
- Android application ID: com.junseo03l22.harukan
- 현재 소스 버전: 0.7.0 / versionCode: 2 (아직 새 APK 미빌드)
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

앱 삭제 전 백업 파일을 앱 밖에 보관해야 합니다. 웹/Expo Go의 기록은 자동 이전되지 않으며 0.7의 백업 파일로 수동 복원을 테스트할 수 있습니다.

## 0.7 추가 확인 항목
- 같은 서명으로 0.6 위에 업데이트 설치 후 기존 사진·일정 유지.
- 4/5/6주 달력 PNG 저장, 일정 포함 켜기/끄기, GIF 정지 프레임과 영상 썸네일.
- 사진 앨범 권한 거절/허용, 공유 취소/수신 앱에서 PNG 열기.
- 백업 파일 외부 저장 → 파일 선택 → 내용 확인 → 교체 복원 → 강제 종료/재실행.
- 누끼·4컷·GIF·영상 재생·스티커 보관함 유지, 다른 기기/웹에서 만든 백업 복원.
- 손상/누락 파일 거절, 파일 선택 취소, 공간 부족 및 큰 백업 처리. 실패 전후 기존 기록 비교.

## 현재 검증 범위
타입 검사·단위/통합 테스트·Expo 번들 export와 실제 APK 빌드/기기 테스트는 서로 다릅니다. APK 생성과 실기기 검증 결과는 수행 후 별도로 기록합니다.

## PC 에뮬레이터 준비 (2026-09-30)
- EAS 프로젝트: https://expo.dev/accounts/arthas_js/projects/harukan
- 첫 APK 빌드: https://expo.dev/accounts/arthas_js/projects/harukan/builds/b396b871-3d29-4b38-bb9d-45dc1de9ac53
- Android 16 / API 36 x86_64 에뮬레이터 설치를 완료했습니다.
- 이 PC의 도구/가상 기기는 Git 저장소 밖 work/android에만 둡니다.
- 사용자가 Android SDK 약관에 동의했습니다. 다른 PC에서는 해당 사용자가 약관을 확인하세요.
- Windows WHPX 가속 사용 가능 확인. 아래 완료 기록을 참고하세요.

## APK 설치 및 기본 동작 검증 완료 (2026-09-30)
- 위 EAS preview 빌드가 FINISHED 상태로 완료되었습니다. APK 크기: 85,997,776바이트.
- Android 16 / API 36 x86_64, WHPX 에뮬레이터에 APK 직접 설치 성공.
- Expo Go나 Metro 연결 없이 독립 실행 확인.
- 오늘 홈 표시, 월간 달력 열기, 9월 29일 선택 확인.
- 9월 29일에 종일 일정 H 추가 및 저장 확인.
- Android 사진 선택기로 프로젝트 테스트 이미지 가져오기, 꾸미기 완료 확인.
- 앱 force-stop 후 다시 실행: 오늘 홈으로 진입, 월간 달력에서 테스트 사진/일정 표시, 9월 29일 상세에서 사진과 일정 유지 확인.
- 테스트 후 Android crash 로그 버퍼에 기록 없음.

이는 기본 설치·저장 흐름 테스트 완료이며 전체 기능 QA 완료는 아닙니다. 테두리 드래그는 에뮬레이터에서 스크롤로 처리되어 크기 변경 성공을 확인하지 못했습니다. 사진 이동/핀치, 카메라, GIF/영상, 배경 편집, 누끼/4컷, 권한 거절 및 실기기 성능은 별도 검증이 필요합니다.

이 PC의 재실행 도우미는 저장소 밖 work/android/start-harukan.ps1입니다. Android 도구는 사용자 홈의 harukan-android-tools ASCII junction을 사용하며 AVD 경로는 user/avd입니다. 다른 PC에 이 경로를 그대로 적용하지 마세요.

