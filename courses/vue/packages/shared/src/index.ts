/**
 * Vue 会把多个模块都要使用的小工具放在 shared 包中。
 * Object.is 可以正确处理 NaN、+0 和 -0 等普通等号容易忽略的情况。
 */
export function hasChanged(value: unknown, oldValue: unknown): boolean {
  return !Object.is(value, oldValue);
}

export function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function isArrayIndex(value: unknown): boolean {
  const type = typeof value;

  if (type !== "number" && type !== "string") return false;

  let validValue: number | undefined;

  if (type === "string") {
    validValue = Number(value);
    const toString = validValue.toString();
    if (toString !== value) return false;
  } else {
    validValue = Number(value);
  }

  const isInt = Number.isInteger(validValue);
  const isInRange = validValue >= 0 && validValue < 2 ** 32 - 1;

  return isInt && isInRange;
}
