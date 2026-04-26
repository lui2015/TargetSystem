# TargetSystem · 个人目标管理系统

> 结合 **OKR + SMART + WOOP + 原子习惯 + PDCA** 五大方法论，帮你把目标变成现实。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Router
- **后端**：Node.js + Express + TypeScript + Prisma ORM + SQLite
- **认证**：JWT + bcrypt
- **安全**：全量 Prisma 参数化查询，零 SQL 拼接

## 已实现功能（MVP / P0）

- ✅ 账号注册 / 登录 / JWT 鉴权
- ✅ 目标创建向导（5 步：选类型 → 写 O → 拆 KR（SMART 校验）→ WOOP → 确认）
- ✅ OKR 看板 & 目标详情（KR 手动更新进度）
- ✅ 习惯管理（图标/颜色/频率/难度/堆叠/奖励）
- ✅ 一键打卡（幂等切换） + Streak 连续天数自动计算
- ✅ GitHub 风格年度热力图
- ✅ Today 今日视图（习惯打卡 + 任务）
- ✅ 周复盘 KPT 模板 + 本周数据自动汇总

## 目录结构

```
TargetSystem/
├── docs/
│   └── 需求文档.md         # 完整 PRD
├── server/                  # 后端
│   ├── prisma/schema.prisma # 数据模型
│   ├── src/routes/          # API 路由
│   ├── src/utils/           # 工具函数
│   └── src/index.ts         # 入口
├── web/                     # 前端
│   └── src/
│       ├── pages/           # 页面
│       ├── components/      # 组件
│       ├── store/           # Zustand
│       └── lib/api.ts       # API 调用
└── package.json             # monorepo 根
```

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录执行（npm workspaces 会自动装所有子包）
npm install
```

### 2. 初始化数据库

```bash
npm run db:init
# 等价：cd server && npx prisma migrate dev --name init
```

SQLite 文件将生成在 `server/prisma/dev.db`，零配置即可运行。

### 3. 启动开发环境

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server   # http://localhost:4000
npm run dev:web      # http://localhost:5173
```

打开 <http://localhost:5173> 即可访问，使用邮箱注册后开始使用。

## API 概览

| 模块 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 认证 | POST | `/api/auth/register` | 注册 |
| 认证 | POST | `/api/auth/login` | 登录 |
| 认证 | GET | `/api/auth/me` | 当前用户 |
| 目标 | GET/POST | `/api/objectives` | 列表 / 创建 |
| 目标 | GET/PATCH/DELETE | `/api/objectives/:id` | 详情 / 归档 / 删除 |
| 目标 | PATCH | `/api/objectives/kr/:krId` | 更新 KR 进度 |
| 习惯 | GET/POST | `/api/habits` | 列表（含 Streak） / 创建 |
| 习惯 | PATCH/DELETE | `/api/habits/:id` | 更新 / 归档 |
| 打卡 | POST | `/api/checkins/toggle` | 切换打卡 |
| 任务 | GET | `/api/tasks/today` | 今日任务 |
| 任务 | POST/PATCH/DELETE | `/api/tasks` | 任务 CRUD |
| 复盘 | GET | `/api/reviews/weekly/summary` | 本周数据聚合 |
| 复盘 | GET/POST | `/api/reviews` | 列表 / 保存（upsert） |

## 生产环境注意事项

- `.env` 中务必替换 `JWT_SECRET` 为 32+ 位随机字符串。
- 生产建议切换到 PostgreSQL：修改 `schema.prisma` 的 `provider` 为 `postgresql` 并设置 `DATABASE_URL`。
- 前端构建：`npm run build -w web`，产物在 `web/dist/`。
- 推荐在反向代理（Nginx / CDN）后部署，启用 HTTPS。

## 路线图（未按需求文档 P1/P2 分级）

- [ ] 月/季/年复盘
- [ ] 番茄专注 + 时长聚合到 KR
- [ ] 成就徽章 / 经验值系统
- [ ] AI 教练（基于复盘数据给建议）
- [ ] 移动端适配 / PWA
- [ ] 数据导出（JSON / CSV / PDF）

## License

MIT
