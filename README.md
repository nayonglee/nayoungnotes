# Nayoung Notes

Nayoung Notes is a private single-user diary and scrapbook planner PWA for one person using multiple devices. The product combines a structured day page with a soft scrapbook layer, so quick capture and decorative journaling can coexist without turning into a chaotic infinite canvas.

## Product Overview

- Single-user personal diary with account login and multi-device sync
- Structured page for title, mood, todos, diary text, photos, stickers, and handwriting
- Stationery-inspired design language with pastel pink, soft mint, cream paper, labels, tabs, and polaroid cards
- Local-only PIN lock for device privacy
- IndexedDB offline drafts and sync queue
- PWA installability with offline fallback
- Optional direct AI autofill for week-based schedule changes

## Tech Stack

- Next.js App Router
- React 19
- Supabase Auth, Postgres, Storage
- React Query
- Zustand
- Dexie / IndexedDB
- CSS Modules + CSS variables
- `react-textarea-autosize`
- `perfect-freehand`
- `@ducanh2912/next-pwa`
- OpenAI Responses API for direct schedule autofill

## Folder Structure

```text
src/
  app/
  components/
  lib/
    local/
    supabase/
  store/
  styles/
  types/
supabase/
  schema.sql
```

## Data Model

- `entries`
  - `id`
  - `user_id`
  - `entry_date`
  - `title`
  - `mood`
  - `theme_config`
  - `search_text`
  - `created_at`
  - `updated_at`
- `entry_items`
  - `id`
  - `entry_id`
  - `item_type`
  - `order_index`
  - `payload`
  - `style_config`
  - `updated_at`

Typed payload examples:

- `text`: `{ "content": "..." }`
- `todo`: `{ "items": [{ "id": "...", "text": "...", "checked": false }] }`
- `photo`: `{ "path": "...", "caption": "...", "width": 1200, "height": 900 }`
- `drawing`: `{ "background": "dot", "strokes": [...] }`
- `sticker`: `{ "stickerId": "mushroom", "label": "tiny win" }`

## Sync Model

- Debounced autosave from the editor
- Local draft persistence to IndexedDB before remote sync
- React Query invalidation on focus and reconnect
- Last write wins using server-issued `updated_at`
- Offline queue retry on reconnect

## AI Autofill

- The Week Plan panel can call a server-side AI route directly
- Add `OPENAI_API_KEY` to `.env.local` to enable the `Autofill with AI` button
- The app sends only the current page date, weekly changes, subject checklist, and day planning context to the AI route
- The returned plan is applied to:
  - timed plans
  - checklist
  - med school focus
  - academy focus
  - selected subjects

## Offline Policy

- Draft text, todos, photos, stickers, and drawing strokes are staged in IndexedDB
- Save badge states: `Saved`, `Syncing...`, `Offline Draft`
- An offline route is precached for PWA fallback

## PIN Lock Policy

- PIN hash is local only
- Web Crypto SHA-256 hash with salt
- No PIN data is sent to Supabase
- Auto-lock supports inactivity timeout and backgrounding

## Handwriting Structure

```json
{
  "background": "dot",
  "strokes": [
    {
      "id": "stroke_1",
      "tool": "pen",
      "color": "#f3cfdc",
      "width": 2,
      "opacity": 0.92,
      "points": [[10, 12, 0.5], [11, 14, 0.6], [13, 18, 0.7]]
    }
  ]
}
```

## Future Extensions

- Multiple pages per day
- More sticker packs and paper textures
- Better export bundles for media
- Full-text indexing improvements

## Setup

1. Copy `.env.example` to `.env.local`
2. Add Supabase URL, anon key, and bucket name
3. Add `OPENAI_API_KEY` if you want direct AI autofill inside the diary
4. Apply `supabase/schema.sql`
5. Run `npm install`
6. Run `npm run dev`
