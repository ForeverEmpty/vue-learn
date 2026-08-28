import { describe, expect, it } from 'vitest'
import { effect, reactive } from '../src'

describe('浅层 reactive：第四章', () => {
  it('返回代理对象并把读写转发给原对象', () => {
    const raw = { count: 0 }
    const state = reactive(raw)

    expect(state).not.toBe(raw)
    expect(state.count).toBe(0)

    state.count = 1
    expect(raw.count).toBe(1)
  })

  it('属性改变后重新执行读取过它的 effect', () => {
    const state = reactive({ count: 0 })
    let observed = -1
    let runs = 0

    effect(() => {
      runs++
      observed = state.count
    })

    state.count = 1

    expect(observed).toBe(1)
    expect(runs).toBe(2)
  })

  it('不同属性拥有各自独立的依赖集合', () => {
    const state = reactive({ count: 0, name: 'Mini Vue' })
    let countRuns = 0
    let nameRuns = 0

    effect(() => {
      countRuns++
      state.count
    })

    effect(() => {
      nameRuns++
      state.name
    })

    state.count = 1

    expect(countRuns).toBe(2)
    expect(nameRuns).toBe(1)
  })

  it('属性赋相同值时不重复执行 effect', () => {
    const state = reactive({ count: 0 })
    let runs = 0

    effect(() => {
      runs++
      state.count
    })

    state.count = 0

    expect(runs).toBe(1)
  })

  it('不同对象的同名属性拥有独立依赖集合', () => {
    const first = reactive({ count: 0 })
    const second = reactive({ count: 0 })
    let firstRuns = 0
    let secondRuns = 0

    effect(() => {
      firstRuns++
      first.count
    })

    effect(() => {
      secondRuns++
      second.count
    })

    first.count = 1

    expect(firstRuns).toBe(2)
    expect(secondRuns).toBe(1)
  })

  it('属性写入失败时不触发 effect', () => {
    const raw = { count: 0 }
    Object.defineProperty(raw, 'count', {
      writable: false,
    })
    const state = reactive(raw)
    let runs = 0

    effect(() => {
      runs++
      state.count
    })

    expect(() => {
      state.count = 1
    }).toThrow(TypeError)

    expect(runs).toBe(1)
  })
})
