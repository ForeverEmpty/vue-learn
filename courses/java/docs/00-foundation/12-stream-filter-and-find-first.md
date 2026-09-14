# Java 基础 00·12：`Stream`、`filter` 与 `findFirst`

> 本章由 Spring Boot 01·01 检查点二的实际实现触发，属于 Java 基础补充，不设置复习题。

检查点二使用了下面的查询：

```java
Optional<StudyTopic> topic = topics.stream()
        .filter(t -> t.slug().equals(slug))
        .findFirst();
```

它表达的是一条数据处理流水线：从主题集合取得元素流，只保留 slug 匹配的元素，然后取得第一个结果。

## Stream 不是新的集合

`topics` 是保存数据的 `List<StudyTopic>`，`topics.stream()` 创建的是对这些元素进行计算的视图。Stream 本身不负责长期保存元素，也不会把原列表自动复制一份。

可以先区分：

```text
List   → 数据容器，可以反复读取
Stream → 一次性计算流水线，描述怎样处理数据
```

一个 Stream 执行终止操作后不能再次使用；需要再次处理时，要从集合重新调用 `stream()`。

## 流水线的三个部分

```text
topics.stream()                 数据源
      .filter(...)              中间操作
      .findFirst()              终止操作
```

### 数据源

```java
topics.stream()
```

它按照列表的遭遇顺序提供 `StudyTopic` 元素。

### 中间操作 filter

```java
.filter(t -> t.slug().equals(slug))
```

`filter` 接收一个 `Predicate<StudyTopic>`。这个函数对每个元素返回布尔值：

- `true`：元素保留在后续流水线中；
- `false`：元素被过滤掉。

这里的 `t` 是当前正在检查的主题，外层方法参数 `slug` 是要查找的值。lambda 等价于更展开的写法：

```java
.filter((StudyTopic t) -> {
    return t.slug().equals(slug);
})
```

参数类型通常可由编译器推断，因此可以省略类型和单参数括号。

### 终止操作 findFirst

```java
.findFirst()
```

`findFirst` 请求流水线给出第一个保留下来的元素。结果可能不存在，因此返回 `Optional<StudyTopic>`：

```text
找到第一个匹配项 → Optional.of(topic)
没有任何匹配项   → Optional.empty()
```

这正好满足 Service 的方法契约，不需要自行返回 `null`。

## 中间操作通常是惰性的

只写下面的代码时，`filter` 通常还不会遍历列表：

```java
Stream<StudyTopic> filtered = topics.stream()
        .filter(t -> t.slug().equals(slug));
```

加入 `findFirst()` 这样的终止操作后，流水线才真正需要结果并开始处理元素。

`findFirst` 还具有短路特征：找到第一个匹配项后，不需要继续检查剩余元素。对于当前两个主题，查找 `spring-boot` 时，第一个元素匹配后即可结束。

## 与 for 循环对照

同一逻辑可以写成普通循环：

```java
for (StudyTopic topic : topics) {
    if (topic.slug().equals(slug)) {
        return Optional.of(topic);
    }
}
return Optional.empty();
```

两种写法的业务语义相同：

| for 循环 | Stream |
| --- | --- |
| 明确写出遍历和提前返回 | 声明过滤条件与结果形态 |
| 调试时容易逐行观察 | 多个转换组合时更紧凑 |
| 复杂分支通常更清楚 | 过滤、映射、聚合流水线通常更自然 |

不要把 Stream 当作永远更高级或更快的写法。当前查询用 Stream 很自然；如果处理过程包含大量分支、状态变化或异常控制，普通循环可能更容易理解。

## 不要在 filter 中修改外部状态

`filter` 的职责是判断元素是否保留。避免写成：

```java
.filter(topic -> {
    count++;
    return topic.slug().equals(slug);
})
```

这种副作用让结果依赖求值次数和执行方式。流水线操作优先保持无副作用：输入相同元素时返回相同判断，不顺便修改外部变量。

## 当前实现可以再简化一层

因为局部变量只被原样返回：

```java
Optional<StudyTopic> topic = topics.stream()
        .filter(t -> t.slug().equals(slug))
        .findFirst();
return topic;
```

所以也可以直接返回：

```java
return topics.stream()
        .filter(t -> t.slug().equals(slug))
        .findFirst();
```

两者都正确。保留局部变量有时便于断点调试；直接返回更紧凑。应根据可读性选择，而不是为了减少一行代码强制改写。

## 回到 Spring 检查点三前应能确认

- `List` 保存数据，Stream 描述一次计算过程。
- `filter` 只保留谓词返回 `true` 的元素。
- `findFirst` 是终止操作，并以 Optional 表达可能没有结果。
- `findFirst` 找到第一个匹配项后可以短路。
- 当前 Stream 写法与提前返回的 for 循环具有相同业务语义。
- Stream 是 Java 能力，与 Spring 容器没有关系。
