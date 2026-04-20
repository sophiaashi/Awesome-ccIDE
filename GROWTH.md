# GROWTH.md — ccIDE GitHub Star 增长策略

> 沉淀于 2026-04-20。基于深度网络调研（HN/Reddit/Star History/freeCodeCamp/Anthropic 文档等）+ 本机已安装的 Claude skills 盘点。
> 适用对象：`github.com/sophiaashi/Awesome-ccIDE`（Electron + React + xterm.js，macOS Claude Code session 管理器）。

---

## 图例：每条动作属于产研还是增长

| 标记 | 含义 | 谁做 | 占比 |
|---|---|---|---|
| 🛠 **产研** | 动代码仓库（文件、UI、设计、配置） | 研发 / 设计（或 Claude 自动化） | ~35% |
| 📣 **增长** | 外部动作（发帖、投稿、社交、邮件） | 产品 / 运营自己做 | ~55% |
| 🔀 **混合** | 产研先产出物料、增长再分发 | 两边协作 | ~10% |

每个小节标题后会附上该节**主体标记**；30 天行动清单每条单独标记。末尾附「产研 vs 增长」分类清单。

---

## 0. 现状判断（2026-04 快照）

| 项 | 当前值 | 备注 |
|---|---|---|
| Star | 个位数 | 冷启动阶段 |
| 同类竞品 | ≥8 个 | `claude-code-viewer` / `claude-code-history-viewer` / `cc-sessions` 等 |
| dev.to 已有评测 | 是 | [I Tested 4 Tools for Browsing Claude Code Session History](https://dev.to/gonewx/i-tested-4-tools-for-browsing-claude-code-session-history-17ie) — **这是流量入口** |
| 差异化定位 | 全文搜索 + 一键 resume + 多终端平铺 + 原生 macOS + 索引自愈 | 别自称 "another viewer" |

**关键洞察**：赛道已拥挤，**别和其他 viewer 抢"viewer/history"关键词**，主打 "**native macOS IDE-style session manager**"。

---

## 1. 仓库本身的优化 🛠

### 1.1 命名 / About / Topics

- **Repo 名**：`Awesome-ccIDE` 容易和 `awesome-*` curated list 混淆。考虑保留为 alias，但主推 `sophiaashi/ccide` 短 slug。
- **About 描述**：必须把关键词 `Claude Code` 放前 80 字符。当前 description 已较好，可补加 "for macOS" 提升搜索匹配。
- **Topics**（GitHub 上限 20 个，全用满）：`claude` `claude-code` `anthropic` `ai-coding` `llm-tools` `session-history` `session-manager` `resume` `tui` `ide` `electron` `react` `xterm` `node-pty` `pty` `macos` `developer-tools` `vite` `typescript` `open-source`

### 1.2 README 结构（按出现顺序）

强制按以下顺序，**Hero GIF 必须在第一屏**：

1. **Hero GIF（5–15 秒，≤5MB）** — 完整动作：搜旧 session → 一键 resume → 旁边开第二个终端
2. **一句话 tagline + 4 个 badge**：build status / latest release / macOS 14+ / MIT license
3. **Why ccIDE? 对比表** — vs `claude-history` / `claude-code-history-viewer` / `cc-sessions` / 内置 `/resume`
4. **Quick Start** — 一行 DMG 下载链接（< 30 秒让人用上）
5. **Features with screenshots** — 每个特性配一张 PNG
6. **Keyboard shortcuts** 表格
7. **FAQ** — 索引损坏、权限、登录
8. **Roadmap / Contributing / License / Acknowledgements**

### 1.3 必须补齐的"健康指标"文件

- ✅ `LICENSE` (MIT) — 没 license 的项目企业用户和 awesome list 不会收录
- ✅ `CONTRIBUTING.md`
- ✅ `CODE_OF_CONDUCT.md`
- ✅ `.github/ISSUE_TEMPLATE/bug_report.yml` + `feature_request.yml`
- ✅ `.github/PULL_REQUEST_TEMPLATE.md`
- ✅ 社交预览图（Settings → Social preview）：1280×640 PNG，logo + tagline + 产品截图，暗色背景配 Claude 品牌橙 `#DA7756`

### 1.4 GitHub Trending 算法的偏好

- **核心机制**：当前星增速 vs 该 repo 历史均值。从 0.05 star/天 跳到 30 star/小时 的小项目得分远高于老项目稳定 50/天。
- **门槛**：1–2 小时内拿到 30–40 star 就有机会进 language trending（Electron / TypeScript 分类比 Global 容易 10 倍）。
- **启示**：**集中在 2 小时窗口内引流**，别把流量分散到一周。

---

## 2. 冷启动渠道（第 1 周 +200 star）📣

### 2.1 Hacker News — Show HN

- **时间**：周一或周二 **08:00–09:00 ET**（北京 20:00–21:00），周一表现最好
- **标题公式**：`Show HN: ccIDE – A native macOS app to search and resume Claude Code sessions`
- **首条评论**（作者自己发）：150 字，讲
  1. 为什么做（Claude Code 自带 `/resume` 不够用 — 跨项目找不回 session）
  2. 和已有工具的区别
  3. 坦诚限制（只支持 macOS arm64、没云同步）
  4. 邀请反馈
- **雷区**：不能求 upvote 链接、不能用新账号刷票（HN 反作弊很强）、遇到负评一律感谢 + 说明，不辩护

### 2.2 Reddit（按优先级）

| 子版块 | 成员 | 策略 |
|---|---|---|
| **r/ClaudeAI** | 747k | 最高优先级。先非自推 3–5 次建立历史，再发 `[Open Source] I built a native macOS app to manage Claude Code sessions` |
| r/macapps | ~100k | `[OSS][Free] ccIDE …`，附 DMG。截图必须精致 |
| r/SideProject | ~200k | 讲故事：为什么做、踩过的坑（grid 撑开 bug 是好素材） |
| r/opensource | — | release announcement，强调 MIT |
| r/programming | 6M+ | 最难，等 HN 有热度再转 |

**铁律**：每个版块单独读 sidebar，很多有 "self-promo Saturday only" 限制。

### 2.3 Product Hunt

- **发布时间**：美西 00:01 周二，月中
- **Hunter**：找 Follower > 5k 的 Hunter 帮 hunt（多 20–30% 曝光）
- **首 4 小时 + 末 2 小时**冲榜，每条 comment 5 分钟内回
- **素材**：3 张 gallery + 1 个 GIF，tagline ≤60 字

### 2.4 X / Twitter

- **Thread 7–10 条**：钩子 GIF → 痛点 → 功能截图 ×2 → 技术栈 → roadmap → 开源 + DMG CTA
- **@mention**：`@AnthropicAI` `@alexalbert__`（DevRel Lead）`@simonw` `@swyx` `@levelsio` `@iannuttall` `@mckaywrigley`
- **Hashtag**：`#ClaudeCode #OpenSource #macOS #buildinpublic`

### 2.5 国内渠道

- **HelloGitHub**：每月 28 号发刊，提前 2 周投稿 `https://hellogithub.com/periodical/contribute` — 中文圈最有效单一渠道
- **V2EX `/go/macos`**：周五上午发，标题 `[开源] ccIDE — Claude Code 历史 session 管理器（macOS 原生）`
- **少数派 Matrix**：投 800–1500 字长文 `《我用 Electron 做了个 Claude Code session 管理器》`
- **掘金**：技术实现文 `《xterm.js + node-pty 实战踩坑》`，末尾挂 repo
- **即刻**：加入 "AI 探险家"、"独立开发者" 圈子，@一嘎、一泽 Eric、歸藏

### 2.6 技术博客平台 + Newsletter

- **Dev.to / Hashnode / Medium / freeCodeCamp** — 一稿多投，加 canonical URL
- **daily.dev** — 提交文章曝光 500k+
- **Console.dev**（22k）/ **Changelog Weekly**（17k）/ **TLDR**（1.6M）/ **Bytes.dev**（105k） — 邮件投稿

---

## 3. 持续增长（长尾）🔀

### 3.1 SEO / GEO 关键词截流

- **目标关键词**：`claude code session manager` `claude code history viewer macos` `claude code resume session` `browse claude code sessions`
- **战术**：
  - README H2 直接用这些关键词
  - 开 `ccide.dev` 或 GitHub Pages 落地页
  - 在 dev.to 评测文下面留高质量补充评论

### 3.2 Awesome List 合作（最省力的长尾）

| 仓库 | 提交方式 |
|---|---|
| `hesreallyhim/awesome-claude-code` | **开 Issue 走 `recommend-resource` 模板**（不是 PR） |
| `jqueryscript/awesome-claude-code` | PR |
| `rohitg00/awesome-claude-code-toolkit` | PR |
| `sindresorhus/awesome-electron` | PR — macOS app 类别 |
| `matiassingers/awesome-readme` | README 做好后自荐 |
| `ruanyf/weekly`（阮一峰周刊） | 邮件投稿 |

### 3.3 联动 Anthropic 官方

- `@alexalbert__` 定期转 community projects
- 在 Anthropic Discord `#claude-code` 频道做 show-and-tell
- 在 `anthropics/claude-code` Discussions 发 "Community tools: ccIDE" 帖
- 在相关 issue 下友好留言"我做了个工具解决了这个"

### 3.4 多语言 README

加 `README.zh-CN.md`、`README.ja.md`、`README.ko.md` — 日韩 Claude Code 社区非常活跃。

---

## 4. 社交证明 🔀

- **Star History Chart**：达到 100 / 500 / 1000 时发 X 庆祝
- **用户证言**：把 Discord/X 正面反馈截图拼成 "What people say" 放 README 底部
- **Contributors**：开 5 个 `good-first-issue`（i18n / icon / Windows 支持 / 主题 / 快捷键自定义）
- **GitHub Sponsors**：开通，按钮本身能提升信任

---

## 5. 反模式（绝对避免）

- ❌ **互刷 / 买 star**：2024 GitHub 已删除 90.42% 被标记可疑 repo，FTC 罚款最高 $53k/违规。**碰一次掉号**
- ❌ 同一篇自夸文 1 天内投 5 个版块 → 被 ban
- ❌ 标题党（"Best Claude Code tool ever"）→ HN 会被 flag，Reddit 被删
- ❌ 拼凑 README、堆 badge 没内容 → 降低信任

---

## 6. Claude Skills 工具箱（本机已装 + 推荐拉取）

### 6.1 本机已安装（直接 `/skill-name` 用）

| Skill | 用途 |
|---|---|
| `/frontend-design` | 生成 ccIDE 落地页（github.io/Awesome-ccIDE）— 反通用 AI 审美 |
| `/design-shotgun` + `/design-html` | 生成 5 个落地页变体 → A/B 选 → 出生产 HTML |
| `/design-consultation` | 建立完整品牌设计系统 + DESIGN.md |
| `/humanizer` | 去 AI 味 — 写完 README / 博客 / 推文必过一遍 |
| `/geo` | GEO（让 ChatGPT/Perplexity 推荐 ccIDE）— 全自动基线 → 内容 → 追踪 |
| `/document-release` | 每次发版自动同步 README/CHANGELOG/CONTRIBUTING |
| `/browse` 或 `/gstack` | 截 README/OG 图所需的产品截图 |
| `/office-hours` | 推广前梳理"目标用户 / 最窄楔子" |
| `/codex consult` | 写关键文案前找 Codex 二意见 |
| `/lark-doc` `/lark-im` | 草稿同步飞书收集反馈 |

### 6.2 推荐拉取的社区 / 官方 skills

| 仓库 | 价值 |
|---|---|
| **`coreyhaines31/marketingskills`** | **最强推荐**：含 `launch-strategy` `competitor-alternatives`（生成 ccIDE vs xxx 对比页）`community-marketing` `ai-seo` |
| `alonw0/web-asset-generator` | 一键生成 favicon / OG 图 / Twitter Card |
| `GLINCKER/claude-code-marketplace`（含 `readme-generator`） | 自动扫代码生成规范 README |
| `muratcankoylan/ralph-wiggum-marketer` | 批量生成 Twitter/Reddit 文案变体 |
| `anthropics/skills`（`brand-guidelines` / `slack-gif-creator` / `canvas-design`） | 短 GIF + 宣传图 |

### 6.3 MCP Server（自动化发布）

| MCP | 用途 |
|---|---|
| `EnesCinr/twitter-mcp` | Claude 直接发推、搜推 |
| `Barresider/x-mcp` | 浏览器版 X MCP（无需官方 API） |
| `GeorgeNance/hackernews-mcp` | 监测 HN 上 ccIDE 相关讨论自动回复 |

### 6.4 缺口（需要自己写的 skill）

| 缺什么 | 怎么写 |
|---|---|
| **GIF demo 生成** | 用 `screencapture -V` + `ffmpeg`，写 `gif-demo` skill：录屏 → 转 GIF → 压缩 < 10MB |
| **Show HN 文案生成** | 写 `show-hn` skill：套 `Show HN: X — Y` 模板 + 评论区 FAQ 预设 |
| **Product Hunt 发布包** | 写 `producthunt-launch` skill：生成 tagline + 5 张截图要求 + maker comment + 首日策略 |
| **ccIDE 专属发布命令** | 组合 `/ship` + `/document-release` + `/blog`（如装）→ 建项目级 `/ccide-release` |

---

## 7. 30 天行动清单

### 第 1 周：仓库打磨（几乎全是产研 🛠）

- [ ] 🛠 补 `LICENSE` (MIT) + `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md` + 2 个 Issue 模板
- [ ] 🛠 跑 `/browse` 录 Hero GIF（10 秒：搜索 → resume → 多终端）
- [ ] 🛠 用 `/frontend-design` 重写 README：Hero GIF → badge → Why ccIDE 对比表 → Quick Start → Features
- [ ] 🛠 Topics 补到 20 个；上传 1280×640 社交预览图
- [ ] 🛠 开 5 个 `good-first-issue`
- [ ] 🛠 注册 `ccide.dev` 或开 GitHub Pages landing

### 第 2 周：冷启动 launch（全是增长 📣，目标 +200 star）

- [ ] 📣 **周一 08:30 ET** Show HN 发帖 + 首条作者自评论
- [ ] 📣 **同日 09:30 ET** r/ClaudeAI + r/macapps + r/SideProject 三版发帖
- [ ] 📣 **同日 10:00 ET** X thread（7 条）@AnthropicAI / @alexalbert__ / @simonw
- [ ] 📣 **周二** 给 `hesreallyhim/awesome-claude-code` 开 Issue（recommend-resource 模板）
- [ ] 📣 **周五上午** V2EX 发帖 + 即刻发布 + HelloGitHub 投稿
- [ ] 📣 **周末** Product Hunt "Coming soon" 页面积累 followers

### 第 3 周：内容 + 垂直社群（混合 🔀，目标 +150 star）

- [ ] 📣 Dev.to 长文 `Building ccIDE: from 0 to 1`，同步 Hashnode / Medium / daily.dev
- [ ] 📣 少数派 Matrix 中文长文
- [ ] 📣 掘金技术实现文 `xterm.js + node-pty 踩坑实录`
- [ ] 📣 邮件投 Console.dev / Changelog Weekly
- [ ] 📣 Anthropic Discord `#claude-code` 做 show-and-tell
- [ ] 📣 在 dev.to 评测文留高质量补充评论

### 第 4 周：Product Hunt + 长尾固化（混合 🔀，目标 +150 star）

- [ ] 📣 **周二 00:01 PT** Product Hunt launch
- [ ] 📣 Anthropic GitHub Discussions 发社区工具帖
- [ ] 📣 联系 2–3 个中小 YouTuber / B 站 UP 提供 demo 素材
- [ ] 📣 在 1–3 个相关 issue 下友好留言
- [ ] 🛠 发 `README.ja.md` `README.zh-CN.md`
- [ ] 📣 500 star 达成时发 Star History 庆祝推

**预期产出**：执行完整度 >70% 时 30 天内 300–800 star 可期；HN 上前 30（约 40% 概率）或被 TLDR/Anthropic 转发，单日可破 1000。

---

## 8. 产研 vs 增长 分类总览

把整份文档的动作项按「谁来做 / 动不动代码」重新拍扁成两列，方便排期和分工。

### 🛠 产研类（14 项，动代码仓库 / 设计物料）

| 动作 | 属于哪节 | 优先级 | 预估工作量 |
|---|---|---|---|
| 补 `LICENSE` (MIT) | 1.3 | P0 | 5 分钟 |
| 补 `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` | 1.3 | P0 | 10 分钟 |
| 补 `.github/ISSUE_TEMPLATE/*` + `PULL_REQUEST_TEMPLATE` | 1.3 | P0 | 20 分钟 |
| 录 Hero GIF（10 秒）放 README 顶部 | 1.2 | P0 | 30 分钟 |
| 重写 README（对比表 / Quick Start / FAQ） | 1.2 | P0 | 2 小时 |
| 给 README Features 段配 4–6 张截图 | 1.2 | P1 | 1 小时 |
| 上传 1280×640 社交预览图（Settings → Social preview） | 1.3 | P1 | 40 分钟 |
| Topics 扩到 20 个 + 改 About description | 1.1 | P0 | 5 分钟 |
| 开 5 个 `good-first-issue`（i18n / icon / Windows / 主题 / 快捷键） | 4 | P1 | 30 分钟 |
| 开通 GitHub Sponsors 按钮 | 4 | P2 | 20 分钟 |
| 在 README 底部加 "What people say" 证言区 | 4 | P2 | 随证言增加持续做 |
| 翻译 `README.zh-CN.md` `README.ja.md` `README.ko.md` | 3.4 | P2 | 每种 1 小时 |
| 做 GitHub Pages 落地页 `ccide.dev` 或 `sophiaashi.github.io/ccide` | 3.1 | P1 | 3–5 小时 |
| 改 repo slug 成短名 `ccide`（可选，风险：旧链接需重定向） | 1.1 | P2 | 30 分钟 |

**共性**：都是「一次做完、长期受益」的事 — 不做好，后续增长动作转化率会拉胯。**先把这 14 项的 P0 做完，再开始发帖**。

### 📣 增长类（20+ 项，外部动作）

| 渠道 | 动作 | 时机 | 单次产出预估 |
|---|---|---|---|
| Hacker News | Show HN 发帖 + 首条自评论 | 周一 08:30 ET | 100–500 star（若上前 30） |
| Reddit r/ClaudeAI | 发 `[Open Source] ...` | 周二 UTC 18:00 | 30–80 star |
| Reddit r/macapps | 发 `[OSS][Free] ...` | 非 self-promo-day 之外的工作日 | 10–30 star |
| Reddit r/SideProject | 讲做 ccIDE 的故事 | 自由 | 10–30 star |
| Reddit r/opensource | release announcement | 自由 | 5–15 star |
| Reddit r/programming | 等 HN 有热度再转 | HN 上榜后 | 20–100 star |
| Product Hunt | launch（需 Hunter） | 周二 00:01 PT | 50–200 star |
| X / Twitter | 7–10 条 thread + KOL @ mention | HN 同日 10:00 ET | 20–80 star |
| V2EX `/go/macos` | `[开源] ccIDE — 中文发帖` | 周五上午 | 10–30 star |
| HelloGitHub | 每月 28 号发刊，提前 2 周投 | 自由 | 50–200 star（国内最有效） |
| 少数派 Matrix | 中文长文 | 任意 | 20–80 star |
| 掘金 | 技术踩坑文 | 任意 | 10–30 star |
| 即刻 | "AI 探险家" / "独立开发者" 圈子 | 任意 | 5–20 star |
| Dev.to | `Building ccIDE` 长文 | 任意 | 10–40 star |
| Hashnode / Medium / daily.dev | 一稿多投 | 跟 Dev.to 同步 | 合计 10–30 star |
| freeCodeCamp | 投稿 | 任意 | 30–100 star（编辑通过时） |
| Console.dev | 邮件投稿 | 任意 | 50–150 star |
| Changelog Weekly | 邮件投稿 | 任意 | 30–100 star |
| TLDR | 编辑邮箱投递 | 任意 | 100–500 star（命中时） |
| Anthropic Discord `#claude-code` | show-and-tell | 任意 | 20–50 star |
| `anthropics/claude-code` Discussions | 发社区工具帖 | 任意 | 10–30 star |
| 相关 GitHub Issue | 友好留言"我做了个工具解决了这个" | 任意 | 5–20 star / 条 |
| Dev.to 评测文下留补充评论 | 截流搜索该文章的读者 | 任意 | 5–15 star |
| YouTube / B 站 中小 UP | 提供 demo 素材给 @AIJason / @indydevdan | 任意 | 20–100 star / 视频 |
| Milestone 推文 | 100 / 500 / 1000 star 时发 Star History 截图 | 里程碑当天 | 5–20 star |

**共性**：靠**时机 × 文案 × 渠道规则**取胜。**产研物料不到位前不要密集做** — 第一印象只有一次。

### 🔀 混合类（3 项，产研先做 + 增长分发）

| 动作 | 产研侧 | 增长侧 |
|---|---|---|
| **SEO 关键词截流** | README H2 用目标关键词 + 落地页 meta/schema 标记 | 在 dev.to 评测文、相关博客留评论 |
| **Why ccIDE 对比表** | README 内写对比表（vs 4 个竞品） | HN/Reddit 发帖时直接截图用 |
| **用户证言 block** | README 留证言区 HTML/MD | 主动向 Discord/X 正面反馈者要用户授权 |

---

## 9. 快速总结（一句话版）

> **ccIDE 冷启动 = "先把仓库变成一张精致的名片（🛠 产研 1 周做完 14 项 P0/P1），再在周一 2 小时窗口内 HN+Reddit+X 三路齐发（📣 增长 1 小时密集推）"**。
>
> - **产研不做好，增长白做**：没 LICENSE 的 repo 企业用户不会 star、没 Hero GIF 的 README 5 秒内被划走、没对比表不会被截流流量选中
> - **增长不密集做，trending 进不去**：GitHub trending 算法看"短期增速 vs 历史均值"，分散到一周的流量等于没流量
> - **产研（35%）+ 增长（55%）+ 混合（10%）+ 不做的事（反模式）** — 四象限，任何一个做错都会卡住
>
> **最小可行路径**：第 1 周把 14 项 🛠 里的 6 个 P0 做完 → 第 2 周周一 08:30 ET 火力全开 📣。其他都是 nice-to-have。

---

## 10. 数据来源

- [How to Get Your First 1,000 GitHub Stars](https://dev.to/iris1031/how-to-get-your-first-1000-github-stars-the-complete-open-source-growth-guide-4367)
- [Star History — Playbook for More GitHub Stars](https://www.star-history.com/blog/playbook-for-more-github-stars)
- [How to Crush Your Hacker News Launch](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)
- [Lucas Costa — How to Successfully Launch on HN](https://www.lucasfcosta.com/blog/hn-launch)
- [Onlook — Absolutely Crush Your HN Launch](https://onlook.substack.com/p/launching-on-hacker-news)
- [Digger — How we got into GitHub Trending](https://medium.com/@DiggerHQ/how-we-got-into-github-trending-c281f3b06df9)
- [freeCodeCamp — 2-year-old repo trending in 48h](https://www.freecodecamp.org/news/how-we-got-a-2-year-old-repo-trending-on-github-in-just-48-hours-12151039d78b/)
- [Product Hunt Launch Playbook (30x #1)](https://dev.to/iris1031/product-hunt-launch-playbook-the-definitive-guide-30x-1-winner-1pbh)
- [I Tested 4 Tools for Browsing Claude Code Session History](https://dev.to/gonewx/i-tested-4-tools-for-browsing-claude-code-session-history-17ie)
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [Developer Newsletters list](https://github.com/jackbridger/developer-newsletters)
- [Six Million Suspected Fake Stars in GitHub (arXiv)](https://arxiv.org/abs/2412.13459)
- [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills)
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
