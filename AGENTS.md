# AGENTS.md

## Project summary
Notion‑Lite is a single‑page, Notion‑style editor built on the T3 stack. It persists a single page (`slug = "home"`) and a vertical list of blocks (text or image) in Postgres. Edits save on blur. A lightweight `/image` command inserts an image block below the current text block.

## Tech stack
- Next.js (T3 project, pages router)
- tRPC (API layer)
- Drizzle ORM (Postgres)
- Tailwind CSS (v4)

## Repo structure (key paths)
- `src/pages/index.tsx`: Main editor UI
- `src/server/api/root.ts`: tRPC router registry
- `src/server/api/routers/page.ts`: Page endpoints
- `src/server/api/routers/block.ts`: Block CRUD + move + insert logic
- `src/server/db/schema.ts`: Drizzle schema (pages, blocks, enums)
- `src/server/db/index.ts`: Drizzle client
- `tests/notion-lite-flow.yml`: Manual E2E flow checklist
- `README.md`: Project overview and setup

## Data model
### Page
- Single page identified by `slug = "home"`.
- `pages` table fields: `id`, `slug`, `title`, `createdAt`, `updatedAt`.

### Block
- Blocks belong to a page and render in ascending `position`.
- `blocks` fields:
  - `type`: `text | image`
  - `position`: integer ordering key (lower first)
  - Text: `text`, `textStyle` (`h1 | h2 | h3 | p`)
  - Image: `imageSrc` (nullable), `imageWidth` (nullable), `imageHeight` (nullable)

## Ordering strategy
- New blocks use gapped positions: `1000, 2000, 3000, ...`.
- `block.move` swaps positions with the nearest neighbor above/below (gap‑aware).
- `block.addImage` supports insertion after a given block. If no gap remains, it reindexes to restore spacing.

## tRPC API overview
### Queries
- `page.getHome`: Ensures the home page exists and returns `{ page, blocks[] }`.

### Mutations
- `page.updateTitle`
- `block.addText`
- `block.addImage` (supports `insertAfterBlockId`)
- `block.updateText`
- `block.updateImage`
- `block.delete`
- `block.move`

## Editor behavior
- Title and block edits save on blur.
- `/image` in a text block + Enter inserts an image block below and clears the text.
- Image width/height are optional. If omitted, the image renders at its natural size.

## Environment configuration
- `DATABASE_URL` is required. See `.env.example`.
- The repo includes `start-database.sh` to spin up a local Postgres container.

## Common scripts
- `pnpm dev`: Run Next.js dev server
- `pnpm db:generate`: Generate Drizzle migrations
- `pnpm db:migrate`: Apply migrations
- `pnpm db:push`: Push schema directly (dev only)

## Working notes for agents
- Keep edits minimal and consistent with existing patterns.
- Avoid adding editor libraries; this app intentionally uses plain inputs.
- Prefer blur‑based saves for edits to keep network chatter low.

## Debugging and change checklist
1. **Type safety first**
   - Avoid `any`. Prefer `unknown` + type guards if needed.
   - Use `satisfies` to keep literal types narrow.
2. **API boundary validation**
   - tRPC inputs should have Zod schemas.
   - Validate external/untrusted data at the boundary, not deep in logic.
3. **Drizzle schema consistency**
   - Update `src/server/db/schema.ts` for DB changes.
   - Generate and apply migrations after schema edits.
4. **Ordering & persistence**
   - `position` uses gapped increments (1000).
   - Reordering must be neighbor‑aware and handle uniqueness constraints.
5. **Frontend ↔ backend contract**
   - Keep UI payloads aligned with tRPC inputs and field names.
   - Update both sides when types change.
6. **Blur‑based saves**
   - Don’t overwrite local edits on refetch while editing.
   - Confirm blur triggers persist as expected.
7. **Manual E2E**
   - Review `tests/notion-lite-flow.yml` for affected scenarios.
