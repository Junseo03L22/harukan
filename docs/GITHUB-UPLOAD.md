# GitHub에 올리기 (GitHub Desktop 권장)

준비된 폴더: outputs/maeumsai-github. 이 폴더 하나가 저장소 루트입니다. ZIP 파일 자체를 업로드하지 말고 폴더의 파일을 Git으로 올립니다.

## 현재 PC
1. https://desktop.github.com/ 에서 GitHub Desktop 설치 후 본인 계정으로 로그인.
2. File → Add local repository → Choose에서 준비된 maeumsai-github 폴더 선택. 이 폴더에는 로컬 Git 초기화가 되어 있습니다.
3. Changes 목록 확인 → Summary에 Initial project handoff 입력 → Commit to main.
4. Publish repository → Name: maeumsai → Keep this code private 체크 → Publish repository.
5. GitHub 웹에서 mobile, design, archive, docs 폴더가 보이는지 확인.
이미 같은 이름의 저장소가 있다면 새 이름을 사용하거나 기존 저장소와 합치는 작업을 별도로 진행하세요. 강제 덮어쓰기하지 마세요.

ZIP을 다른 위치에 새로 풀었다면 .git은 포함되지 않으므로 Add local repository에서 저장소가 아니라는 안내가 나올 수 있습니다. 안내의 create a repository here를 사용하거나 그 폴더에서 git init -b main을 실행한 뒤 다시 추가하세요.

## 다른 컴퓨터
1. GitHub Desktop 로그인 → File → Clone repository → maeumsai 선택 → Clone.
2. 내려받은 저장소 루트를 Codex에서 엽니다.
3. 새 작업에 다음 내용을 붙여넣습니다.

> README.md, docs/HANDOFF.md, docs/PROGRESS.md를 읽고 이 앱의 개발을 이어가 줘. 현재 앱은 mobile/이고 archive/는 참고 자료야. docs/SETUP.md에 따라 실행 환경을 확인하고, 먼저 0.4 버전의 방/간식/꾸미기/상태 분리 동작을 검증해 줘.

## 매번 컴퓨터를 바꿀 때
시작: Fetch origin → Pull origin(업데이트가 있을 때).
마침: 변경 확인 → Commit to main → Push origin.
두 PC에서 동시에 같은 파일을 수정하지 않는 편이 처음에는 쉽습니다. 미완료 작업/다음 할 일도 HANDOFF.md에 기록하고 함께 커밋하세요.
GitHub는 코드 동기화이며 채팅 이력, Expo 로그인, 실행 중인 서버를 자동으로 옮기지 않습니다.

## 공식 안내
- https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop
- https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop
