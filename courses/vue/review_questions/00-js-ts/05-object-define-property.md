# 05. Object.defineProperty 与属性描述符复习

> 所属大章节：`00. JS/TS 基础`
>
> 状态：已完成并通过复核。

## 1. value、writable、enumerable、configurable 分别控制什么？

vlaue：负责该属性的值
writable：负责能否修改该属性的值
enumerable：负责能否枚举该属性
configurable：负责能否删除和重新配置该属性

> **批改：正确。** `value` 保存数据属性的当前值；`writable` 控制能否通过赋值修改值；`enumerable` 控制是否参与 `Object.keys` 等常见枚举；`configurable` 控制删除和大部分描述符重配置。`vlaue` 只是拼写笔误，不影响本题理解。

## 2. 普通赋值创建的属性，与 defineProperty 只填写 value 创建的属性，在三个布尔配置上有什么不同？

普通赋值创建writable、enumerable、configurable为true，而只写value，writable、enumerable、configurable创建的属性，默认都为false

> **批改：正确。** 已准确区分普通赋值和 `defineProperty` 只提供 `value` 时的三项默认配置。

## 3. 为什么一个属性不出现在 Object.keys 中，不代表这个属性不存在？

请同时说明怎样直接读取它，以及哪个 API 可以查看包括 Symbol 在内的全部自有键。

因为可能enumerable可能为false，可以直接读取或通过Reflect.get，使用Object.ownKeys可以读取全部自由键

> **批改：理解方向正确，但 API 名称需要修正。** 不可枚举属性仍然存在，所以可以用普通属性读取或 `Reflect.get` 读取。查看包括字符串键和 Symbol 键在内的全部自有键，应使用 `Reflect.ownKeys(target)`；JavaScript 没有 `Object.ownKeys`。请在原答案下面补充正确 API。

使用Reflect.ownKeys可以读取全部自有键

> **复批：正确，通过。** `Reflect.ownKeys` 会返回全部自有字符串键和 Symbol 键，不受 `enumerable` 限制。

## 4. 下面两次操作分别会得到什么结果？请说明由哪个描述符配置决定

```ts
const target = {}

Object.defineProperty(target, "token", {
  value: "abc",
  configurable: true,
})

const didSet = Reflect.set(target, "token", "xyz")
const didDelete = Reflect.deleteProperty(target, "token")
```

didSet:false, writable
didDelete:true, configurable

> **批改：正确。** `writable` 被省略后默认为 false，所以写入返回 false；`configurable: true` 允许删除，所以删除返回 true。

## 5. 第十五章的 SKIP 描述符为什么选择下面的配置？

```ts
{
  value: true,
  configurable: true,
}
```

请说明省略 `writable` 与 `enumerable` 后的实际值，以及这样做对内部标记的意义。

writable:false, enumerable:false
writable,enumerable:防止修改该属性的值，防止枚举该属性
configurable:给测试、调试或未来内部调整留出删除标记的可能

> **批改：正确。** `writable: false` 防止普通赋值改变 SKIP 的含义，`enumerable: false` 避免内部标记进入常见业务枚举，`configurable: true` 则保留删除或调整标记的空间。
