import { describe, expect, it } from 'vitest'
import { effect, reactive } from '../src'

describe('reactive 对象结构操作：第十章', () => {
  it('in 操作会追踪属性的新增和删除', () => {
    const state = reactive<{ name?: string }>({})
    let hasName = false
    let runs = 0

    effect(() => {
      runs++
      hasName = 'name' in state
    })

    expect(hasName).toBe(false)
    expect(runs).toBe(1)

    state.name = 'Ada'

    expect(hasName).toBe(true)
    expect(runs).toBe(2)

    delete state.name

    expect(hasName).toBe(false)
    expect(runs).toBe(3)
  })

  it('Object.keys 会在属性新增或删除时更新', () => {
    const state = reactive<Record<string, number>>({ count: 0 })
    let keys = ''
    let runs = 0

    effect(() => {
      runs++
      keys = Object.keys(state).join(',')
    })

    state.total = 1

    expect(keys).toBe('count,total')
    expect(runs).toBe(2)

    delete state.count

    expect(keys).toBe('total')
    expect(runs).toBe(3)
  })

  it('删除被直接读取的属性会触发 effect', () => {
    const state = reactive<{ name?: string }>({ name: 'Ada' })
    let observed: string | undefined
    let runs = 0

    effect(() => {
      runs++
      observed = state.name
    })

    delete state.name

    expect(observed).toBeUndefined()
    expect(runs).toBe(2)
  })

  it('更新已有属性不会触发只依赖 Object.keys 的 effect', () => {
    const state = reactive({ count: 0 })
    let runs = 0

    effect(() => {
      runs++
      Object.keys(state)
    })

    state.count = 1

    expect(runs).toBe(1)
  })

  it('新增值为 undefined 的属性仍会触发结构依赖', () => {
    const state = reactive<{ optional?: undefined }>({})
    let keys: string[] = []
    let runs = 0

    effect(() => {
      runs++
      keys = Object.keys(state)
    })

    state.optional = undefined

    expect(keys).toEqual(['optional'])
    expect(runs).toBe(2)
  })

  it('删除不存在的属性不会触发结构依赖', () => {
    const state = reactive<{ missing?: number }>({})
    let runs = 0

    effect(() => {
      runs++
      Object.keys(state)
    })

    delete state.missing

    expect(runs).toBe(1)
  })

  it('结构变化命中同一个 effect 的多个依赖时只执行一次', () => {
    const state = reactive<{ name?: string }>({})
    let runs = 0

    effect(() => {
      runs++
      state.name
      Object.keys(state)
    })

    state.name = 'Ada'

    expect(runs).toBe(2)
  })
})
