---
name: git-commit
description: Triggered by '/action git-commit', '/git-commit', or requests to update README.md with detailed user questions and verification results, then commit and push to GitHub.
---

# README 업데이트 및 GitHub 자동 커밋/푸시 스킬 (/action git-commit)

`/action git-commit` 단축 명령이나 요청이 들어오면 아래 워크플로우를 자동으로 수행합니다.

## 작업 수행 절차 (Execution Workflow)

1. **변경 사항 및 사용자 질문 분석**:
   - 최근 교환된 사용자 질문/요청 배경과 실제 프로젝트 파일(코드, 기능, 문서)의 변경 사항을 종합 정리합니다.

2. **README.md 문서 업데이트**:
   - 변경된 내용, 새로 추가되거나 검증된 기능 내역을 프로젝트의 [`README.md`](file:///c:/Users/user/Desktop/codex_cli/.projects/local_ppt_2/README.md)에 명확하고 체계적으로 추가/수정합니다.

3. **상세 Git 커밋 메시지 구성**:
   - 커밋 메시지는 질문 내용과 작업 결과를 최대한 자세하게 기록합니다.
   - 예시 포맷:
     ```text
     docs: update README.md and detailed commit results

     [User Request]
     - 사용자의 질의 및 요청 사항 요약

     [Action & Verification Results]
     - 작업 내역 및 수정한 파일 상세
     - 구문 검사, 서버 동작 검증, 브라우저 UI 검증 결과

     [Summary]
     - 최종 결과 및 푸시 상태
     ```

4. **Git Staging, Commit & Push**:
   - `git add .`
   - 상세 메시지로 `git commit`
   - `git push origin main`

5. **결과 보고**:
   - 푸시된 커밋 해시, README 반영 내역, GitHub 저장소 동기화 결과를 요약 보고합니다.
