export type SchedulerJob = () => void;

const queue = new Set<SchedulerJob>();
const pendingPostFlushCbs = new Set<SchedulerJob>();
let isFlushPending = false;
let currentFlushPromise: Promise<void> | null = null;

const resolvedPromise = Promise.resolve();

function flushJobs(): void {
  try {
    do {
      queue.forEach((job) => job());
      queue.clear();
      flushPostJobs();
    } while (queue.size > 0 || pendingPostFlushCbs.size > 0);
  } finally {
    queue.clear();
    pendingPostFlushCbs.clear();
    isFlushPending = false;
    currentFlushPromise = null;
  }
}

function flushPostJobs(): void {
  pendingPostFlushCbs.forEach((job) => job());
  pendingPostFlushCbs.clear();
}

function queueFlush(): void {
  if (isFlushPending) return;

  isFlushPending = true;
  currentFlushPromise = resolvedPromise.then(flushJobs);
}

/** 将 job 加入去重队列，并安排一次微任务刷新。 */
export function queueJob(job: SchedulerJob): void {
  queue.add(job);
  queueFlush();
}

/** 将 job 加入 post 队列；主队列全部执行后才刷新 post 队列。 */
export function queuePostFlushJob(job: SchedulerJob): void {
  pendingPostFlushCbs.add(job);
  queueFlush();
}

export function nextTick<T>(callback?: () => T): Promise<T | undefined> {
  const promise = currentFlushPromise ?? resolvedPromise;

  return promise.then(() => callback?.());
}
