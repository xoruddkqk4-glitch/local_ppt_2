---
name: update-readme-push
description: README.md에 수정 사항을 업데이트하고, 질문과 검증 결과를 상세히 작성하여 Git 커밋 및 GitHub 푸시를 수행합니다.
---

# README 업데이트 및 GitHub 자동 커밋/푸시 스킬

사용자가 수정 사항 반영, README 업데이트, Git 커밋 및 푸시 요청을 할 때 실행되는 워크플로우입니다.

## 작업 수행 절차 (Execution Workflow)

1. **변경 사항 및 사용자 질문 분석**:
   - 최근 교환된 사용자 질문/요청 배경과 실제 프로젝트 파일(코드, 기능, 문서)의 변경 사항을 종합 정리합니다.

2. **README.md 문서 업데이트**:
   - 변경된 내용, 새로 추가되거나 검증된 기능 내역을 프로젝트의 `README.md`에 명확하고 체계적으로 추가/수정합니다.

3. **상세 Git 커밋 메시지 구성**:
   - 커밋 메시지는 단순 한 줄 요약이 아닌, **질문 내용과 작업 결과를 최대한 자세하게 기록**합니다.
   - 예시 포맷:
     ```text
     docs: update README.md and push task results

     [User Request]
     - 사용자의 질의 및 요청 사항 요약

     [Action & Verification Results]
     - 작업 내역 및 수정한 파일 상세
     - 구문 검사, 서버 동작 검증, 브라우저 UI 검증 결과

     [Summary]
     - 최종 결과 및 푸시 상태
     ```

4. **Git Staging, Commit & Push**:
   - `git add .` 명령으로 변경된 파일 스테이징
   - 상세 메시지로 `git commit` 실행
   - `git push origin main` 명령으로 연결된 GitHub 원격 저장소에 푸시 완료

5. **결과 보고**:
   - 푸시된 커밋 해시, README 반영 내역, GitHub 저장소 상의 동기화 결과를 사용자에게 요약 보고합니다.
