/**
 * Proxy 内部身份查询使用 Symbol，避免与用户对象的普通字符串属性重名。
 */
export const ReactiveFlags = {
  IS_REACTIVE: Symbol('mini-vue.isReactive'),
  IS_READONLY: Symbol('mini-vue.isReadonly'),
} as const
