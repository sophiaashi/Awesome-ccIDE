// 项目颜色分配工具

/** 项目颜色预设（来自 DESIGN.md） */
const PROJECT_COLORS = [
  '#DA7756', // 橙
  '#58A6FF', // 蓝
  '#3FB950', // 绿
  '#D29922', // 黄
  '#BC8CFF', // 紫
  '#F778BA', // 粉
  '#79C0FF', // 浅蓝
  '#7EE787', // 浅绿
]

/** 项目名 → 颜色的映射缓存 */
const colorMap = new Map<string, string>()
let colorIndex = 0

/**
 * 为项目名分配固定颜色
 * 同一个项目名始终返回同一种颜色
 */
export function getProjectColor(projectName: string): string {
  if (colorMap.has(projectName)) {
    return colorMap.get(projectName)!
  }
  const color = PROJECT_COLORS[colorIndex % PROJECT_COLORS.length]
  colorMap.set(projectName, color)
  colorIndex++
  return color
}

/**
 * 重置颜色映射（用于数据刷新时保持一致性）
 * 传入项目列表，按顺序分配颜色
 */
export function initProjectColors(projects: string[]): void {
  colorMap.clear()
  colorIndex = 0
  projects.forEach(project => {
    getProjectColor(project)
  })
}
