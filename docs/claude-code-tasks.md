# Claude Code Tasks 工具完整介绍

## 概述

Claude Code Tasks 是 Claude Code 内置的任务管理系统，用于在软件开发过程中追踪、组织和管理复杂的开发工作。它支持跨会话持久化、依赖关系管理和并发安全操作。

---

## 核心特性

### ✅ 跨会话持久化

Tasks 不会在会话结束后丢失。所有任务数据存储在 `~/.claude/tasks/` 中，新会话开始时自动加载。

```
会话 1：创建 5 个 tasks + 完成 Task 1
         ↓ 保存到 ~/.claude/tasks/
会话 2：TaskList 显示所有 5 个 tasks，Task 1 已完成
        继续处理 Task 2-5
```

### ✅ 依赖关系管理

支持复杂的任务依赖图，自动管理阻塞状态。任务完成后，被其阻塞的任务自动变为可用。

```
Task 1 (数据库)
  ├─→ Task 2 (登录 API)  [阻塞中]
  └─→ Task 3 (注册 API)  [阻塞中]
        └─→ Task 4 (测试)  [双重阻塞]
              └─→ Task 5 (部署)  [阻塞中]

完成 Task 1 后：
Task 2 和 3 自动变为可用 ✓
```

### ✅ 原子性与并发安全

每个 task 独立存储为单个 JSON 文件。修改任何 task 只需写入一个小文件（~380 字节），避免多会话并发冲突。

### ✅ 项目隔离

多个项目的 tasks 独立管理，通过 UUID 确保全局唯一性，互不干扰。

---

## 工具详解

### 1. TaskCreate - 创建新任务

**作用**：创建一个新的 task

#### 入参

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `subject` | string | ✅ | 任务标题（命令式）。例："修复登录 bug" |
| `description` | string | ✅ | 详细描述，包含需求和验收条件 |
| `activeForm` | string | ❌ | 进行中时显示的形式（现在进行式）。例："正在修复登录 bug" |
| `metadata` | object | ❌ | 任意键值对，用于存储额外信息（优先级、标签等） |

#### 返回值

```
Task #{id} created successfully: {subject}
```

#### 使用示例

```typescript
TaskCreate {
  subject: "实现用户登录功能"
  description: "添加登录表单，包括：
- 输入验证
- API 集成
- 错误处理
- 单元测试"
  activeForm: "实现用户登录功能"
  metadata: { priority: "high", component: "auth" }
}

// 返回
Task #1 created successfully: 实现用户登录功能
```

---

### 2. TaskList - 查看所有任务

**作用**：列出当前项目的所有 tasks，显示状态和依赖关系

#### 入参

无入参

#### 返回值

返回所有 tasks 的摘要列表：

```
#{id} [{status}] {subject} [blocked by #{id}, #{id}]
```

字段说明：
- `#{id}` - task ID
- `[{status}]` - 状态：`pending`、`in_progress`、`completed`
- `{subject}` - 任务标题
- `[blocked by ...]` - 阻塞此 task 的其他 task ID（如果有）

#### 使用示例

```
#1 [completed] 设计和创建用户认证数据库模式
#2 [pending] 实现登录 API 端点
#3 [pending] 实现注册 API 端点
#4 [pending] 编写认证功能单元测试 [blocked by #2, #3]
#5 [pending] 部署认证功能到生产环境 [blocked by #4]
```

没有 tasks 时：

```
No tasks found
```

---

### 3. TaskUpdate - 更新任务

**作用**：更新 task 的属性、状态和依赖关系

#### 入参

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `taskId` | string | ✅ | 要更新的 task ID（例："1"） |
| `status` | enum | ❌ | 新状态：`pending`、`in_progress`、`completed` |
| `subject` | string | ❌ | 更新任务标题 |
| `description` | string | ❌ | 更新任务描述 |
| `activeForm` | string | ❌ | 更新进行中显示的形式 |
| `owner` | string | ❌ | 设置任务所有者（agent 名称或用户名） |
| `addBlockedBy` | string[] | ❌ | 添加阻塞此 task 的 task ID 列表 |
| `addBlocks` | string[] | ❌ | 添加此 task 阻塞的 task ID 列表 |
| `metadata` | object | ❌ | 合并 metadata 键值对（设置值为 `null` 删除键） |

#### 返回值

```
Updated task #{id} {field}
```

#### 使用示例

**标记为进行中：**

```typescript
TaskUpdate {
  taskId: "1"
  status: "in_progress"
}

// 返回
Updated task #1 status
```

**建立依赖关系：**

```typescript
// Task 2 被 Task 1 阻塞
TaskUpdate {
  taskId: "2"
  addBlockedBy: ["1"]
}

// Task 4 被 Task 2 和 3 阻塞
TaskUpdate {
  taskId: "4"
  addBlockedBy: ["2", "3"]
}
```

**完成任务：**

```typescript
TaskUpdate {
  taskId: "1"
  status: "completed"
}
```

**更新 metadata：**

```typescript
TaskUpdate {
  taskId: "1"
  metadata: {
    priority: "high"
    reviewed: true
    assignee: null  // 删除 assignee 键
  }
}
```

---

### 4. TaskGet - 获取任务详情

**作用**：获取单个 task 的完整信息

#### 入参

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `taskId` | string | ✅ | task ID（例："1"） |

#### 返回值

返回完整的 task 对象：

```typescript
{
  id: string
  subject: string
  description: string
  status: "pending" | "in_progress" | "completed"
  owner?: string
  blocks?: string[]      // 此 task 阻塞的其他 task ID
  blockedBy?: string[]   // 阻塞此 task 的其他 task ID
  metadata?: object
  activeForm?: string
}
```

#### 使用示例

```typescript
TaskGet {
  taskId: "1"
}

// 返回
{
  id: "1"
  subject: "设计和创建用户认证数据库模式"
  description: "覆盖：\n- 数据库模式验证\n- API 端点逻辑..."
  status: "completed"
  owner: "claude"
  blocks: ["2", "3"]
  blockedBy: []
  metadata: { priority: "high" }
  activeForm: "编写单元测试"
}
```

---

## 存储结构

### 文件系统架构

```
~/.claude/tasks/
└── {project-id}/                    ← UUID，唯一标识一个项目
    ├── 1.json                       ← Task ID 1
    ├── 2.json                       ← Task ID 2
    ├── 3.json                       ← Task ID 3
    ├── 4.json                       ← Task ID 4
    └── 5.json                       ← Task ID 5
```

### 单个 Task 文件结构

**Task 1.json（无依赖）：**

```json
{
  "id": "1",
  "subject": "设计和创建用户认证数据库模式",
  "description": "覆盖：\n- 数据库模式验证...",
  "activeForm": "编写单元测试",
  "status": "completed",
  "blocks": ["2", "3"],
  "blockedBy": []
}
```

**Task 4.json（多个依赖）：**

```json
{
  "id": "4",
  "subject": "编写认证功能单元测试",
  "description": "覆盖：\n- 登录端点...",
  "activeForm": "编写单元测试",
  "status": "pending",
  "blocks": ["5"],
  "blockedBy": ["2", "3"]
}
```

### 设计优势

| 方面 | 设计 | 原因 |
|------|------|------|
| 项目隔离 | project-id 文件夹 | 支持多项目独立管理，UUID 避免冲突 |
| 原子操作 | 每个 task 一个文件 | 修改单个 task 只写一个小文件，并发安全 |
| 快速查询 | 按 ID 查找 | O(1) 时间复杂度，无需遍历 |
| 依赖管理 | blocks + blockedBy | 双向引用，支持快速依赖图遍历 |
| 文件大小 | ~380 字节/task | 极小，I/O 快速，易于备份 |

---

## 典型工作流

### 场景：实现用户认证功能

#### 第 1 步：创建 tasks

```typescript
// 创建 5 个相关任务
TaskCreate({ subject: "设计数据库模式", description: "..." })
TaskCreate({ subject: "实现登录 API", description: "..." })
TaskCreate({ subject: "实现注册 API", description: "..." })
TaskCreate({ subject: "编写单元测试", description: "..." })
TaskCreate({ subject: "部署到生产", description: "..." })

// 返回
Task #1 created
Task #2 created
Task #3 created
Task #4 created
Task #5 created
```

#### 第 2 步：建立依赖关系

```typescript
// Task 2 和 3 依赖 Task 1
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] })

// Task 4 同时依赖 Task 2 和 3
TaskUpdate({ taskId: "4", addBlockedBy: ["2", "3"] })

// Task 5 依赖 Task 4
TaskUpdate({ taskId: "5", addBlockedBy: ["4"] })
```

#### 第 3 步：查看任务列表

```typescript
TaskList()

// 返回
#1 [pending] 设计数据库模式
#2 [pending] 实现登录 API [blocked by #1]
#3 [pending] 实现注册 API [blocked by #1]
#4 [pending] 编写单元测试 [blocked by #2, #3]
#5 [pending] 部署到生产 [blocked by #4]
```

#### 第 4 步：开始工作

```typescript
// 标记 Task 1 为进行中
TaskUpdate({ taskId: "1", status: "in_progress" })

// 完成 Task 1
TaskUpdate({ taskId: "1", status: "completed" })

// 查看更新后的列表
TaskList()

// 返回 - Task 2 和 3 现在可以开始
#1 [completed] 设计数据库模式
#2 [pending] 实现登录 API
#3 [pending] 实现注册 API
#4 [pending] 编写单元测试 [blocked by #2, #3]
#5 [pending] 部署到生产 [blocked by #4]
```

#### 第 5 步：继续工作

重复：标记为 `in_progress` → 完成 → 标记为 `completed` → 下一个 task 自动可用

---

## 何时使用 Tasks

### ✅ 使用 Tasks

- 复杂多步骤功能（3+ 步）
- 需要追踪进度的工作
- 有先后依赖的开发任务
- 多会话跨越的工作
- 团队协作的项目追踪

### ❌ 不需要 Tasks

- 单个简单函数实现
- 单行修复或 typo 修正
- 单一明确的操作

---

## 最佳实践

### ✅ DO

**清晰的任务标题（命令式）**

```
✓ "实现用户认证"
✗ "认证相关工作"
```

**详细的描述（包含验收条件）**

```
描述：创建登录端点
- 验证用户名和密码
- 生成 JWT token
- 返回用户信息
- 错误处理
```

**合理的依赖关系**

- 只连接真实的前置条件
- 避免不必要的依赖

**及时更新状态**

- 开始工作时标记 `in_progress`
- 完成时标记 `completed`

### ❌ DON'T

- 创建过于细粒度的 tasks（每行代码一个 task）
- 忽视依赖关系，随意修改
- 创建循环依赖
- 长期不更新 task 状态

---

## 与其他工具的集成

### Tasks + Git 工作流

```
创建 tasks 规划功能
    ↓
TaskUpdate 标记为 in_progress
    ↓
本地开发 → git commit
    ↓
完成功能 → TaskUpdate 标记为 completed
    ↓
git push → 创建 PR
```

### Tasks + 项目文档

将重要的 task 集合记录在项目的 `TASKS.md`：

```markdown
## 认证功能实现

- [x] #1 - 设计数据库模式
- [ ] #2 - 实现登录 API
- [ ] #3 - 实现注册 API
- [ ] #4 - 编写单元测试
- [ ] #5 - 部署到生产
```

---

## 总结

Claude Code Tasks 是一个轻量级但功能完整的任务管理系统，设计用于：

- **组织**复杂的开发工作
- **追踪**多步骤功能的进度
- **管理**任务之间的依赖关系
- **支持**跨会话的工作连续性

通过文件系统级别的持久化和原子性操作设计，它提供了并发安全、高性能和易于维护的任务管理体验。
