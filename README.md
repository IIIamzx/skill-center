# SkillCenter

**Local-first AI Skill Management Platform**

SkillCenter 是一个面向 AI 高频使用者和 AI coding / agent 工作流用户的本地 Skill 管理中心。它用于统一发现、加载、查看、创建、导入、编辑和管理本机已有的 Skill 资产。

## ✨ Features

- 🔍 **自动扫描** — 自动发现 Codex、Claude、Agents 等工具的本地 Skill 目录
- 📋 **统一管理** — 在一个界面查看、搜索、筛选所有 Skill
- 📤 **文件导入** — 上传 .md / .json / .zip 文件导入 Skill
- 🐙 **GitHub 导入** — 通过 GitHub URL 导入公开仓库中的 Skill
- ✏️ **创建 Skill** — 结构化表单创建新 Skill，自动生成 SKILL.md
- 🔧 **编辑管理** — 编辑元数据、内容，启用/禁用，安全删除
- 🌓 **明暗主题** — 支持浅色/深色主题切换
- 💾 **本地优先** — 无需远程后端、无需登录、无需数据库

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install & Run

```bash
# Clone or download the project
cd SkillCenter

# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev
```

启动后访问:
- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3001/api

### Build for Production

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
SkillCenter/
├── server/                   # Node.js 后端服务
│   ├── index.ts              # Express 入口
│   ├── types.ts              # 共享类型定义
│   ├── routes/
│   │   └── api.ts            # API 路由
│   └── services/
│       ├── configService.ts  # 配置管理
│       ├── skillService.ts   # Skill 扫描/解析/CRUD
│       ├── fileImportService.ts  # 文件导入
│       └── githubImportService.ts # GitHub 导入
├── src/                      # React 前端
│   ├── App.tsx               # 主应用组件
│   ├── main.tsx              # 入口
│   ├── types/                # 类型定义
│   ├── lib/                  # 工具函数
│   ├── services/             # API 客户端
│   ├── components/
│   │   ├── ui/               # 基础 UI 组件 (shadcn 风格)
│   │   ├── layout/           # 布局组件
│   │   └── skill/            # Skill 业务组件
│   └── pages/                # 页面组件
│       ├── Dashboard.tsx
│       ├── Skills.tsx
│       ├── Sources.tsx
│       ├── Import.tsx
│       ├── Create.tsx
│       └── Settings.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🔍 Default Scan Directories

SkillCenter 启动时自动扫描以下目录：

| 目录 | 来源 |
|------|------|
| `~/.codex/skills` | Codex |
| `~/.codex/skills/.system` | Codex System |
| `~/.agents/skills` | Agents |
| `~/.agents/plugins` | Agents Plugins |
| `~/.claude` | Claude |
| `~/.claude/skills` | Claude Skills |
| `{cwd}/.codex` | Project Codex |
| `{cwd}/.agents` | Project Agents |
| `{cwd}/.claude` | Project Claude |

- 不存在的目录不会报错，仅标记为"未发现"
- 可在 Settings 页面添加自定义扫描目录
- 支持 `~` 和相对路径

## 📝 Skill 识别规则

SkillCenter 识别以下结构为一个 Skill：

- 包含 `SKILL.md` 的目录
- 包含 `README.md` 并带有 skill 元数据（frontmatter）的目录
- 包含 `manifest.json` / `plugin.json` / `metadata.json` / `package.json` / `skill.json` 的目录

每个 Skill 解析并展示：
- id, name, title, description
- sourceType (codex / claude / agents / plugin / uploaded / github / unknown)
- sourcePath, entryFile
- tags, tools, dependencies
- version, author
- createdAt, updatedAt, enabled
- rawContent, fileTree

## ⚙️ Configuration

配置文件位置：`~/.skillcenter/config.json`

可配置项：
- `scanDirectories` — 扫描目录列表
- `customScanDirectories` — 自定义扫描目录
- `defaultImportDir` — 默认导入保存目录
- `scanHiddenDirs` — 是否扫描隐藏目录
- `readPluginDirs` — 是否读取插件目录
- `githubImportEnabled` — 是否启用 GitHub 导入
- `customTags` — 自定义标签
- `theme` — 主题设置

## 📖 Pages

### Dashboard
- Skill 总数、启用数量、来源分布
- 最近更新的 Skill
- 最近扫描时间

### Skills
- 所有 Skill 列表（卡片/列表视图）
- 搜索、按来源/状态/标签筛选
- 按更新时间/名称排序
- 查看详情、编辑、启用/禁用、删除

### Sources
- 按来源分组展示扫描目录
- 目录状态（存在/不存在）
- 每个目录的 Skill 数量
- 重新扫描

### Import
- 文件上传导入 (.md, .json, .zip)
- GitHub URL 导入
- 导入预览和确认

### Create
- 结构化表单创建 Skill
- 自动生成 SKILL.md 模板
- 支持标签、工具、依赖、适用场景等字段
- SKILL.md 预览

### Settings
- 扫描目录管理
- 通用设置（保存目录、隐藏目录、GitHub 导入等）
- 配置导出/导入

## 🛡️ Safety

- 不会修改用户原有 Skill 文件（除非明确编辑保存）
- 写文件前需要明确保存目标
- 删除默认只从索引移除，删除本地文件需二次确认
- 编辑外部 Skill 文件时需谨慎操作

## 🔮 Future Roadmap

- Skill 版本管理
- Skill 测试运行
- Skill 质量评分
- Skill 依赖关系图
- Skill 市场
- Prompt Studio 联动
- MCP 工具联动
- 多 Agent 兼容配置
- 团队共享
- 云端同步
- 一键安装到 Codex / Claude / Agents
- GitHub 私有仓库导入
- zip 完整解压导入

## 📄 License

MIT
