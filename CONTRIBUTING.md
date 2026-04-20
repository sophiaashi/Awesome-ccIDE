# Contributing to ccIDE

Thanks for considering a contribution. ccIDE is a small focused app — most PRs get reviewed within a few days.

## Quick setup

```bash
git clone https://github.com/sophiaashi/Awesome-ccIDE.git
cd Awesome-ccIDE
npm install
npm run electron:dev      # Vite HMR + Electron hot reload
```

Requires Node 20+, macOS (Apple Silicon for full testing, but the code itself is portable).

## Before you open a PR

1. **Type-check passes** — `npx tsc --noEmit` (zero errors)
2. **Build passes** — `npm run dist` (produces a working `.app`)
3. **Manually smoke-test the changed area** — install the built `.app` to `/Applications` and poke at it
4. If you changed anything security-sensitive (IPC handlers, HTTP server, file writes), explain the threat model in the PR description

## Where things live

```
electron/            # Main process (IPC, pty, notify HTTP server)
  main.ts              entry
  preload.ts           context-bridge API surface
  notify-server.ts     127.0.0.1:3458 listener for Claude Code hooks
server/              # Backend logic (called from main.ts)
  sessions.ts          scan ~/.claude/projects/
  skills.ts            scan skills, read user description overrides
  background-tasks.ts  launchd plist parsing + actions
  notes.ts             notes.md read/write
  hooks-install.ts     Claude Code hook injection
  claudemd.ts          global/project CLAUDE.md IO
src/                 # Renderer (React 19 + Tailwind)
  App.tsx              top-level layout
  components/
    TerminalPane.tsx     single xterm instance
    TerminalPanel.tsx    grid layout for multiple panes
    ToolSidebar.tsx      right-side 5-tab sidebar shell
    toolsidebar/         one file per tab (Skills / Shortcuts / CLAUDE.md / Tasks / Notes)
  hooks/               custom React hooks
docs/screenshots/    # README assets
build/               # Electron-builder config + afterPack hook
```

## What I'd love help with

- **Linux / Intel Mac build** — currently macOS arm64 only
- **i18n** — English-only UI (some Chinese strings); looking for `README.en.md` quality translations
- **Session content preview** — read conversation without resuming (huge ask, but super valuable)
- **`good-first-issue` tagged issues** — start there if you're new to the codebase

## Philosophy

- **Local-first, no telemetry.** Anything that reads/writes the user's data must be explicit and visible in the UI. The HTTP server binds `127.0.0.1` only.
- **No auto-polling UI.** Data refreshes on explicit user action (button) or event-driven. Timers that re-render periodically are rejected — they cause jitter.
- **Narrow scope.** ccIDE is a session manager + terminal grid + right-side tool shelf. It's not a full IDE, not a chat client, not a launcher replacement.

## License

By contributing you agree your contribution is licensed under [MIT](LICENSE) — the same as the rest of the project.
