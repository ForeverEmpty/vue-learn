export type SchedulerJob = () => void;

const queue = new Set<SchedulerJob>();
const pendingPostFlushCbs = new Set<SchedulerJob>();
let isFlushPending = false;
let isFlushPostPending = false;
let currentFlushPromise: Promise<void> | null = null;

const resolvedPromise = Promise.resolve();

function flushJobs(): void {
  try {
    queue.forEach((job) => job());
  } finally {
    queue.clear();
    isFlushPending = false;
    currentFlushPromise = null;
  }
}

function flushPostJobs(): void {
  try {
    pendingPostFlushCbs.forEach((job) => job());
  } finally {
    pendingPostFlushCbs.clear();
    isFlushPostPending = false;
  }
}

/** 将 job 加入去重队列，并安排一次微任务刷新。 */
export function queueJob(job: SchedulerJob): void {
  queue.add(job);

  if (isFlushPending) return;

  isFlushPending = true;
  currentFlushPromise = resolvedPromise.then(flushJobs);
}

export function queuePostFlushJob(job: SchedulerJob): void {
  pendingPostFlushCbs.add(job);

  if (isFlushPostPending) return;

  isFlushPostPending = true;
  queueJob(flushPostJobs);
}

export function nextTick<T>(callback?: () => T): Promise<T | undefined> {
  const promise = currentFlushPromise ?? resolvedPromise;

  return promise.then(() => callback?.());
}
