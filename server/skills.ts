// 扫描 ~/.claude/skills/ 和 ~/.claude/plugins/ 下的 SKILL.md
// 解析 frontmatter（name / description / type），返回列表给右侧工具栏
import { readFileSync } from 'fs'
import { glob } from 'glob'
import path from 'path'
import os from 'os'

export interface SkillInfo {
  /** skill 名，用于复制 */
  name: string
  /** 描述（来自 frontmatter description 或文件开头） */
  description: string
  /** 类型（来自 frontmatter type，如 'user' / 'feedback' / 'project' / 'reference'） */
  type?: string
  /** 来源分类 */
  source: 'user' | 'plugin'
  /** 具体来源标签（显示用，比如 "gstack"、"官方"、"自建"） */
  sourceLabel: string
  /** SKILL.md 绝对路径（便于调试） */
  filePath: string
}

/** 从 markdown 文本里提取 YAML frontmatter 字段 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const result: Record<string, string> = {}
  const lines = match[1].split('\n')
  for (const line of lines) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/)
    if (m) {
      let val = m[2].trim()
      // 去掉包裹的引号
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      result[m[1]] = val
    }
  }
  return result
}

/** 推断 sourceLabel：从路径里猜出是哪个插件/来源 */
function inferSourceLabel(filePath: string, homeDir: string): { source: 'user' | 'plugin'; label: string } {
  const rel = filePath.replace(homeDir + '/', '')

  if (rel.startsWith('.claude/skills/')) {
    return { source: 'user', label: '自建' }
  }

  // .claude/plugins/marketplaces/<marketplace>/plugins/<plugin>/skills/...
  const marketplaceMatch = rel.match(/^\.claude\/plugins\/marketplaces\/([^/]+)\/plugins\/([^/]+)\//)
  if (marketplaceMatch) {
    const [, marketplace, plugin] = marketplaceMatch
    // 简化显示：gstack-* 显示 gstack，claude-plugins-official 显示 官方
    if (marketplace.includes('official')) return { source: 'plugin', label: '官方' }
    if (marketplace.startsWith('gstack')) return { source: 'plugin', label: 'gstack' }
    return { source: 'plugin', label: plugin }
  }

  return { source: 'plugin', label: '插件' }
}

export async function loadAllSkills(): Promise<SkillInfo[]> {
  const homeDir = os.homedir()

  // 扫描多个位置
  const patterns = [
    // 用户自建 skills（两种结构都支持）
    path.join(homeDir, '.claude/skills/*/SKILL.md'),
    path.join(homeDir, '.claude/skills/*/skill.md'),
    path.join(homeDir, '.claude/skills/*.md'),
    // 插件 skills
    path.join(homeDir, '.claude/plugins/**/skills/*/SKILL.md'),
    path.join(homeDir, '.claude/plugins/**/skills/*/skill.md'),
  ]

  const allPaths = new Set<string>()
  for (const pattern of patterns) {
    try {
      const matched = await glob(pattern, { nodir: true })
      for (const p of matched) allPaths.add(p)
    } catch {}
  }

  const skills: SkillInfo[] = []
  for (const filePath of allPaths) {
    try {
      const content = readFileSync(filePath, 'utf-8')
      const fm = parseFrontmatter(content)

      // 优先用 frontmatter name，否则用父目录名或文件名
      const dirName = path.basename(path.dirname(filePath))
      const fileName = path.basename(filePath, path.extname(filePath))
      const name = fm.name || (fileName.toLowerCase() === 'skill' ? dirName : fileName)

      // 描述：frontmatter description 优先，否则取正文第一段非空文本
      let description = fm.description || ''
      if (!description) {
        const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
        const firstLine = body.split('\n').find(l => l.trim() && !l.startsWith('#'))
        description = firstLine?.trim() || ''
      }

      const { source, label } = inferSourceLabel(filePath, homeDir)

      skills.push({
        name,
        description: description.slice(0, 300),
        type: fm.type,
        source,
        sourceLabel: label,
        filePath,
      })
    } catch {
      // 读不了就跳过
    }
  }

  // 按 source 分组，组内按 name 排序
  skills.sort((a, b) => {
    if (a.source !== b.source) return a.source === 'user' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return skills
}
