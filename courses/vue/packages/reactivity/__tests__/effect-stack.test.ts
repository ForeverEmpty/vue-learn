import { describe, expect, it } from 'vitest'
import { effect, ref } from '../src'

describe('嵌套 effect 与异常恢复：第三章', () => {
  it('内层 effect 结束后恢复外层 effect', () => {
    const outerBefore = ref(0)
    const innerValue = ref(0)
    const outerAfter = ref(0)
    let outerRuns = 0
    let innerRuns = 0
    let innerInitialized = false

    effect(() => {
      outerRuns++
      outerBefore.value

      if (!innerInitialized) {
        innerInitialized = true
        effect(() => {
          innerRuns++
          innerValue.value
        })
      }

      outerAfter.value
    })

    expect(outerRuns).toBe(1)
    expect(innerRuns).toBe(1)

    outerAfter.value = 1

    expect(outerRuns).toBe(2)
    expect(innerRuns).toBe(1)
  })

  it('三层 effect 嵌套后仍能恢复最外层 effect', () => {
    const deepestValue = ref(0)
    const middleAfter = ref(0)
    const outerAfter = ref(0)
    let outerRuns = 0
    let middleInitialized = false
    let deepestInitialized = false

    effect(() => {
      outerRuns++

      if (!middleInitialized) {
        middleInitialized = true
        effect(() => {
          if (!deepestInitialized) {
            deepestInitialized = true
            effect(() => {
              deepestValue.value
            })
          }

          middleAfter.value
        })
      }

      outerAfter.value
    })

    outerAfter.value = 1

    expect(outerRuns).toBe(2)
  })

  it('内层 effect 抛出异常后仍能恢复外层 effect', () => {
    const outerAfter = ref(0)
    let outerRuns = 0
    let innerInitialized = false
    let errorCaught = false

    effect(() => {
      outerRuns++

      if (!innerInitialized) {
        innerInitialized = true

        try {
          effect(() => {
            throw new Error('inner effect error')
          })
        } catch {
          errorCaught = true
        }
      }

      outerAfter.value
    })

    expect(errorCaught).toBe(true)
    expect(outerRuns).toBe(1)

    outerAfter.value = 1

    expect(outerRuns).toBe(2)
  })

  it('effect 抛出异常后不会污染之后的普通读取', () => {
    const unrelated = ref(0)

    expect(() => {
      effect(() => {
        throw new Error('effect error')
      })
    }).toThrowError('effect error')

    unrelated.value

    expect(() => {
      unrelated.value = 1
    }).not.toThrow()
  })
})
