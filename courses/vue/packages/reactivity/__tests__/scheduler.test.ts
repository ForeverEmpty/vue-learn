import { describe, expect, it } from 'vitest'
import { effect, nextTick, queueJob, ref } from '../src'

describe('scheduler 队列与 nextTick：第九章', () => {
  it('带 scheduler 的 effect 不会在 source 改变时立即执行', async () => {
    const count = ref(0)
    let runs = 0
    let runner!: () => void

    runner = effect(
      () => {
        runs++
        count.value
      },
      {
        scheduler: () => queueJob(runner),
      },
    )

    count.value = 1

    expect(runs).toBe(1)

    await nextTick()

    expect(runs).toBe(2)
  })

  it('同一个 tick 内多次修改只执行一次 job', async () => {
    const count = ref(0)
    let runs = 0
    let runner!: () => void

    runner = effect(
      () => {
        runs++
        count.value
      },
      {
        scheduler: () => queueJob(runner),
      },
    )

    count.value = 1
    count.value = 2

    expect(runs).toBe(1)

    await nextTick()

    expect(runs).toBe(2)
  })

  it('nextTick callback 在当前队列刷新后执行', async () => {
    const events: string[] = []

    queueJob(() => events.push('job'))
    events.push('sync')

    await nextTick(() => {
      events.push('nextTick')
    })

    expect(events).toEqual(['sync', 'job', 'nextTick'])
  })

  it('nextTick 不传 callback 时仍然返回等待当前队列的 Promise', async () => {
    const events: string[] = []

    queueJob(() => events.push('job'))
    const tickPromise = nextTick()
    events.push('sync')

    expect(events).toEqual(['sync'])

    await tickPromise

    expect(events).toEqual(['sync', 'job'])
  })

  it('同一个 job 在下一轮 tick 可以重新排队', async () => {
    let runs = 0
    const job = () => {
      runs++
    }

    queueJob(job)
    queueJob(job)
    await nextTick()

    expect(runs).toBe(1)

    queueJob(job)
    await nextTick()

    expect(runs).toBe(2)
  })

  it('没有 scheduler 的普通 effect 仍然同步执行', () => {
    const count = ref(0)
    let observed = 0

    effect(() => {
      observed = count.value
    })

    count.value = 1

    expect(observed).toBe(1)
  })
})
