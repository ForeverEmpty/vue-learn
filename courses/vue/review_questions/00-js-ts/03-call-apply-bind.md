# 03. call、apply 与 bind 复习

> 所属大章节：`00. JS/TS 基础`
>
> 状态：已批改，通过。

## 1. call、apply、bind 哪些会立即执行原函数？它们的参数形式分别是什么？

call: 立即执行,第一个参数用于设置this，后面的参数逐个传给函数。
apply: 立即执行,第一个参数用于设置this，后面的参数放在数组中传给函数。
bind: 不立即执行,返回一个新函数，新函数的this指向第一个参数，后面的参数逐个传给新函数。

> **批改：整体正确。** call 和 apply 立即执行原函数；call 逐个传参，apply 用数组传参。bind 返回新函数，并预先保存 this 和可选的部分参数；以后调用新函数时还可以继续传入剩余参数。

## 2. 为什么 `Object.prototype.hasOwnProperty.call(target, key)` 使用 call，而不是直接调用 `target.hasOwnProperty(key)`？

避免target上不存在或被替换hasOwnProperty方法，导致调用失败。

> **批改：正确。** 这是借用标准原始方法，避免依赖 target 自己是否安全地提供同名方法。

## 3. 下面代码中 `bound` 保存的是什么？调用 `bound('!')` 时才发生什么？

```ts
const bound = introduce.bind(person, 'Hello')
```

会执行introduce函数，将person作为this，将'Hello'作为第一个参数，将'!'作为第二个参数。

> **批改：调用过程正确，但漏答 `bound` 保存的内容。** 执行 bind 时不会调用 `introduce`；`bound` 保存的是一个新函数，它已经绑定 `this = person` 和第一个参数 `'Hello'`。调用 `bound('!')` 时才执行原函数，并把 `'!'` 作为剩余参数。请补充这一区别。

bound保存了新的this：person，和参数：Hello的新函数

> **复批：正确，通过。** bind 阶段返回并保存这个新函数，不执行原函数；调用 bound 时才使用已绑定的 person、Hello 和新传入的剩余参数。

## 4. 为什么箭头函数通常不能通过 call、apply、bind 改变 this？

this，箭头函数根据定义位置外层的 this 确定 this。
当箭头函数捕获了外层的this后，就不能再改变了

> **批改：正确。** 箭头函数没有自己的动态 this，而是捕获定义位置外层的 this，因此 call、apply、bind 无法重新指定它。
