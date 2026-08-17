# Task Boards

Trello-style team collaboration boards (Next.js + Supabase).

## Spec

- Feature pack: [`specs/001-team-task-boards/`](specs/001-team-task-boards/) (`spec.md`, `plan.md`, `contracts/rest-api.md`, `tasks.md`)
- Validate manually: [`specs/001-team-task-boards/quickstart.md`](specs/001-team-task-boards/quickstart.md)
- Constitution: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Setup

1. Copy env template and fill values from Supabase **Settings → API Keys**:

```bash
cp .env.example .env
```

Required for the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Optional for seed scripts only (never expose to the browser):

- `SUPABASE_SERVICE_ROLE_KEY`
- `SEED_PASSWORD`

2. Link and push migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or paste SQL from `supabase/migrations/` / `supabase/bootstrap-schema.sql` into the Supabase SQL editor.

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current progress

Implemented: auth, workspaces, boards, lists/cards create, empty-board UX, i18n keys, RLS migrations.
Remaining: US3–US5 (invites/members, rich cards, polish) + applying schema / demo seed.
