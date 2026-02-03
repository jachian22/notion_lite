# Notion-Lite (Single Page Blocks)

A super-simple Notion-like editor built as a full-stack take-home exercise. The app supports a **single page** made of **vertically stacked blocks** with backend persistence and lightweight editing controls (no rich-text editor libraries).

## What’s implemented

### Requirements
- **Two block types**
  - **Text blocks**: editable content + style (**H1 / H2 / H3 / Paragraph**)
  - **Image blocks**: editable **source URL**, optional **width**, optional **height**
- **Vertical layout**
  - Blocks render **top-to-bottom**, one per row, in a centered editor column.
- **Persistence via API**
  - Data is stored in **Postgres** and accessed via **tRPC**.
- **Editing**
  - Existing text/image blocks can be edited and are persisted (saved on blur).

### Small “Notion-ish” extras
- **Move Up / Move Down** controls to reorder blocks (ordering persists)
- **Slash command lite**
  - Typing `/image` in a text block and pressing **Enter** inserts an image block below
- **Editable page title** (saved on blur)

## Out of scope (intentional)
- Auth / multi-user collaboration / sharing
- Multiple pages UI/navigation
- Text editor libraries (e.g. Tiptap, Blocknote)
- Image uploads (URL-only)
- Undo/redo, real-time editing, other block types

## Tech stack
- Next.js (T3 project)
- tRPC
- Drizzle ORM
- Postgres (local)
- Tailwind CSS

## Data model

### Single page
A single page is identified by `slug = "home"` and is created automatically if the DB is empty.

### Blocks
Blocks belong to a page and are displayed in `position` order.

- `type`: `text | image`
- `position`: integer ordering key (lower = higher on page)
- Text fields:
  - `text`
  - `textStyle`: `h1 | h2 | h3 | p`
- Image fields:
  - `imageSrc` (empty allowed until set)
  - `imageWidth` (optional)
  - `imageHeight` (optional)

### Ordering strategy
New blocks use **gapped positions** (e.g. 1000, 2000, 3000…) so future insertion between blocks is simple. Move up/down swaps positions with the nearest neighbor.

## API overview (tRPC)

### Query
- `page.getHome` → returns `{ page, blocks[] }` (creates the home page if missing)

### Mutations
- `page.updateTitle`
- `block.addText`
- `block.addImage`
- `block.updateText`
- `block.updateImage`
- `block.delete`
- `block.move(direction: "up" | "down")`

## E2E test notes
Manual E2E flows are documented in `tests/notion-lite-flow.yml` to keep expected behavior easy to review and maintain.

## Running locally

### Prerequisites
- Node.js (LTS recommended)
- `pnpm`
- Postgres (either via Docker or a local install)

### Install dependencies
```bash
pnpm install
```

### Configure environment
Create a `.env` file (it’s gitignored) from `.env.example`:
```bash
cp .env.example .env
```

The only required env var is:
- `DATABASE_URL` (example): `postgresql://postgres:password@localhost:5432/notion_lite`

### Start Postgres
Choose one option:

#### Option A: Docker (recommended)
This repo includes a helper script that starts a Postgres container based on your `DATABASE_URL`:
```bash
./start-database.sh
```

Notes:
- If you see `Port 5432 is already in use`, change the port in `DATABASE_URL` (e.g. `5433`) and rerun.
- The script uses the database name from `DATABASE_URL` and creates a container named like `<db_name>-postgres`.
- If you already have Postgres running locally (Homebrew, Postgres.app, etc.), you can skip Docker and use Option B instead.

#### Option B: Local Postgres
If you have Postgres installed locally, ensure the server is running and create the DB from `DATABASE_URL` (adjust host/port/user/db name as needed):
```bash
createdb -h localhost -p 5432 -U postgres notion_lite
```

If `createdb` isn’t available, you can use `psql` instead:
```bash
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE notion_lite;"
```

### Run migrations
```bash
pnpm db:migrate
```

### Start the app
```bash
pnpm dev
```

Open `http://localhost:3000`.
