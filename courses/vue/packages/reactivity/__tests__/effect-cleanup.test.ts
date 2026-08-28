import { describe, expect, it } from 'vitest'
import { effect, ref } from '../src'

describe('effect 分支依赖清理：第二章', () => {
  it('重新执行时能够订阅新分支', () => {
    const usePrimary = ref(true)
    const primary = ref('主分支')
    const fallback = ref('备用分支')
    let displayed = ''

    effect(() => {
      displayed = usePrimary.value ? primary.value : fallback.value
    })

    usePrimary.value = false
    expect(displayed).toBe('备用分支')

    fallback.value = '新的备用分支'
    expect(displayed).toBe('新的备用分支')
  })

  it('重新执行后不再响应旧分支', () => {
    const usePrimary = ref(true)
    const primary = ref('主分支')
    const fallback = ref('备用分支')
    let runs = 0

    effect(() => {
      runs++
      usePrimary.value ? primary.value : fallback.value
    })

    expect(runs).toBe(1)
    usePrimary.value = false
    expect(runs).toBe(2)

    primary.value = '不再使用的主分支'
    expect(runs).toBe(2)
  })

  it('多次切换分支时始终只响应当前分支', () => {
    const usePrimary = ref(true)
    const primary = ref('主分支')
    const fallback = ref('备用分支')
    let displayed = ''
    let runs = 0

    effect(() => {
      runs++
      displayed = usePrimary.value ? primary.value : fallback.value
    })

    usePrimary.value = false
    usePrimary.value = true
    expect(runs).toBe(3)

    fallback.value = '不再使用的备用分支'
    expect(runs).toBe(3)
    expect(displayed).toBe('主分支')

    primary.value = '新的主分支'
    expect(runs).toBe(4)
    expect(displayed).toBe('新的主分支')
  })
})
