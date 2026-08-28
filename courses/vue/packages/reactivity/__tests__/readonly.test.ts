import { afterEach, describe, expect, it, vi } from 'vitest'
import { effect, isProxy, isReactive, isReadonly, reactive, readonly, toRaw } from '../src'
import { ReactiveFlags } from '../src/reactiveFlags'

type ConsoleTarget = {
  console: {
    warn: (...args: unknown[]) => void
  }
}

function mockConsoleWarn() {
  const { console: consoleTarget } = globalThis as unknown as ConsoleTarget
  return vi.spyOn(consoleTarget, 'warn').mockImplementation(() => {})
}

describe('readonly 与代理身份工具：第十三章', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('readonly 返回新代理并转发属性读取', () => {
    const raw = { count: 1 }
    const view = readonly(raw)

    expect(view).not.toBe(raw)
    expect(view.count).toBe(1)
  })

  it('嵌套对象会惰性转换为 readonly 代理', () => {
    const raw = { profile: { name: 'Ada' } }
    const view = readonly(raw)

    expect(view.profile).not.toBe(raw.profile)
    expect(isReadonly(view.profile)).toBe(true)
  })

  it('readonly 会拒绝属性写入并给出警告', () => {
    const raw = { count: 1 }
    const view = readonly(raw)
    const warn = mockConsoleWarn()

    const didSet = Reflect.set(view, 'count', 2)

    expect(didSet).toBe(true)
    expect(raw.count).toBe(1)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('readonly 会拒绝属性删除并给出警告', () => {
    const raw = { count: 1 }
    const view = readonly(raw)
    const warn = mockConsoleWarn()

    const didDelete = Reflect.deleteProperty(view, 'count')

    expect(didDelete).toBe(true)
    expect(raw).toHaveProperty('count', 1)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('同一个原对象会复用同一个 readonly 代理', () => {
    const raw = { count: 1 }

    expect(readonly(raw)).toBe(readonly(raw))
  })

  it('对 readonly 代理再次调用 readonly 会返回自身', () => {
    const view = readonly({ count: 1 })

    expect(readonly(view)).toBe(view)
  })

  it('身份工具能够区分 raw、reactive 与 readonly', () => {
    const raw = { count: 1 }
    const state = reactive(raw)
    const view = readonly(raw)

    expect(isReactive(raw)).toBe(false)
    expect(isReadonly(raw)).toBe(false)
    expect(isProxy(raw)).toBe(false)

    expect(isReactive(state)).toBe(true)
    expect(isReadonly(state)).toBe(false)
    expect(isProxy(state)).toBe(true)

    expect(isReactive(view)).toBe(false)
    expect(isReadonly(view)).toBe(true)
    expect(isProxy(view)).toBe(true)
  })

  it('深层 reactive 代理也能被 isReactive 识别', () => {
    const state = reactive({ profile: { name: 'Ada' } })

    expect(isReactive(state.profile)).toBe(true)
  })

  it('toRaw 能够还原 reactive 和 readonly 代理', () => {
    const raw = { count: 1 }

    expect(toRaw(reactive(raw))).toBe(raw)
    expect(toRaw(readonly(raw))).toBe(raw)
    expect(toRaw(raw)).toBe(raw)
  })

  it('身份查询不会被当作响应式业务依赖', () => {
    const state = reactive({ count: 1 })
    let observed = false
    let runs = 0

    effect(() => {
      runs++
      observed = isReactive(state)
    })

    expect(observed).toBe(true)

    Reflect.set(state, ReactiveFlags.IS_REACTIVE, false)

    expect(runs).toBe(1)
    expect(isReactive(state)).toBe(true)
  })

  it('从 raw 或 reactive 入口创建 readonly 会复用同一个代理', () => {
    const raw = { count: 1 }
    const state = reactive(raw)
    const rawView = readonly(raw)
    const stateView = readonly(state)

    expect(stateView).toBe(rawView)
    expect(toRaw(stateView)).toBe(raw)
  })

  it('对 readonly 代理调用 reactive 不会移除只读保护', () => {
    const raw = { count: 1 }
    const view = readonly(raw)
    const result = reactive(view)

    expect(result).toBe(view)
    expect(isReadonly(result)).toBe(true)
    expect(isReactive(result)).toBe(false)
  })

  it('重复读取同一个嵌套对象会复用 readonly 代理并可还原 raw', () => {
    const raw = { profile: { name: 'Ada' } }
    const view = readonly(raw)

    expect(view.profile).toBe(view.profile)
    expect(toRaw(view.profile)).toBe(raw.profile)
  })

  it('readonly 数组会保护索引并深层包装数组元素', () => {
    const rawItem = { count: 1 }
    const raw = [rawItem]
    const view = readonly(raw)
    const warn = mockConsoleWarn()

    const didSet = Reflect.set(view, 0, { count: 2 })

    expect(Array.isArray(view)).toBe(true)
    expect(isReadonly(view[0])).toBe(true)
    expect(toRaw(view[0])).toBe(rawItem)
    expect(didSet).toBe(true)
    expect(raw[0]).toBe(rawItem)
    expect(warn).toHaveBeenCalledOnce()
  })
})
