import { ulid } from "ulid";

export type Task = {
  key: string;
  execute: () => Promise<void>;
}

type TaskStatus = {
  id: string
  task: Task
} & (
  {
    status: 'pending' | 'completed' | 'failed'
  } | {
    status: 'running',
    promise: Promise<void>
  }
)

type Options = {
  maxConcurrency: number
}

export class TaskExecutor {
  private taskStatuses: TaskStatus[] = []
  private executionPromise?: {
    resolve: () => void
    reject: (reason?: unknown) => void
    promise: Promise<void>
  }
  private options: Options

  constructor(options?: Partial<Options>) {
    this.options = {
      maxConcurrency: 10,
      ...options,
    }
  }

  private setExecutionPromise() {
    let resolveExecution: (() => void) | undefined
    let rejectExecution: ((reason?: unknown) => void) | undefined

    const promise = new Promise<void>((resolve, reject) => {
      resolveExecution = resolve
      rejectExecution = reject
    })

    if (resolveExecution === undefined || rejectExecution === undefined) {
      throw new Error('Illegal state: Promise not created')
    }

    this.executionPromise = {
      resolve: resolveExecution,
      reject: rejectExecution,
      promise,
    }
  }

  public setTasks(tasks: Task[]) {
    const newTaskStatuses: TaskStatus[] = tasks.map((task) => ({
      id: `${task.key}-${ulid()}`,
      status: 'pending',
      task,
    }))

    this.taskStatuses.push(...newTaskStatuses)
  }

  private get pendingTasks() {
    return this.taskStatuses.filter((task) => task.status === 'pending')
  }

  private get runningTasks() {
    return this.taskStatuses.filter((task) => task.status === 'running')
  }

  private updateStatus(id: string, status: TaskStatus) {
    const found = this.taskStatuses.find((task) => task.id === id)

    if (!found) {
      throw new Error(`Task not found: ${id}`)
    }

    Object.assign(found, status)
  }

  public async execute() {
    this.setExecutionPromise()
    this.refresh()
    await this.executionPromise?.promise
  }

  private refresh() {
    if (this.runningTasks.length === 0 && this.pendingTasks.length === 0) {
      this.executionPromise?.resolve()
      console.log('execution completed.')
      return;
    }

    const remainingTaskCount = this.options.maxConcurrency - this.runningTasks.length

    if (remainingTaskCount <= 0) {
      return;
    }

    for (const task of this.pendingTasks.slice(0, remainingTaskCount)) {
      this.updateStatus(task.id, {
        id: task.id,
        status: 'running',
        task: task.task,
        promise: (async () => {
          try {
            await task.task.execute() 

            this.updateStatus(task.id, {
              id: task.id,
              status: 'completed',
              task: task.task,
            })
          } catch (error) {
            console.error(error)

            this.updateStatus(task.id, {
              id: task.id,
              status: 'failed',
              task: task.task,
            })
          } finally {
            this.refresh()
          }
        })(),
      })
    }
  }
}
