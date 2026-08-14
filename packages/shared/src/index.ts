/**
 * Vue 会把多个模块都要使用的小工具放在 shared 包中。
 * Object.is 可以正确处理 NaN、+0 和 -0 等普通等号容易忽略的情况。
 */
export function hasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue)
}
