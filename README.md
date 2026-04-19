<div align="center">

# ccIDE

**The missing IDE for your Claude Code sessions.**

Search any conversation. Resume in one click. Run multiple sessions side by side.

[Download for macOS](https://github.com/sophiaashi/Awesome-ccIDE/releases/latest) &nbsp;&middot;&nbsp; [Report Bug](https://github.com/sophiaashi/Awesome-ccIDE/issues) &nbsp;&middot;&nbsp; [Request Feature](https://github.com/sophiaashi/Awesome-ccIDE/issues)

</div>

---

## The Problem

You have 100+ Claude Code sessions scattered across projects. You remember discussing "API rate limiting" somewhere last week, but which session was it? You `claude --resume` with a UUID you don't remember, in a directory you have to `cd` into first. When you finally get three sessions running, you're alt-tabbing between terminal windows.

**ccIDE fixes all of this.**

## Features

### Full-Text Search Across All Sessions

Type any keyword. ccIDE searches through every message you've ever sent to Claude — not just session titles, but the actual conversation history. Results show the exact sentence containing your keyword, highlighted in context.

### One-Click Resume

Click "Resume" on any session. It opens right inside ccIDE in an embedded terminal. No copying UUIDs. No `cd`-ing into directories. No opening Terminal.app.

### Multi-Terminal Layouts

Run 2, 3, or 4 sessions simultaneously with built-in layouts:

| Layout | Description |
|--------|-------------|
| **Two Column** | Side-by-side split |
| **Three Column** | Triple split |
| **Quad Grid** | 2x2 grid |
| **Stack** | Overlapping, switch between |

### Session Naming

Give your sessions memorable names. Double-click to rename. Search by name. Names are stored locally and persist across restarts.

### Keyboard-First

| Shortcut | Action |
|----------|--------|
| `Cmd + K` | Focus search |
| `Up / Down` | Navigate sessions |
| `Enter` | Resume selected session |

## Install

### Download (Recommended)

1. Go to [**Releases**](https://github.com/sophiaashi/Awesome-ccIDE/releases/latest)
2. Download `ccIDE-1.0.0-arm64.dmg`
3. Open the DMG, drag ccIDE to Applications
4. Done

> Requires macOS on Apple Silicon (M1/M2/M3/M4). Intel build coming soon.

### Build from Source

```bash
git clone https://github.com/sophiaashi/Awesome-ccIDE.git
cd Awesome-ccIDE
npm install
npm run dist
# Built app is in release/mac-arm64/ccIDE.app
cp -R release/mac-arm64/ccIDE.app /Applications/
```

### One-Liner Install

```bash
curl -fsSL https://github.com/sophiaashi/Awesome-ccIDE/releases/latest/download/ccIDE-1.0.0-arm64.dmg -o /tmp/ccIDE.dmg && hdiutil attach /tmp/ccIDE.dmg -quiet && cp -R "/Volumes/ccIDE 1.0.0/ccIDE.app" /Applications/ && hdiutil detach "/Volumes/ccIDE 1.0.0" -quiet && rm /tmp/ccIDE.dmg && echo "ccIDE installed. Open from Launchpad or run: open /Applications/ccIDE.app"
```

## Prerequisites

- **macOS** (Apple Silicon)
- **Claude Code CLI** installed (`npm install -g @anthropic-ai/claude-code`)
- Existing Claude Code sessions (the app reads from `~/.claude/projects/`)

## How It Works

```
┌─────────────────────┐                    ┌──────────────────────┐
│   Left Panel        │                    │   Right Panel        │
│                     │   click Resume     │                      │
│  Search + Filter    │ ──────────────────>│   Embedded Terminal  │
│  Session List       │                    │   (xterm.js + pty)   │
│  Custom Names       │                    │                      │
│  Open/Active State  │                    │   Quad / 3-Col /     │
│                     │                    │   2-Col / Stack      │
└─────────────────────┘                    └──────────────────────┘
        │                                           │
        │ reads                                     │ spawns
        ▼                                           ▼
  ~/.claude/projects/                    claude --resume <id>
  */sessions-index.json                  in project directory
  ~/.claude/history.jsonl
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron |
| UI | React 18 + TailwindCSS |
| Terminal | xterm.js + node-pty |
| Search | In-memory index over `history.jsonl` |
| Design | Linear-inspired dark theme |
| Build | Vite + electron-builder |

## Data & Privacy

- **100% local.** No data leaves your machine. No analytics. No telemetry.
- Reads from `~/.claude/projects/` (session metadata) and `~/.claude/history.jsonl` (search index)
- Custom session names stored in `~/.claude-session-manager/session-names.json`
- No network requests except what Claude Code itself makes

## Contributing

PRs welcome. To develop locally:

```bash
git clone https://github.com/sophiaashi/Awesome-ccIDE.git
cd Awesome-ccIDE
npm install

# Dev mode (Vite HMR + Electron)
npm run electron:dev

# Or web-only preview (no terminal features)
npm run dev:client   # starts Vite on :3456
npx tsx server/index.ts  # starts API on :3457
```

## Roadmap

- [ ] Intel Mac support
- [ ] Linux support
- [ ] Session content preview (read conversation without resuming)
- [ ] Session tagging and filtering by tags
- [ ] Export session as markdown
- [ ] Auto-detect running Claude Code processes
- [ ] Homebrew cask install (`brew install --cask ccide`)

## License

MIT

---

<div align="center">

Built for people who talk to Claude all day.

**[Star this repo](https://github.com/sophiaashi/Awesome-ccIDE)** if ccIDE saves you time.

</div>
