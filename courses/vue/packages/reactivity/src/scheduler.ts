export type SchedulerJob = () => void

const queue = new Set<SchedulerJob>()
let isFlushPending = false
let currentFlushPromise: Promise<void> | null = null

const resolvedPromise = Promise.resolve()

function flushJobs(): void {
  try {
    queue.forEach(job => job())
  } finally {
    queue.clear()
    isFlushPending = false
    currentFlushPromise = null
  }
}

/** 将 job 加入去重队列，并安排一次微任务刷新。 */
export function queueJob(job: SchedulerJob): void {
  queue.add(job)

  if (isFlushPending) return

  isFlushPending = true
  currentFlushPromise = resolvedPromise.then(flushJobs)
}

export function nextTick<T>(callback?: () => T): Promise<T | undefined> {
  const promise = currentFlushPromise ?? resolvedPromise

  return promise.then(() => callback?.())
}
