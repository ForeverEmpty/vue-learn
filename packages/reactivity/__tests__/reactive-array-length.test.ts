import { describe, expect, it } from 'vitest'
import { isArrayIndex } from '@mini-vue/shared'
import { effect, reactive } from '../src'

describe('reactive 数组索引与 length：第十一章', () => {
  it('只把规范范围内的非负整数字符串识别为数组索引', () => {
    expect(isArrayIndex('0')).toBe(true)
    expect(isArrayIndex('2')).toBe(true)
    expect(isArrayIndex('4294967294')).toBe(true)

    expect(isArrayIndex('02')).toBe(false)
    expect(isArrayIndex('-1')).toBe(false)
    expect(isArrayIndex('1.5')).toBe(false)
    expect(isArrayIndex('4294967295')).toBe(false)
    expect(isArrayIndex(Symbol.iterator)).toBe(false)
  })

  it('更新已有索引会触发依赖该索引的 effect', () => {
    const list = reactive(['A'])
    let firstItem = ''
    let runs = 0

    effect(() => {
      runs++
      firstItem = list[0]
    })

    list[0] = 'B'

    expect(firstItem).toBe('B')
    expect(runs).toBe(2)
  })

  it('push 新元素会触发依赖 length 的 effect', () => {
    const list = reactive(['A'])
    let observedLength = 0
    let runs = 0

    effect(() => {
      runs++
      observedLength = list.length
    })

    list.push('B')

    expect(observedLength).toBe(2)
    expect(runs).toBe(2)
  })

  it('写入超出当前范围的索引会触发依赖 length 的 effect', () => {
    const list = reactive<string[]>([])
    let observedLength = 0
    let runs = 0

    effect(() => {
      runs++
      observedLength = list.length
    })

    list[3] = 'D'

    expect(observedLength).toBe(4)
    expect(runs).toBe(2)
  })

  it('更新已有索引不会触发只依赖 length 的 effect', () => {
    const list = reactive(['A'])
    let runs = 0

    effect(() => {
      runs++
      list.length
    })

    list[0] = 'B'

    expect(runs).toBe(1)
  })

  it('新增普通命名属性不会触发只依赖 length 的 effect', () => {
    const list = reactive([]) as string[] & { label?: string }
    let runs = 0

    effect(() => {
      runs++
      list.length
    })

    list.label = 'letters'

    expect(runs).toBe(1)
  })

  it('缩短 length 会触发依赖被截断索引的 effect', () => {
    const list = reactive(['A', 'B', 'C'])
    let thirdItem: string | undefined
    let runs = 0

    effect(() => {
      runs++
      thirdItem = list[2]
    })

    list.length = 2

    expect(thirdItem).toBeUndefined()
    expect(runs).toBe(2)
  })

  it('缩短 length 会触发依赖数组键集合的 effect', () => {
    const list = reactive(['A', 'B', 'C'])
    let keys: string[] = []
    let runs = 0

    effect(() => {
      runs++
      keys = Object.keys(list)
    })

    list.length = 1

    expect(keys).toEqual(['0'])
    expect(runs).toBe(2)
  })

  it('增大 length 不会触发仍然为 undefined 的索引依赖', () => {
    const list = reactive<string[]>([])
    let runs = 0

    effect(() => {
      runs++
      list[2]
    })

    list.length = 3

    expect(runs).toBe(1)
  })

  it('新增索引同时命中索引和 length 依赖时只执行一次', () => {
    const list = reactive<string[]>([])
    let runs = 0

    effect(() => {
      runs++
      list.length
      list[0]
    })

    list[0] = 'A'

    expect(runs).toBe(2)
  })

  it('填充旧 length 范围内的空位只触发键集合依赖', () => {
    const list = reactive(new Array<string>(3))
    let observedLength = 0
    let observedKeys: string[] = []
    let lengthRuns = 0
    let keysRuns = 0

    effect(() => {
      lengthRuns++
      observedLength = list.length
    })

    effect(() => {
      keysRuns++
      observedKeys = Object.keys(list)
    })

    list[1] = 'B'

    expect(observedLength).toBe(3)
    expect(observedKeys).toEqual(['1'])
    expect(lengthRuns).toBe(1)
    expect(keysRuns).toBe(2)
  })

  it('删除数组索引会更新索引和键集合，但不会改变 length', () => {
    const list = reactive(['A', 'B'])
    let secondItem: string | undefined
    let observedKeys: string[] = []
    let observedLength = 0
    let itemRuns = 0
    let keysRuns = 0
    let lengthRuns = 0

    effect(() => {
      itemRuns++
      secondItem = list[1]
    })

    effect(() => {
      keysRuns++
      observedKeys = Object.keys(list)
    })

    effect(() => {
      lengthRuns++
      observedLength = list.length
    })

    const didDelete = Reflect.deleteProperty(list, '1')

    expect(didDelete).toBe(true)
    expect(secondItem).toBeUndefined()
    expect(observedKeys).toEqual(['0'])
    expect(observedLength).toBe(2)
    expect(itemRuns).toBe(2)
    expect(keysRuns).toBe(2)
    expect(lengthRuns).toBe(1)
  })
})
