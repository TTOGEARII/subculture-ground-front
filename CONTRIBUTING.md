# 기여 지침 — AI 관련 흔적은 git에 올리지 않는다

이 문서는 **AI 도구(Claude Code, Copilot, Cursor, ChatGPT 등)를 쓰면서 생기는 흔적이 git/GitHub에 남지 않게** 하기 위한 규칙이다.
코드를 AI의 도움으로 작성하는 것 자체는 문제가 아니다. 금지하는 것은 **AI의 흔적 — 공동저자 표기, 도구 설정 파일, API 키, 세션 산출물 — 이 저장소에 들어가는 것**이다.

## 왜 이 규칙이 생겼나 (2026-10)

AI 코딩 도구가 커밋 메시지 끝에 `Co-Authored-By: Claude <noreply@anthropic.com>` 를 자동으로 붙였다.
GitHub은 이 트레일러를 **공동 저자로 집계**해서 저장소 컨트리뷰터에 `claude` 계정이 올라갔고,
히스토리를 재작성(force-push)해 트레일러를 전부 지운 뒤에도 GitHub 캐시에 남아 **레포를 새로 만들어야 했다.**
한 번 올라가면 되돌리기가 매우 어렵다. 그래서 **커밋 시점에 기계적으로 차단**한다.

## 절대 규칙

1. **커밋 메시지에 AI 표기 금지.** `Co-authored-by: Claude …`, `Signed-off-by: … copilot …`, `Generated with Claude Code`, `🤖 Generated …` 같은 줄을 넣지 않는다.
   커밋의 author·committer는 항상 **본인 GitHub 계정 메일**이어야 한다.
2. **AI 도구 설정·세션 파일 커밋 금지.** `CLAUDE.md`, `.claude/`, `.cursor/`, `.cursorrules`, `.aider*`, `.continue/`, `.windsurf*`, `.github/copilot-instructions.md`, `AGENTS.md`, `GEMINI.md`, `.playwright-mcp/` 등.
   (전부 `.gitignore`에 있고, pre-commit 훅이 `git add -f` 우회까지 막는다.)
3. **AI 서비스 API 키·토큰 커밋 금지.** (Anthropic / OpenAI / Gemini 키 등) 이 프로젝트는 키를 사용자 입력으로 받아 암호화 저장한다. 코드·env 파일·시드에 키를 넣지 않는다.
4. **AI가 만든 산출물(프롬프트, 설계 문서, 스크린샷, 대화 기록)은 저장소 밖**에 둔다. 코드에 반영할 내용은 본인이 검토한 뒤 **본인 이름의 일반 커밋**으로 넣는다.

## 강제 장치 (자동)

| 장치 | 역할 |
|---|---|
| `.githooks/commit-msg` | AI 공동저자/생성 표기가 있으면 커밋 거부 |
| `.githooks/pre-commit` | AI 도구 파일이 스테이징돼 있으면 커밋 거부 |
| `package.json` → `prepare` | `npm install` 시 `git config core.hooksPath .githooks` 자동 설정 (git 없는 Docker 빌드에선 조용히 무시) |
| `.gitignore` | AI 도구 설정/세션 산출물 전부 제외 |

새로 clone 했거나 훅이 안 도는 것 같으면 직접 한 번 실행한다:

```bash
git config core.hooksPath .githooks
git config core.hooksPath   # → .githooks 가 나와야 한다
```

훅을 우회하지 않는다 (`git commit --no-verify` 금지).

## AI 도구 쪽 설정 (원천 차단)

- **Claude Code**: `~/.claude/settings.json` 에 `"includeCoAuthoredBy": false` — 커밋/PR에 Claude 공동저자 줄을 붙이지 않게 한다.
- 다른 도구도 "commit attribution / co-author" 류 옵션이 있으면 끈다.

## 사고가 나면

1. 트레일러가 들어간 커밋이 **push 전**이면 `git commit --amend` 로 그 줄을 지운다.
2. **이미 push 됐으면** `git filter-branch --msg-filter` 로 전체 히스토리에서 트레일러를 제거하고 `git push --force-with-lease` 한다.
3. 그래도 GitHub 컨트리뷰터 캐시에 남으면 GitHub Support에 요청하거나, 최후 수단으로 **깨끗한 히스토리로 레포를 새로 만든다.** (이 저장소가 그렇게 다시 만들어졌다.)
