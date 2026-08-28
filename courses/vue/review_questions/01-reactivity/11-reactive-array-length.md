# 第十一章复习：响应式数组的索引与 length

> 状态：已批改，通过。

## 1. 假设数组当前长度为 2，执行 `list[5] = 'F'` 后，数组发生了哪些变化？需要通知哪几类依赖？

首先length变成了6，list[5]的值成了'F'
需要通知依赖了length、list[5]的，以及Object.keys()、in

> **批改：正确。** `list[5]` 成为新的自有属性，数组 length 从 2 变成 6。需要通知具体 key `'5'` 的 dep、`length` dep和表示键集合的 `ITERATE_KEY` dep。当前简化实现中，直接读取 `list[5]` 与执行 `5 in list` 共用同一个具体 key dep。索引 2～4 只是空位，不需要通知它们的 dep。

## 2. 执行 `list.length = 1` 截断数组时，为什么只触发 length 自己的 dep 不够？应该怎样判断哪些索引 dep 失效了？

因为大于等于1索引的值都失效了
length发生截断时，检查该数组所有索引，大于等于截断长度的Dep都失效

> **批改：索引边界正确，但需要补充。** 应该遍历依赖图 `depsMap` 中已经存在的 `depKey`，筛选合法数组索引且 `Number(depKey) >= newLength` 的 dep，而不是遍历截断后已经消失的数组元素。此外，截断还改变了 `Object.keys(list)` 的结果，因此需要同时通知 `ITERATE_KEY` dep。请在原答案下补充这两点。

遍历depsMap中存在的depKey，将索引>=newLength，同时通知INTERATE_KEY的dep

> **复批：理解正确。** 实现会遍历 `depsMap` 中已经收集过的依赖键，而不是遍历已经被截断的数组。特殊键的正确拼写是 `ITERATE_KEY`，请注意单词中是 `ITERATE`。

## 3. Proxy 的数组索引 key 通常是字符串。为什么不能把所有“看起来像数字”的字符串都当作数组索引？请比较 `'2'`、`'02'` 和 `'-1'`。

只有字符串转为数字后为正整数且转回字符串后与原字符串一致才能当索引

```text
'2' 可以
'02' 不可以，数字转回字符串与源字符串不一致
'-1' 不可以，转数字为负数
```

> **批改：三个示例判断正确，但通用规则需要修正。** 数组索引可以是 0，因此应写“非负整数”，不是“正整数”；还要满足索引小于 `2 ** 32 - 1`。规范字符串往返判断正确，它会排除 `'02'`、`'1.0'` 等形式。请补充 0 和最大索引边界。

索引转为数字后应为非负整数且小于`2 ** 32 - 1`

> **复批：正确，通过。** 结合原答案中的规范字符串往返判断，现在已经包含合法数组索引的三个关键条件：规范形式、非负整数和最大范围。

## 4. 请设计一个最小测试，证明“更新已有索引”和“写入超出当前 length 的索引”对 length effect 的影响不同。写出操作、预期 effect 次数，并解释这个测试能发现什么错误。

```js
it("test", () => {
  const list = reactive(["A"]);

  let firstValue = undefined;
  let valueRuns = 0;
  let length = 0;
  let lengthRuns = 0;

  effect(() => {
    valueRuns++;
    firstValue = list[0];
  });

  effect(() => {
    lengthRuns++;
    length = list.length;
  });

  didChange = Reflect.set(list, "0", "B");

  expect(didChange).toBe(true);
  expect(valueRuns).toBe(2);
  expect(firstValue).toBe("B");
  expect(lengthRuns).toBe(1);
  expect(length).toBe(1);

  didChange = Reflect.set(list, "1", "A");
  expect(lengthRuns).toBe(2);
  expect(length).toBe(2);
});
```

> **最终复批：核心逻辑正确，通过。** `didUpdate` 和 `didAdd` 已分别声明并用于对应断言，这段测试现在可以验证已有索引更新不会触发 length effect，而超出范围的新增索引会触发。测试名仍建议由 `"test"` 改成描述行为的名称，便于失败时直接理解测试目标；这项命名建议不影响本题通过。

> **复批：仍需修正。** 你已经正确删掉了无关的索引值 effect，并分别声明了 `didUpdate` 和 `didAdd`，但两个断言仍写成了不存在的 `didChange`，运行时会报错。第一个应为 `expect(didUpdate).toBe(true)`，第二个应为 `expect(didAdd).toBe(true)`。测试名称也仍是通用的 `"test"`，请改为例如 `"只有新增超出范围的索引才触发 length effect"`。完成这三处替换即可通过。

该测试可以发现向数组增加项时，是否会通知length依赖

> **批改：测试意图正确，但代码需要修正和精简。** 第一次更新已有索引后 `lengthRuns` 保持 1，第二次写入索引 1 后变成 2，确实可以同时发现“错误通知已有索引”和“漏通知远端索引”两类错误。不过 `didChange` 没有使用 `let` 或 `const` 声明，在模块严格模式下无法运行；TypeScript 中 `firstValue` 还需要声明为 `string | undefined`。这道题只需要观察 length effect，可以去掉 `firstValue`、`valueRuns` 及第一个 effect，改用两个分别声明的 `const didUpdate`、`const didAdd` 保存 Reflect 结果。请在原答案下补充可运行的精简版本，并把测试名称改为能表达行为的名称。

```js
it("test", () => {
  const list = reactive(["A"]);

  let length = 0;
  let lengthRuns = 0;

  effect(() => {
    lengthRuns++;
    length = list.length;
  });

  const didUpdate = Reflect.set(list, "0", "B");

  expect(didUpdate).toBe(true);
  expect(lengthRuns).toBe(1);
  expect(length).toBe(1);

  const didAdd = Reflect.set(list, "1", "A");
  expect(didAdd).toBe(true)
  expect(lengthRuns).toBe(2);
  expect(length).toBe(2);
});
```
