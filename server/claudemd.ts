// 读取用户级 + 项目级 CLAUDE.md
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'

export interface ClaudeMdBundle {
  user: { path: string; content: string | null }
  project: { path: string; content: string | null } | null
}

/**
 * @param projectPath 当前激活的 session 对应的项目目录。为空时不返回项目级内容。
 */
export function loadClaudeMd(projectPath?: string): ClaudeMdBundle {
  const homeDir = os.homedir()
  const userPath = path.join(homeDir, '.claude', 'CLAUDE.md')

  let userContent: string | null = null
  try {
    if (existsSync(userPath)) {
      userContent = readFileSync(userPath, 'utf-8')
    }
  } catch {}

  let project: ClaudeMdBundle['project'] = null
  if (projectPath && projectPath !== '/' && projectPath !== homeDir) {
    const projPath = path.join(projectPath, 'CLAUDE.md')
    let projContent: string | null = null
    try {
      if (existsSync(projPath)) {
        projContent = readFileSync(projPath, 'utf-8')
      }
    } catch {}
    project = { path: projPath, content: projContent }
  }

  return {
    user: { path: userPath, content: userContent },
    project,
  }
}
