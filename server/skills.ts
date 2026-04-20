// 扫描 ~/.claude/skills/ 和 ~/.claude/plugins/ 下的 SKILL.md
// 优先用硬编码中文描述表（来自飞书文档），fallback 到 frontmatter
import { readFileSync, realpathSync } from 'fs'
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

// ========== 中文描述表（来源：飞书文档《Claude Code Skill 分类规则与最终列表》） ==========
// 每个 key 是 skill name，value 是一句话中文描述
const ZH_DESCRIPTIONS: Record<string, string> = {
  // 设计 / Design
  'design-consultation': '设计咨询：调研竞品后提出完整设计系统，生成 DESIGN.md',
  'design-html': '将 AI 设计稿转为生产级 HTML/CSS，布局动态计算',
  'design-review': '视觉 QA 审查：发现间距、层级、AI 痕迹等 UI 问题并逐一修复',
  'design-shotgun': '生成多个 AI 设计变体，打开对比面板，收集反馈后迭代',
  'plan-design-review': '设计师视角评审方案，逐项评分并优化 UI/UX 到满分',
  'frontend-design': '创建独具风格的生产级前端界面，避免千篇一律的 AI 审美',

  // QA / 测试
  'benchmark': '检测页面性能回归，对比加载时间、Web Vitals 和资源体积基线',
  'investigate': '系统性调试：四阶段根因分析，不查明根因不修复',
  'qa': '系统化 QA 测试 Web 应用，发现 Bug 后自动修复并逐一验证',
  'qa-only': '仅生成 QA 测试报告（含健康评分和截图），不做修复',
  'test-login': '交互式测试短信验证码登录链路，发送验证码并完成验证',
  'test-login-example': 'test-login 的完整测试用例记录，含请求响应和重试示例',

  // 部署 / Ship
  'deploy-render': '一键部署应用到 Render，推代码、建服务、配环境变量',
  'land-and-deploy': '合并 PR 后等待 CI 和部署，通过 canary 检查验证生产环境',
  'setup-deploy': '自动检测部署平台并配置部署参数，写入 CLAUDE.md',
  'ship': '一键发布：跑测试、审查 diff、更新版本号、推代码、建 PR',

  // 安全 / 审计
  'careful': '危险命令安全护栏，在执行 rm -rf 等破坏性操作前拦截警告',
  'cso': '首席安全官模式，执行密钥考古、供应链和 OWASP 安全审计',
  'freeze': '将文件编辑锁定在指定目录内，防止误改其他模块代码',
  'guard': '最大安全模式：同时启用危险命令警告和目录编辑锁定',
  'unfreeze': '解除 freeze 设置的目录编辑限制，恢复全目录可编辑',

  // 代码审查
  'codex': '调用 OpenAI Codex 提供独立代码审查、对抗挑战和技术咨询',
  'plan-ceo-review': 'CEO 视角审查计划：挑战前提假设，寻找十倍产品机会',
  'plan-eng-review': '工程架构评审，审查数据流、边界用例、测试和性能',
  'review': 'PR 合并前代码审查，检测 SQL 安全、信任边界等结构性问题',
  'security-review': '对当前分支未合并的改动做完整安全审查',

  // 规划 / 回顾
  'autoplan': '自动依次运行 CEO、设计、工程评审，一键完成计划全流程审查',
  'office-hours': 'YC 式产品问诊：用六个核心问题验证需求真实性',
  'retro': '周度工程复盘，分析提交历史、代码质量和团队贡献趋势',

  // 浏览器
  'browse': '快速无头浏览器，用于 QA 测试、页面交互、截图和流程验证',
  'canary': '部署后金丝雀监控，持续检测线上页面错误和性能回归',
  'connect-chrome': '启动可视 Chrome 并加载侧边栏扩展，实时观看 AI 操作',
  'gstack-upgrade': '检测 gstack 安装方式并升级到最新版本',
  'setup-browser-cookies': '从本地浏览器导入登录 Cookie 到无头浏览器测试会话',
  'gstack': 'gstack 核心：浏览器自动化、设计系统、代码审查等工具合集',

  // 文档 / 笔记
  'document-release': '发版后自动同步更新 README/CHANGELOG 等全部项目文档',
  'learn': '管理项目经验库：查看、搜索、清理跨会话积累的经验',
  'obsidian': '在 Obsidian 笔记库中查找、创建、编辑和读取笔记',
  'init': '初始化一个新的 CLAUDE.md 文件，带上代码库文档',

  // 营销 / Marketing
  'claude-blog': '博客内容创作与优化，含 19 个子技能，兼顾 SEO 和 AI 引用',
  'geo': 'GEO 优化，让 AI 搜索引擎在回答问题时推荐你的产品',
  'geo-seo': 'GEO 优先的网站优化工具，针对 AI 搜索引擎优化兼顾传统 SEO',
  'seo-geo-skills': '20 个 SEO/GEO 技能库，覆盖关键词研究到排名监控全流程',

  // 产品研发
  'harness': '三智能体系统，Planner+Generator+Evaluator 循环迭代生成应用',

  // 环境与基础
  'daemon-loop': '通过链式 crontab 让 Claude Code 24/7 自主运行，崩溃自恢复',
  'teamo-env': '闭环自治环境，赋予 Agent 浏览器、桌面、邮件等交互能力',

  // 日常工作流
  'hr-interview-summary': '根据面试录音纪要，自动生成结构化 HR 面试记录文档',
  'interview': 'AI 产品经理面试助手，生成问题并自动填充答案评估',
  'interview-hr': 'HR 岗位面试工作流：面试前自动生成问题，面试后生成评估',
  'boss-recruit': 'Boss 直聘候选人自动筛选，读取表格并按规则判定',

  // 内容创作
  'humanizer': '检测并消除 AI 写作痕迹，让文本更自然有人味',

  // 飞书 / Lark
  'feishu-bot': '飞书机器人双向通信，支持 Agent 推送和用户私信/群聊回复',
  'lark-base': '操作飞书多维表格，建表、字段管理、记录读写、视图配置',
  'lark-calendar': '管理飞书日历与日程，创建日程、查询忙闲、推荐空闲时段',
  'lark-contact': '查询飞书通讯录，搜索员工信息、获取组织架构和联系方式',
  'lark-doc': '创建和编辑飞书云文档，支持 Markdown 写入和文档搜索',
  'lark-drive': '管理飞书云空间文件，上传下载、文件夹管理、权限控制',
  'lark-event': '通过 WebSocket 长连接实时监听飞书事件，输出 NDJSON',
  'lark-im': '飞书即时通讯，收发消息、搜索聊天记录、管理群聊',
  'lark-mail': '飞书邮箱全功能，收发邮件、草稿管理、文件夹和标签',
  'lark-minutes': '获取飞书妙记基础信息和 AI 产物（总结、待办、章节）',
  'lark-openapi-explorer': '从飞书官方文档库挖掘未被 CLI 封装的原生 API 接口',
  'lark-shared': '飞书 CLI 共享基础，应用配置、认证登录、权限管理',
  'lark-sheets': '创建和操作飞书电子表格，读写单元格、追加数据、导出',
  'lark-skill-maker': '将飞书 API 操作封装为可复用的自定义 Skill',
  'lark-task': '管理飞书任务和清单，创建待办、拆分子任务、分配成员',
  'lark-vc': '查询飞书视频会议记录，获取会议纪要、总结和逐字稿',
  'lark-whiteboard': '在飞书画板上绘制架构图、流程图、思维导图等图表',
  'lark-wiki': '管理飞书知识库，查询知识空间和文档层级结构',
  'lark-workflow-meeting-summary': '汇总指定时间内的会议纪要，生成结构化报告',
  'lark-workflow-standup-report': '编排日历和任务数据，生成每日日程与待办摘要',

  // 其他常见的（补充）
  'sync-newapi-channels': '自动同步 NewAPI 渠道管理表，定期拉取对账',
  'yumi': 'CEO 思维模型：用张一鸣的方法论解答管理、决策、团队问题',
  'keybindings-help': '自定义 Claude Code 键盘快捷键、chord 绑定',
  'update-config': '配置 Claude Code harness，修改 settings.json 权限、钩子、环境变量',
  'fewer-permission-prompts': '扫描历史转录，把常用只读命令加入 allowlist 减少确认弹窗',
  'simplify': '审查改动代码的复用、质量和效率，发现问题顺便修',
  'loop': '按固定间隔循环执行 prompt 或 slash command',
  'schedule': '管理定时远程 agent 触发器，按 cron 计划运行',
  'claude-api': '构建、调试、优化 Claude API / Anthropic SDK 应用，含缓存与模型迁移',
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

  const skills: SkillInfo[] = []
  for (const [realPath, originPath] of realPathToOrigin) {
    try {
      const content = readFileSync(realPath, 'utf-8')
      const fm = parseFrontmatter(content)

      const dirName = path.basename(path.dirname(originPath))
      const fileName = path.basename(originPath, path.extname(originPath))
      const name = (fm.name || (fileName.toLowerCase() === 'skill' ? dirName : fileName)).trim()

      // 描述：优先中文表 → fallback frontmatter → fallback 正文第一段
      let description = ZH_DESCRIPTIONS[name] || fm.description || ''
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
