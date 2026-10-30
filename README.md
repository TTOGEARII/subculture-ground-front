# Nuxt Content Starter

Look at the [Nuxt Content documentation](https://content.nuxt.com) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## ⚠️ AI 사용 지침 (반드시 읽을 것)

**AI 관련 흔적은 이 저장소에 절대 올리지 않는다.** 커밋 메시지의 AI 공동저자/생성 표기(`Co-authored-by: Claude …`, `Generated with …`), AI 도구 설정 파일(`CLAUDE.md`, `.claude/`, `.cursor/` …), AI API 키, AI 산출물 전부.

이유: AI 도구가 자동으로 붙인 `Co-Authored-By` 한 줄 때문에 GitHub 컨트리뷰터에 AI 계정이 올라갔고, 히스토리를 지워도 캐시에 남아 **레포를 새로 만들어야 했다**(2026-10).

- 규칙 전문·복구 절차: **[CONTRIBUTING.md](./CONTRIBUTING.md)**
- 훅이 커밋 시점에 자동 차단한다. clone 후 훅이 안 걸려 있으면 한 번 실행:
  ```bash
  git config core.hooksPath .githooks
  ```
