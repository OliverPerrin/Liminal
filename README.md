# LiminalML

LiminalML is a full-stack AI-powered ML interview prep platform for Research Engineer, MLE, Research Scientist, and Applied Scientist preparation.

## Stack

- Next.js 16 App Router (React + TypeScript + Tailwind)
- Supabase Auth + Postgres + Storage
- Anthropic Claude via Vercel-compatible Edge Route Handlers
- Streaming chat responses with live persistence into Supabase sessions

## Implemented Product Surface

- Email/password auth at /auth
- One-time onboarding at /onboarding
  - Upload resume PDF
  - Client-side PDF text extraction
  - Edge API STAR story generation via Claude
  - Save profile context into Supabase
- Session workspace at /home
  - Topic taxonomy browser with search
  - Free-form topic/message entry
  - Streaming assistant responses
  - Markdown + LaTeX + syntax-highlighted code rendering
  - Right-side session history with reload
- Profile editor at /profile
  - Resume text editing
  - STAR story CRUD
  - Regenerate STAR stories from resume text
- About page at /about

## Environment Variables

Copy .env.example to .env.local and fill values:

- ANTHROPIC_API_KEY
- ANTHROPIC_MODEL (default: claude-sonnet-4-5)
- ANTHROPIC_API_VERSION (default: 2023-06-01)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Note: next.config.ts maps SUPABASE_URL and SUPABASE_ANON_KEY into NEXT_PUBLIC_* automatically.

## Supabase Setup

1. Create a Supabase project.
2. Run the SQL migration from supabase/migrations/001_init.sql in the SQL editor.
3. Create a storage bucket named resumes.
4. Ensure auth email/password provider is enabled.

## Local Development

```bash
nvm use
npm install
npm run dev
```

If nvm is not installed yet, install it once and then run:

```bash
nvm install
nvm use
```

This project uses local `node_modules` (like a Node equivalent of a Python venv), so packages are not reinstalled on every run.
Only reinstall when `package.json`/`package-lock.json` changes.

Recommended clean reset if dev gets stuck:

```bash
pkill -f "next dev|next build|eslint" || true
rm -rf .next
npm run dev -- --hostname 127.0.0.1 --port 3000
```

App routes:

- /auth
- /onboarding
- /home
- /profile
- /about

## Edge APIs

- POST /api/parse-resume
  - Input: { "resume_text": "..." }
  - Output: { resume_text, star_stories }
- POST /api/session
  - Input: { topic, user_id, session_id?, messages[] }
  - Requires Bearer Supabase access token
  - Streams assistant text response in real time

## Production Deployment (Vercel)

1. Push this repo to GitHub.
2. Import into Vercel.
3. Set the same environment variables in Vercel Project Settings.
4. Deploy.

## Notes

- Anthropic model is configurable via ANTHROPIC_MODEL.
- API key never leaves server/edge handlers.
- ANTHROPIC_API_VERSION is the API contract version header, not the model date.
- Session writes are persisted during streaming and finalized at completion.
- Server and edge routes fail fast with clear errors when required env vars are missing or misnamed.
