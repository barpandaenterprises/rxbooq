---
description: Scaffold a new screen-level composition with mock fixtures + Storybook story.
arguments:
  - name: name
    description: PascalCase composition name, e.g. BookingSlotPicker
    required: true
---

Create a composition named `{{name}}` in `src/components/compositions/{{name}}/`:

- `index.tsx` — main component. Pure presentational; takes typed props only.
  No data fetching, no Supabase imports.
- `{{name}}.fixtures.ts` — mock data the Storybook story can use, exported as
  `mock{{name}}Props`.
- `{{name}}.stories.tsx` — at least three stories: default, loading, empty.
  Pull props from the fixtures file.

Compose existing atoms and molecules from `@/components/atoms` and
`@/components/molecules`. If a needed primitive doesn't exist, run
`/new-primitive` or `/new-molecule` first.

Update `design/inventory.md` to tick the entry for `{{name}}`.
