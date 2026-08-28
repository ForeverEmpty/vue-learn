import { describe, expect, it } from 'vitest'
import { effect, ref, stop } from '../src'

describe('effect 生命周期与 stop：第八章', () => {
  it('effect 返回 runner，runner 可以手动执行 effect', () => {
    const count = ref(0)
    let observed = -1
    const runner = effect(() => {
      observed = count.value
    })

    count.value = 1
    runner()

    expect(observed).toBe(1)
  })

  it('stop 后修改依赖不再自动执行 effect', () => {
    const count = ref(0)
    let runs = 0
    const runner = effect(() => {
      runs++
      count.value
    })

    stop(runner)
    count.value = 1

    expect(runs).toBe(1)
  })

  it('stop 后手动 runner 可以执行，但不会重新收集依赖', () => {
    const count = ref(0)
    let observed = -1
    let runs = 0
    const runner = effect(() => {
      runs++
      observed = count.value
    })

    stop(runner)
    runner()
    count.value = 1

    expect(observed).toBe(0)
    expect(runs).toBe(2)
  })

  it('stop 会清理多个依赖，并且可以重复调用', () => {
    const left = ref(0)
    const right = ref(0)
    let runs = 0
    const runner = effect(() => {
      runs++
      left.value
      right.value
    })

    stop(runner)
    stop(runner)
    left.value = 1
    right.value = 1

    expect(runs).toBe(1)
  })
})
