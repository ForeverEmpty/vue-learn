# Spring 基础 00·14：Bean Validation 约束与 `@Valid`

Bean Validation 用声明式约束描述对象字段必须满足的条件。Spring MVC 可以在请求体反序列化后自动触发这些约束，并在进入 Controller 方法主体前拒绝无效输入。

## 1. 依赖与包名

课程通过 Spring Boot starter 引入校验实现：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

约束注解来自 `jakarta.validation.constraints`，`@Valid` 来自 `jakarta.validation`。不要误用旧的 `javax.validation` 包。

## 2. 当前四个约束

```java
public record CreateTopicRequest(
        @NotBlank(message = "slug is required")
        @Pattern(
                regexp = "[a-z0-9]+(?:-[a-z0-9]+)*",
                message = "slug must use lowercase letters, numbers, and single hyphens"
        )
        String slug,

        @NotBlank(message = "title is required")
        @Size(max = 80, message = "title must not exceed 80 characters")
        String title,

        @Positive(message = "estimatedMinutes must be greater than zero")
        int estimatedMinutes
) {
}
```

| 注解 | 目标 | 当前含义 |
| --- | --- | --- |
| `@NotBlank` | 字符串 | 不能为 `null`、空串或纯空白 |
| `@Pattern` | 字符串 | 必须符合 slug 正则 |
| `@Size(max=80)` | 字符串 | 标题长度最多 80 |
| `@Positive` | 数值 | 必须大于 0 |

## 3. `@Valid` 是触发入口

只在 record 上写约束，不等于每个使用位置都会自动校验。Controller 参数需要声明：

```java
public ResponseEntity<StudyTopic> create(
        @Valid @RequestBody CreateTopicRequest request
) {
}
```

两项职责不同：

```text
@RequestBody  JSON → CreateTopicRequest
@Valid        对创建出的对象执行约束校验
```

校验失败时，Controller 方法主体不会执行。Spring MVC 抛出 `MethodArgumentNotValidException`，由 Web 异常边界决定最终 400 响应。

## 4. 正则表达式如何约束 slug

如果不熟悉字符类、量词、非捕获分组或 Java 字符串转义，先阅读 [Java 00·15：正则表达式](../../../java/docs/00-foundation/15-regular-expressions.md)。

本章规则：

```regex
[a-z0-9]+(?:-[a-z0-9]+)*
```

它允许：

```text
spring
spring-boot
http2-basics
```

它拒绝：

```text
Spring-Boot   大写字母
-spring       开头短横线
spring-       结尾短横线
spring--boot  连续短横线
spring boot   空格
```

正则只负责格式，不负责确认 slug 是否已经存在。

## 5. `@NotNull`、`@NotEmpty` 与 `@NotBlank`

| 输入 | `@NotNull` | `@NotEmpty` | `@NotBlank` |
| --- | --- | --- | --- |
| `null` | 拒绝 | 拒绝 | 拒绝 |
| `""` | 接受 | 拒绝 | 拒绝 |
| `"   "` | 接受 | 接受 | 拒绝 |

名称和 slug 都不接受纯空白，所以本章使用 `@NotBlank`。

## 6. 边界校验与业务校验

Bean Validation 适合只依赖当前对象就能判断的规则。需要读取系统状态的规则仍放在 Service：

| 规则 | 位置 |
| --- | --- |
| 标题不能为空 | DTO 约束 |
| 时长必须为正数 | DTO 约束 |
| slug 格式正确 | DTO 约束 |
| slug 尚未被使用 | Service |

不要在自定义校验器里随意注入整个业务 Service 来完成所有规则，否则输入结构和业务状态会重新耦合。

## 7. 常见误区

- 约束注解存在，但忘记在入口参数添加 `@Valid`。
- 使用 `@NotNull` 后以为纯空白字符串也会被拒绝。
- 把重复资源当成字段格式错误；它应是 409 业务冲突。
- 在 Controller 方法体里手写大量 `if`，同时又保留重复的约束注解。
- 把校验错误 message 当作稳定机器 code；客户端应依赖单独的错误 code 和 field。

## 官方查询

- [Spring MVC Validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html)
- [Jakarta Bean Validation](https://jakarta.ee/specifications/bean-validation/)
