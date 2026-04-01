# Complete Guide to Claude Code Tasks

## Overview

Claude Code Tasks is a built-in task management system in Claude Code. It is designed to track, organize, and manage complex development work during software projects. It supports cross-session persistence, dependency management, and concurrency-safe operations.

---

## Key Features

### ✅ Cross-Session Persistence

Tasks are not lost when a session ends. All task data is stored in `~/.claude/tasks/` and loaded automatically when a new session starts.

```
Session 1: Create 5 tasks and complete Task 1
           ↓ Saved to ~/.claude/tasks/
Session 2: TaskList shows all 5 tasks, with Task 1 completed
           Continue working on Tasks 2-5
```

### ✅ Dependency Management

Claude Code Tasks supports complex task dependency graphs and automatically manages blocked states. When a task is completed, any tasks blocked by it automatically become available.

```
Task 1 (Database)
  ├─→ Task 2 (Login API)     [blocked]
  └─→ Task 3 (Signup API)    [blocked]
        └─→ Task 4 (Tests)   [blocked by both]
              └─→ Task 5 (Deploy)  [blocked]

After Task 1 is completed:
Tasks 2 and 3 automatically become available ✓
```

### ✅ Atomic and Concurrency-Safe

Each task is stored as its own JSON file. Updating any task only requires writing one small file, around 380 bytes, which helps avoid conflicts when multiple sessions operate in parallel.

### ✅ Project Isolation

Tasks from different projects are managed independently. A UUID is used to ensure each project is globally unique, so separate projects do not interfere with each other.

---

## Tool Reference

### 1. TaskCreate - Create a New Task

**Purpose**: Creates a new task

#### Inputs

| Parameter     | Type   | Required | Description                                                                    |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `subject`     | string | ✅       | Task title in imperative form. Example: `"Fix login bug"`                      |
| `description` | string | ✅       | Detailed description including requirements and acceptance criteria            |
| `activeForm`  | string | ❌       | Display text used while the task is in progress. Example: `"Fixing login bug"` |
| `metadata`    | object | ❌       | Arbitrary key-value pairs for extra information such as priority or labels     |

#### Return Value

```
Task #{id} created successfully: {subject}
```

#### Example

```typescript
TaskCreate {
  subject: "Implement user login"
  description: "Add a login form that includes:
- Input validation
- API integration
- Error handling
- Unit tests"
  activeForm: "Implementing user login"
  metadata: { priority: "high", component: "auth" }
}

// Returns
Task #1 created successfully: Implement user login
```

---

### 2. TaskList - View All Tasks

**Purpose**: Lists all tasks in the current project, including status and dependencies

#### Inputs

No inputs

#### Return Value

Returns a summary list of all tasks:

```
#{id} [{status}] {subject} [blocked by #{id}, #{id}]
```

Field descriptions:

- `#{id}` - Task ID
- `[{status}]` - Status: `pending`, `in_progress`, or `completed`
- `{subject}` - Task title
- `[blocked by ...]` - IDs of tasks blocking this task, if any

#### Example

```
#1 [completed] Design and create the user authentication database schema
#2 [pending] Implement the login API endpoint
#3 [pending] Implement the signup API endpoint
#4 [pending] Write unit tests for the authentication feature [blocked by #2, #3]
#5 [pending] Deploy the authentication feature to production [blocked by #4]
```

If there are no tasks:

```
No tasks found
```

---

### 3. TaskUpdate - Update a Task

**Purpose**: Updates task properties, status, and dependencies

#### Inputs

| Parameter      | Type     | Required | Description                                                                      |
| -------------- | -------- | -------- | -------------------------------------------------------------------------------- |
| `taskId`       | string   | ✅       | The task ID to update. Example: `"1"`                                            |
| `status`       | enum     | ❌       | New status: `pending`, `in_progress`, or `completed`                             |
| `subject`      | string   | ❌       | Updated task title                                                               |
| `description`  | string   | ❌       | Updated task description                                                         |
| `activeForm`   | string   | ❌       | Updated in-progress display text                                                 |
| `owner`        | string   | ❌       | Task owner, such as an agent name or username                                    |
| `addBlockedBy` | string[] | ❌       | List of task IDs to add as blockers for this task                                |
| `addBlocks`    | string[] | ❌       | List of task IDs that this task should block                                     |
| `metadata`     | object   | ❌       | Key-value pairs to merge into metadata. Set a value to `null` to remove that key |

#### Return Value

```
Updated task #{id} {field}
```

#### Examples

**Mark as in progress:**

```typescript
TaskUpdate {
  taskId: "1"
  status: "in_progress"
}

// Returns
Updated task #1 status
```

**Add dependencies:**

```typescript
// Task 2 is blocked by Task 1
TaskUpdate {
  taskId: "2"
  addBlockedBy: ["1"]
}

// Task 4 is blocked by both Task 2 and Task 3
TaskUpdate {
  taskId: "4"
  addBlockedBy: ["2", "3"]
}
```

**Mark as completed:**

```typescript
TaskUpdate {
  taskId: "1"
  status: "completed"
}
```

**Update metadata:**

```typescript
TaskUpdate {
  taskId: "1"
  metadata: {
    priority: "high"
    reviewed: true
    assignee: null  // Removes the assignee key
  }
}
```

---

### 4. TaskGet - Get Task Details

**Purpose**: Retrieves the complete information for a single task

#### Inputs

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `taskId`  | string | ✅       | Task ID. Example: `"1"` |

#### Return Value

Returns the full task object:

```typescript
{
  id: string
  subject: string
  description: string
  status: "pending" | "in_progress" | "completed"
  owner?: string
  blocks?: string[]      // Task IDs blocked by this task
  blockedBy?: string[]   // Task IDs blocking this task
  metadata?: object
  activeForm?: string
}
```

#### Example

```typescript
TaskGet {
  taskId: "1"
}

// Returns
{
  id: "1"
  subject: "Design and create the user authentication database schema"
  description: "Covers:\n- Database schema validation\n- API endpoint logic..."
  status: "completed"
  owner: "claude"
  blocks: ["2", "3"]
  blockedBy: []
  metadata: { priority: "high" }
  activeForm: "Writing unit tests"
}
```

---

## Storage Layout

### Filesystem Structure

```
~/.claude/tasks/
└── {project-id}/                    ← UUID uniquely identifying a project
    ├── 1.json                       ← Task ID 1
    ├── 2.json                       ← Task ID 2
    ├── 3.json                       ← Task ID 3
    ├── 4.json                       ← Task ID 4
    └── 5.json                       ← Task ID 5
```

### Individual Task File Structure

**Task 1.json (no dependencies):**

```json
{
  "id": "1",
  "subject": "Design and create the user authentication database schema",
  "description": "Covers:\n- Database schema validation...",
  "activeForm": "Writing unit tests",
  "status": "completed",
  "blocks": ["2", "3"],
  "blockedBy": []
}
```

**Task 4.json (multiple dependencies):**

```json
{
  "id": "4",
  "subject": "Write unit tests for the authentication feature",
  "description": "Covers:\n- Login endpoint...",
  "activeForm": "Writing unit tests",
  "status": "pending",
  "blocks": ["5"],
  "blockedBy": ["2", "3"]
}
```

### Design Benefits

| Aspect            | Design                 | Why it helps                                                      |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| Project isolation | `project-id` folder    | Keeps multiple projects separate and avoids collisions with UUIDs |
| Atomic updates    | One file per task      | Updating a single task only requires writing one small file       |
| Fast lookup       | ID-based access        | O(1) lookup without scanning the whole set                        |
| Dependency graph  | `blocks` + `blockedBy` | Bidirectional links make dependency traversal fast                |
| File size         | ~380 bytes/task        | Very small, fast to read and write, easy to back up               |

---

## Typical Workflow

### Scenario: Implementing User Authentication

#### Step 1: Create tasks

```typescript
// Create 5 related tasks
TaskCreate({ subject: "Design the database schema", description: "..." })
TaskCreate({ subject: "Implement the login API", description: "..." })
TaskCreate({ subject: "Implement the signup API", description: "..." })
TaskCreate({ subject: "Write unit tests", description: "..." })
TaskCreate({ subject: "Deploy to production", description: "..." })

// Returns
Task #1 created
Task #2 created
Task #3 created
Task #4 created
Task #5 created
```

#### Step 2: Add dependencies

```typescript
// Tasks 2 and 3 depend on Task 1
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] });
TaskUpdate({ taskId: "3", addBlockedBy: ["1"] });

// Task 4 depends on both Tasks 2 and 3
TaskUpdate({ taskId: "4", addBlockedBy: ["2", "3"] });

// Task 5 depends on Task 4
TaskUpdate({ taskId: "5", addBlockedBy: ["4"] });
```

#### Step 3: View the task list

```typescript
TaskList()

// Returns
#1 [pending] Design the database schema
#2 [pending] Implement the login API [blocked by #1]
#3 [pending] Implement the signup API [blocked by #1]
#4 [pending] Write unit tests [blocked by #2, #3]
#5 [pending] Deploy to production [blocked by #4]
```

#### Step 4: Start working

```typescript
// Mark Task 1 as in progress
TaskUpdate({ taskId: "1", status: "in_progress" })

// Complete Task 1
TaskUpdate({ taskId: "1", status: "completed" })

// View the updated list
TaskList()

// Returns - Tasks 2 and 3 are now available
#1 [completed] Design the database schema
#2 [pending] Implement the login API
#3 [pending] Implement the signup API
#4 [pending] Write unit tests [blocked by #2, #3]
#5 [pending] Deploy to production [blocked by #4]
```

#### Step 5: Continue the same pattern

Update to `in_progress` → finish the work → update to `completed` → the next task becomes available automatically

---

## When to Use Tasks

### ✅ Good Use Cases

- Complex features with 3 or more steps
- Work that requires progress tracking
- Development tasks with dependencies
- Work spanning multiple sessions
- Team-based project tracking

### ❌ Cases Where Tasks Are Unnecessary

- Implementing a single simple function
- A one-line fix or typo correction
- One clear, isolated action

---

## Best Practices

### ✅ DO

**Use clear task titles in imperative form**

```
✓ "Implement user authentication"
✗ "Authentication-related work"
```

**Write detailed descriptions with acceptance criteria**

```
Description: Create the login endpoint
- Validate username and password
- Generate a JWT token
- Return user information
- Handle errors
```

**Keep dependencies realistic**

- Only link real prerequisites
- Avoid unnecessary dependencies

**Update task status promptly**

- Mark `in_progress` when work starts
- Mark `completed` when work is done

### ❌ DON'T

- Create tasks that are too granular, such as one per line of code
- Ignore dependencies and modify them casually
- Create circular dependencies
- Leave task status outdated for long periods

---

## Integration With Other Tools

### Tasks + Git Workflow

```
Create tasks to plan the feature
    ↓
Use TaskUpdate to mark a task as in_progress
    ↓
Develop locally → git commit
    ↓
Finish the feature → TaskUpdate to mark completed
    ↓
git push → create a PR
```

### Tasks + Project Documentation

You can record important task groups in the project's `TASKS.md`:

```markdown
## Authentication Feature Implementation

- [x] #1 - Design the database schema
- [ ] #2 - Implement the login API
- [ ] #3 - Implement the signup API
- [ ] #4 - Write unit tests
- [ ] #5 - Deploy to production
```

---

## Summary

Claude Code Tasks is a lightweight but capable task management system designed to:

- **Organize** complex development work
- **Track** progress across multi-step features
- **Manage** dependencies between tasks
- **Support** continuity across sessions

With filesystem-level persistence and atomic update behavior, it provides a task management workflow that is concurrency-safe, fast, and easy to maintain.
