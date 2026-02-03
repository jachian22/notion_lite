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
- Docker (used by `./start-database.sh`)

### Start Postgres
```bash
./start-database.sh
