import { describe, expect, it } from 'vitest'
import { effect, reactive } from '../src'

describe('深层 reactive 与 Proxy 缓存：第五章', () => {
  it('嵌套对象属性也能够追踪并触发 effect', () => {
    const state = reactive({
      profile: {
        name: 'Ada',
      },
    })
    let observed = ''
    let runs = 0

    effect(() => {
      runs++
      observed = state.profile.name
    })

    state.profile.name = 'Grace'

    expect(observed).toBe('Grace')
    expect(runs).toBe(2)
  })

  it('替换嵌套对象本身也能够触发 effect', () => {
    const state = reactive({
      profile: {
        name: 'Ada',
      },
    })
    let observed = ''
    let runs = 0

    effect(() => {
      runs++
      observed = state.profile.name
    })

    state.profile = { name: 'Grace' }

    expect(observed).toBe('Grace')
    expect(runs).toBe(2)
  })

  it('同一个原对象多次调用 reactive 返回同一个 Proxy', () => {
    const raw = { count: 0 }

    const first = reactive(raw)
    const second = reactive(raw)

    expect(second).toBe(first)
  })

  it('重复读取同一个嵌套对象时复用同一个 Proxy', () => {
    const raw = {
      profile: {
        name: 'Ada',
      },
    }
    const state = reactive(raw)

    const firstProfile = state.profile
    const secondProfile = state.profile

    expect(firstProfile).not.toBe(raw.profile)
    expect(secondProfile).toBe(firstProfile)
  })

  it('循环引用回到原对象时复用根 Proxy', () => {
    type CircularState = {
      count: number
      self?: CircularState
    }

    const raw: CircularState = { count: 0 }
    raw.self = raw

    const state = reactive(raw)

    expect(state.self).toBe(state)
  })

  it('对已经是 Proxy 的对象再次调用 reactive 时直接返回自身', () => {
    const observed = reactive({ count: 0 })

    expect(reactive(observed)).toBe(observed)
  })
})
