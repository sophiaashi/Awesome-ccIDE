// 扫描 ~/.claude/skills/ 和 ~/.claude/plugins/ 下的 SKILL.md
// 描述优先级：用户本地覆盖（~/.claude-session-manager/skill-descriptions.json）
// → frontmatter description → 正文第一段。
// 用户本地 JSON 不进仓库，格式 { "skill-name": "自定义描述" }
import { readFileSync, realpathSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'
import os from 'os'

export interface SkillInfo {
  name: string
  description: string
  type?: string
  source: 'user' | 'plugin'
  sourceLabel: string
  filePath: string
}

/** 读取用户本地描述覆盖（每次扫描都读，改了立即生效） */
function loadUserDescriptions(): Record<string, string> {
  const file = path.join(os.homedir(), '.claude-session-manager', 'skill-descriptions.json')
  if (!existsSync(file)) return {}
  try {
    const data = JSON.parse(readFileSync(file, 'utf-8'))
    if (data && typeof data === 'object') return data as Record<string, string>
  } catch {}
  return {}
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  const lines = match[1].split('\n')
  let currentKey: string | null = null
  let accum = ''
  const flush = () => {
    if (currentKey) {
      let val = accum.trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      result[currentKey] = val
    }
  }
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (m) {
      flush()
      currentKey = m[1]
      accum = m[2]
    } else if (currentKey && /^\s+/.test(line)) {
      // 多行续接
      accum += ' ' + line.trim()
    }
  }
  flush()
  return result
}

function inferSourceLabel(filePath: string, homeDir: string): { source: 'user' | 'plugin'; label: string } {
  const rel = filePath.replace(homeDir + '/', '')

  // gstack 合集（装在 ~/.claude/skills/gstack/ 下或通过 symlink 指向）
  if (rel.includes('/skills/gstack/') || rel.includes('/.gstack/')) {
    return { source: 'plugin', label: 'gstack' }
  }

  // 官方插件 marketplace
  if (rel.includes('claude-plugins-official')) {
    return { source: 'plugin', label: '官方' }
  }

  // 其他 plugins
  const marketplaceMatch = rel.match(/\.claude\/plugins\/marketplaces\/([^/]+)\//)
  if (marketplaceMatch) {
    const [, marketplace] = marketplaceMatch
    if (marketplace.startsWith('gstack')) return { source: 'plugin', label: 'gstack' }
    return { source: 'plugin', label: marketplace }
  }

  if (rel.startsWith('.claude/plugins/')) {
    return { source: 'plugin', label: '插件' }
  }

  // ~/.claude/skills/ 下直接放的用户自建（非 symlink 的实际目录）
  return { source: 'user', label: '自建' }
}

/** 判断路径是否是冗余/内部副本（应当跳过） */
function shouldSkipPath(p: string): boolean {
  return (
    p.includes('/.agents/') ||
    p.includes('/.factory/') ||
    p.includes('/vendor/') ||
    p.includes('/node_modules/') ||
    p.includes('/.git/')
  )
}

export async function loadAllSkills(): Promise<SkillInfo[]> {
  const homeDir = os.homedir()

  // 只扫一级目录（避免递归到 claude-blog/geo-seo 等合集的子技能）
  const patterns = [
    path.join(homeDir, '.claude/skills/*/SKILL.md'),
    path.join(homeDir, '.claude/skills/*.md'),
    path.join(homeDir, '.claude/plugins/**/skills/*/SKILL.md'),
  ]

  // 用 realpath 去重：APFS 大小写不敏感，多个 glob pattern 可能返回同一文件的不同路径字符串
  const realPathToOrigin = new Map<string, string>()
  for (const pattern of patterns) {
    try {
      const matched = await glob(pattern, { nodir: true, follow: false })
      for (const p of matched) {
        if (shouldSkipPath(p)) continue
        let real: string
        try {
          real = realpathSync(p)
        } catch {
          real = p
        }
        if (shouldSkipPath(real)) continue
        // 同一真实路径只留第一次匹配到的（通常是 `.claude/skills/` 下的，更规范）
        if (!realPathToOrigin.has(real)) {
          realPathToOrigin.set(real, p)
        }
      }
    } catch {}
  }

  // 每次扫描时重读用户本地覆盖表（没有就空对象）
  const userDescriptions = loadUserDescriptions()

  const skills: SkillInfo[] = []
  for (const [realPath, originPath] of realPathToOrigin) {
    try {
      const content = readFileSync(realPath, 'utf-8')
      const fm = parseFrontmatter(content)

      const dirName = path.basename(path.dirname(originPath))
      const fileName = path.basename(originPath, path.extname(originPath))
      const name = (fm.name || (fileName.toLowerCase() === 'skill' ? dirName : fileName)).trim()

      // 描述优先级：用户本地 JSON → frontmatter description → 正文第一段
      let description = userDescriptions[name] || fm.description || ''
      if (!description) {
        const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
        const firstLine = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
        description = firstLine?.trim() || ''
      }

      const { source, label } = inferSourceLabel(originPath, homeDir)

      skills.push({
        name,
        description: description.slice(0, 300),
        type: fm.type,
        source,
        sourceLabel: label,
        filePath: realPath,
      })
    } catch {}
  }

  // 按 source 分组，组内按 name 排序
  skills.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'user' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  // 二次去重：同 name 的只留一个（优先 user 然后 plugin）
  const seen = new Set<string>()
  const unique = skills.filter(s => {
    if (seen.has(s.name)) return false
    seen.add(s.name)
    return true
  })

  return unique
}
