# Claude Code slash commands

Move the files in this folder to `.claude/commands/` in your repo so they show up as slash commands in Claude Code:

```bash
mkdir -p .claude/commands
mv claude-commands/*.md .claude/commands/
rmdir claude-commands
```

Then in Claude Code you can run:

- `/screen-impl <screen-name>` — implement a screen end-to-end
- `/new-primitive <Name>` — scaffold a new atom + Storybook story
- `/new-composition <Name>` — scaffold a new composition + Storybook story
- `/wire-page <route>` — turn a route into a tenant-scoped Server Component
- `/tenant-test <feature>` — generate cross-tenant isolation tests

This folder is created here only because `.claude/` is a protected path during
the initial scaffold; once moved, never recreate it under `claude-commands/`.
