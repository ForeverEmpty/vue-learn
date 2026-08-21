# 02. 原型与属性归属复习

> 所属大章节：`00. JS/TS 基础`
>
> 状态：已批改，通过。

## 1. `in`、`hasOwnProperty.call` 和 `Object.keys` 在判断属性时分别会不会检查原型链？

in：会检查
hasOwnProperty.call：不会检查
Object.keys：不会检查

> **批改：正确。** `in` 会沿原型链查找；`hasOwnProperty.call` 只判断自有属性；`Object.keys` 只返回对象自身可枚举的字符串键。

## 2. 请逐段解释 `Object.prototype.hasOwnProperty.call(target, key)`，并说明 `call` 在这里解决了什么问题。

Object.prototype: 所有对象的原型
hasOwnProperty: 检查对象是否拥有自有属性
call: 调用函数，并临时把 this 设置为 target

> **批改：基本正确，需要修正第一项并补充 key。** `Object.prototype` 不是所有对象必然拥有的原型，例如 `Object.create(null)` 没有它；这里是从标准的 `Object.prototype` 取得可靠的原始方法。`call` 让该方法本次执行时的 `this` 指向 `target`，`key` 是要检查的属性名。请在原答案下面补充。
Object.prototype: 从标准的 Object.prototype 取得可靠的原始方法，避免被覆盖或不存在该方法
key: 要检查的属性名

> **复批：正确，通过。** 现在已经完整说明了可靠方法来源、call 指定的 target 以及 key 的作用。

## 3. 为什么 `target.hasOwnProperty(key)` 不是所有对象都安全？请举出覆盖同名属性或 `Object.create(null)` 的一种情况。

可能对象覆盖该函数或不存在该函数。
```js
target = {
    hasOwnProperty: '未实现',
}
```

> **批改：正确。** target 可能用同名数据属性覆盖方法，也可能是没有普通原型的对象；从 `Object.prototype` 取得方法再通过 `call` 借用可以避开这两类问题。

## 4. 在 reactive 的 set trap 中，为什么区分 add 与 set 时要判断自有属性，而不能直接使用 `key in target`？

添加新属性使用in可能会被误判为set

> **批改：方向正确，需要说明误判原因。** `key in target` 会把原型链上的属性也算作存在；当 key 只存在于原型上时，给 target 赋值通常是在 target 自身新增属性，应判定为 add，但 `in` 会返回 true 并误判为 set。请补充“原型属性”这一层关系。

in会获取到原型链上的属性，如：state.a = 10，若state原型上存在a属性，且state中不存在a属性，in会返回true，此时是add，而非set

> **复批：正确，通过。** `in` 会因原型属性返回 true，但给当前对象创建自有属性仍属于 add，所以必须使用自有属性判断。
