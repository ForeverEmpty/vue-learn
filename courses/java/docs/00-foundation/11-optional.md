# Java 基础 00·11：`Optional` 表达可能缺失的结果

> 本章是 Spring 课程按需触发的 Java 基础补充，不设置复习题。

查询某个学习主题时，结果可能存在，也可能不存在。`Optional<T>` 用类型明确表达这两种情况。

## 创建 Optional

```java
Optional<String> present = Optional.of("Spring Boot");
Optional<String> missing = Optional.empty();
Optional<String> maybe = Optional.ofNullable(possiblyNullValue);
```

- `of` 要求参数一定非 `null`；
- `empty` 表示没有值；
- `ofNullable` 根据参数是否为 `null` 创建两种结果。

## 消费结果

只提供默认值：

```java
String title = result.orElse("未知主题");
```

缺失时抛出业务异常：

```java
StudyTopic topic = result.orElseThrow(
    () -> new TopicNotFoundException(slug)
);
```

转换内部值：

```java
Optional<String> title = result.map(StudyTopic::title);
```

不要先调用 `isPresent()` 再机械地 `get()`；优先选择能直接表达意图的 `orElse`、`orElseThrow`、`map` 等操作。

## Optional 与 HTTP 404 的边界

业务查询服务可以返回：

```java
Optional<StudyTopic>
```

它只表达“有没有主题”，不需要知道 HTTP。Controller 收到空结果后，再决定把它转换成 `404 Not Found`。这保持了职责边界：

```text
Service：领域结果存在 / 缺失
Controller：领域结果 → HTTP 响应语义
```

## Optional 不适合到处使用

常见做法是把它用于“可能找不到”的方法返回值。通常不要把 `Optional` 用作：

- 实体或 DTO 的每一个字段；
- 方法参数；
- 可以直接返回空集合的集合查询。

## 回到 Spring 首章前应能确认

- `Optional.empty()` 与包含值的 `Optional` 是显式的两种结果。
- `orElseThrow` 只在值缺失时创建并抛出异常。
- Service 可以表达“缺失”，Web 层再决定是否映射为 404。
