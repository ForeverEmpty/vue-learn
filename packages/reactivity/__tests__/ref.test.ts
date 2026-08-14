import { describe, expect, it } from 'vitest'
import { effect, ref } from '../src'

describe('ref 与 effect：第一阶段', () => {
  it('注册 effect 时立即执行一次', () => {
    let runs = 0

    effect(() => {
      runs++
    })

    expect(runs).toBe(1)
  })

  it('ref 改变后重新执行读取过它的 effect', () => {
    const count = ref(0)
    let observed = -1
    let runs = 0

    effect(() => {
      runs++
      observed = count.value
    })

    expect(observed).toBe(0)
    count.value = 1

    expect(observed).toBe(1)
    expect(runs).toBe(2)
  })

  it('赋相同值时不重复执行 effect', () => {
    const count = ref(0)
    let runs = 0

    effect(() => {
      runs++
      count.value
    })

    count.value = 0

    expect(runs).toBe(1)
  })

  it('没有读取某个 ref 的 effect 不会被它触发', () => {
    const used = ref(0)
    const unused = ref(0)
    let runs = 0

    effect(() => {
      runs++
      used.value
    })

    unused.value = 1

    expect(runs).toBe(1)
  })

  it('同一个 effect 多次读取同一个 ref 也只订阅一次', () => {
    const count = ref(0)
    let runs = 0

    effect(() => {
      runs++
      count.value
      count.value
    })

    count.value = 1

    expect(runs).toBe(2)
  })

  it('同一个 ref 可以通知多个 effect', () => {
    const count = ref(0)
    let firstObserved = -1
    let secondObserved = -1

    effect(() => {
      firstObserved = count.value
    })
    effect(() => {
      secondObserved = count.value * 2
    })

    count.value = 2

    expect(firstObserved).toBe(2)
    expect(secondObserved).toBe(4)
  })

  it('NaN 再次赋值为 NaN 时不重复执行 effect', () => {
    const value = ref(Number.NaN)
    let runs = 0

    effect(() => {
      runs++
      value.value
    })

    value.value = Number.NaN

    expect(runs).toBe(1)
  })
})
