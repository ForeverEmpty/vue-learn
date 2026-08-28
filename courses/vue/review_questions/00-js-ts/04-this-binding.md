# 04. this 的指向复习

> 所属大章节：`00. JS/TS 基础`
>
> 状态：已批改，通过。

## 1. 普通函数在 `obj.method()`、提取后 `method()`、`method.call(other)` 三种调用中，this 分别由什么决定？

obj.method(): obj
method(): undefined
method.call(other): other

> **批改：正确。** 在当前严格模式模块中，提取后直接调用的 this 是 `undefined`；对象方法调用取点号左侧对象，call 则显式使用 other。

## 2. 为什么 `bind` 不会立即执行原函数？调用 bind 返回的新函数时，哪些信息已经被保存？

bind是返回一个绑定了新的this和参数的新函数。保存了新的this和参数。

> **批改：正确。** bind 只创建新函数并保存 this 与预设参数，调用返回的新函数时才执行原函数。

## 3. 普通函数和箭头函数的 this 规则有什么不同？为什么 call、apply、bind 通常不能改变箭头函数的 this？

普通函数根据调用方式确定 this，箭头函数根据定义位置外层的 this 确定 this。
当箭头函数捕获了外层的this后，就不能再改变了

> **批改：正确。** 普通函数使用动态 this，箭头函数使用词法 this。

## 4. `Object.prototype.hasOwnProperty.call(target, key)` 中，call 设置了什么，key 又是什么？

设置this为target，将key作为参数

> **批改：正确。** `target` 成为 hasOwnProperty 本次调用的 this，`key` 是要检查的属性名。
