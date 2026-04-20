// 备忘录：读写 ~/.claude-session-manager/notes.md
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'

const NOTES_FILE = path.join(os.homedir(), '.claude-session-manager', 'notes.md')

export function loadNotes(): { content: string; path: string } {
  try {
    if (existsSync(NOTES_FILE)) {
      return { content: readFileSync(NOTES_FILE, 'utf-8'), path: NOTES_FILE }
    }
  } catch {}
  return { content: '', path: NOTES_FILE }
}

export function saveNotes(content: string): { success: boolean; error?: string } {
  try {
    const dir = path.dirname(NOTES_FILE)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(NOTES_FILE, content, 'utf-8')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
