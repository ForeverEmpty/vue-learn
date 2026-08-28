import { describe, expect, it } from 'vitest'
import { computed, effect, ref } from '../src'

describe('computed 的缓存、惰性与失效：第六章', () => {
  it('第一次读取前不会执行 getter，读取后返回计算结果', () => {
    const count = ref(1)
    let getterRuns = 0
    const doubled = computed(() => {
      getterRuns++
      return count.value * 2
    })

    expect(getterRuns).toBe(0)
    expect(doubled.value).toBe(2)
    expect(getterRuns).toBe(1)
  })

  it('重复读取时复用缓存，不重复执行 getter', () => {
    const count = ref(1)
    let getterRuns = 0
    const doubled = computed(() => {
      getterRuns++
      return count.value * 2
    })

    expect(doubled.value).toBe(2)
    expect(doubled.value).toBe(2)
    expect(getterRuns).toBe(1)
  })

  it('依赖变化后只标记失效，下一次读取时才重新计算', () => {
    const count = ref(1)
    let getterRuns = 0
    const doubled = computed(() => {
      getterRuns++
      return count.value * 2
    })

    expect(doubled.value).toBe(2)
    expect(getterRuns).toBe(1)

    count.value = 2

    expect(getterRuns).toBe(1)
    expect(doubled.value).toBe(4)
    expect(getterRuns).toBe(2)
  })

  it('computed 被 effect 使用时，依赖变化会更新消费者', () => {
    const count = ref(1)
    const doubled = computed(() => count.value * 2)
    let observed = 0
    let effectRuns = 0

    effect(() => {
      effectRuns++
      observed = doubled.value
    })

    expect(observed).toBe(2)
    expect(effectRuns).toBe(1)

    count.value = 3

    expect(observed).toBe(6)
    expect(effectRuns).toBe(2)
  })

  it('computed 的 getter 可以依赖多个响应式值', () => {
    const first = ref(1)
    const second = ref(2)
    let getterRuns = 0
    const total = computed(() => {
      getterRuns++
      return first.value + second.value
    })

    expect(total.value).toBe(3)
    first.value = 4
    second.value = 5

    expect(total.value).toBe(9)
    expect(getterRuns).toBe(2)
  })

  it('computed 可以依赖另一个 computed 并逐层通知消费者', () => {
    const count = ref(1)
    let doubledRuns = 0
    let plusOneRuns = 0
    let consumerRuns = 0

    const doubled = computed(() => {
      doubledRuns++
      return count.value * 2
    })
    const plusOne = computed(() => {
      plusOneRuns++
      return doubled.value + 1
    })
    let observed = 0

    effect(() => {
      consumerRuns++
      observed = plusOne.value
    })

    expect(observed).toBe(3)
    expect(plusOne.value).toBe(3)
    expect(doubledRuns).toBe(1)
    expect(plusOneRuns).toBe(1)
    expect(consumerRuns).toBe(1)

    count.value = 2

    expect(observed).toBe(5)
    expect(doubledRuns).toBe(2)
    expect(plusOneRuns).toBe(2)
    expect(consumerRuns).toBe(2)
  })
})
