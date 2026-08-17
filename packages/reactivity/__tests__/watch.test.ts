import { describe, expect, it } from 'vitest'
import { computed, ref, watch } from '../src'

describe('watch 的新旧值与调度隔离：第七章', () => {
  it('创建时只收集依赖，变化后才使用新旧值调用 callback', () => {
    const count = ref(0)
    const records: Array<[number, number]> = []

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue])
      },
    )

    expect(records).toEqual([])

    count.value = 1

    expect(records).toEqual([[1, 0]])
  })

  it('连续变化时把上一次结果作为下一次 oldValue', () => {
    const count = ref(0)
    const records: Array<[number, number]> = []

    watch(
      () => count.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue])
      },
    )

    count.value = 1
    count.value = 2

    expect(records).toEqual([
      [1, 0],
      [2, 1],
    ])
  })

  it('callback 中读取的响应式值不会成为 watch 的源依赖', () => {
    const count = ref(0)
    const label = ref('A')
    let callbackRuns = 0

    watch(
      () => count.value,
      () => {
        callbackRuns++
        label.value
      },
    )

    count.value = 1
    expect(callbackRuns).toBe(1)

    label.value = 'B'

    expect(callbackRuns).toBe(1)
  })

  it('条件 source 切换后会清理旧依赖并收集新依赖', () => {
    const useFirst = ref(true)
    const first = ref(1)
    const second = ref(10)
    const records: Array<[number, number]> = []

    watch(
      () => (useFirst.value ? first.value : second.value),
      (newValue, oldValue) => {
        records.push([newValue, oldValue])
      },
    )

    useFirst.value = false
    first.value = 2
    second.value = 11

    expect(records).toEqual([
      [10, 1],
      [11, 10],
    ])
  })

  it('依赖触发但 source 结果未变化时不调用 callback', () => {
    const useFirst = ref(true)
    const first = ref(1)
    const second = ref(1)
    let callbackRuns = 0

    watch(
      () => (useFirst.value ? first.value : second.value),
      () => {
        callbackRuns++
      },
    )

    useFirst.value = false

    expect(callbackRuns).toBe(0)

    second.value = 2

    expect(callbackRuns).toBe(1)
  })

  it('可以把 computed 作为 watch source', () => {
    const count = ref(1)
    const doubled = computed(() => count.value * 2)
    const records: Array<[number, number]> = []

    watch(
      () => doubled.value,
      (newValue, oldValue) => {
        records.push([newValue, oldValue])
      },
    )

    count.value = 2

    expect(records).toEqual([[4, 2]])
  })
})
