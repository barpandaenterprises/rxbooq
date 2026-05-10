---
description: Scaffold a new Doctor Kart atom (primitive) with Storybook story.
arguments:
  - name: name
    description: PascalCase component name, e.g. StatusBadge
    required: true
---

Create a new atom named `{{name}}` in `src/components/atoms/{{name}}.tsx`.
Constraints:

- TypeScript with explicit `Props` type. No `any`.
- Variants via `class-variance-authority` (cva) when more than one visual state
  exists. Never inline conditional class strings.
- Tailwind classes only; reference design tokens (no raw hex).
- Default-exports avoided; use a named export `export function {{name}}()`.
- Co-locate `{{name}}.stories.tsx` with one story per variant + a11y addon enabled.
- Update `design/inventory.md` to tick the box for `{{name}}` under "Atoms".

After creating the file, also add a one-line entry to
`src/components/atoms/index.ts` re-exporting the component.
