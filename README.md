# 마음사이 · Maeumsai

각자 아바타를 키우고, 서로의 작은 방에 들러 상태를 알아보는 모바일 앱입니다.
현재 개발 버전은 **0.4.0**입니다. 이 저장소는 2026-09-18에 정리한 이전 작업의 스냅샷이며, 기존 대화 전체나 과거 Git 커밋 이력을 포함하지 않습니다.

## 먼저 읽기
- [개발 인수인계](docs/HANDOFF.md)
- [진행 과정과 결정 사항](docs/PROGRESS.md)
- [다른 컴퓨터에서 실행](docs/SETUP.md)
- [GitHub 업로드와 동기화](docs/GITHUB-UPLOAD.md)
- [포함 및 제외 파일](docs/CONTENTS.md)

## 폴더
- `mobile/`: 현재 앱 코드, Node API 서버, 테스트, 실제 사용 이미지
- `design/originals/`: 생성한 캐릭터 원본 이미지 7개
- `design/animations/`: 손 흔들기 GIF 시안 3개
- `archive/web-prototype/`: 초기 웹 시안 소스 (운영 배포 설정 제외)
- `archive/mobile-v0.1` ~ `mobile-v0.3`: 이전 배포 ZIP에서 복원한 소스
- `archive/guides/`: 이전 테스트 안내
- `archive/production-scripts/`: 이미지 제작/패키징 당시 스크립트와 검토 이미지
- `archive/windows-test-tools/`: Windows LAN 테스트용 방화벽 스크립트

현재 앱은 `mobile/`에서 작업하세요. archive는 과거 참고 자료로, 현재 제품 동작과 다를 수 있습니다.

## 실행
Node.js 24를 준비한 뒤:
```sh
cd mobile
npm ci
npx expo login
npm run dev:pair
```
Expo CLI와 iPhone Expo Go에 같은 테스트 계정으로 로그인하고 같은 LAN에 연결합니다. 자세한 내용은 SETUP.md를 읽으세요.
