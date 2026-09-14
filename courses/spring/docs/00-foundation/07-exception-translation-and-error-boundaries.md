# Spring 基础 00·07：异常翻译与统一错误边界

Spring Boot 01·01 的成功请求已经走通，但查询未知主题时，测试看到的是未处理的 `TopicNotFoundException`。这不是异常类型设计错误，而是少了从内部业务语义到外部 HTTP 协议语义的翻译边界。

本专题讨论的不是 Java `try/catch` 语法，而是异常应该在哪一层被理解、转换和暴露。

> 本专题不增加独立复习题。实际示例就是首章中的 `TopicNotFoundException`、`TopicExceptionHandler` 和 `ApiError`，完成后仍回到 Spring Boot 01·01 的正式测试。

## 1. 同一次失败在不同边界有不同表达

“没有 slug 为 `missing` 的主题”可以有多种表达：

```text
查询层：Optional.empty()
应用调用层：TopicNotFoundException
HTTP 边界：404 Not Found + JSON 错误体
日志与监控：一条包含请求信息的诊断事件
```

这些表达并不互相替代，而是服务于不同使用者：

- Service 调用者关心是否存在业务结果；
- Controller 关心当前用例无法继续；
- HTTP 客户端关心协议状态和可解析的错误格式；
- 运维人员关心诊断上下文。

如果最内层 Service 直接返回 `ResponseEntity`，它就必须理解 HTTP；如果最外层接口直接暴露任意 Java 异常，客户端又必须理解服务内部实现。边界翻译的目标是让每一层使用自己的语言。

## 2. 什么是异常翻译

异常翻译（Exception Translation）是在架构边界捕获一种失败表达，并把它转换成该边界调用者能够理解的另一种表达，同时尽量保留原始语义。

抽象结构是：

```text
内部操作
    ↓ 抛出内部异常 A
边界翻译器
    ↓ 转换为外部异常或错误 B
外部调用者
```

数据库层也常见相同思想：底层驱动抛出厂商特定异常，数据访问边界把它翻译为更稳定的数据访问异常。当前章节只是把它应用在 Web 边界：

```text
TopicNotFoundException
    ↓ TopicExceptionHandler
HTTP 404 + ApiError JSON
```

异常翻译不是把所有失败都吞掉，也不是把所有异常都改成同一个状态码。

## 3. 为什么 Controller 不直接返回错误字符串

一种看似简单的实现是：

```java
if (result.isEmpty()) {
    return "topic not found";
}
```

它会带来几个问题：

- Java 方法的成功与失败返回类型混在一起；
- 很容易仍返回默认的 `200 OK`；
- 每个 Controller 会复制状态码和错误体构造；
- 客户端难以依赖稳定字段；
- 后续增加错误追踪编号时需要修改许多位置。

另一种做法是 Controller 抛出有明确业务含义的异常，由统一处理器集中决定 HTTP 表达。Controller 只负责把查询结果提升为“成功继续”或“当前用例失败”。

## 4. 为什么使用稳定错误契约

当前错误体是：

```java
public record ApiError(String code, String message) {
}
```

返回示例：

```json
{
  "code": "TOPIC_NOT_FOUND",
  "message": "Unknown study topic: missing"
}
```

两个字段承担不同职责：

- `code` 是面向程序的稳定分类，客户端可以据此选择行为；
- `message` 是面向人的具体描述，可以包含当前 slug。

客户端不应通过解析英文 message 判断错误类型。文案可能调整或本地化，而稳定 code 应维持兼容。

真实系统还可能加入时间、请求路径、trace id 和字段级校验错误；这些内容会在真正产生需求的章节中扩展，不在首章一次塞满。

## 5. Spring MVC 中的集中翻译器

课程骨架提供了：

```java
public final class TopicExceptionHandler {
    public ResponseEntity<ApiError> handle(
            TopicNotFoundException exception
    ) {
        // TODO
    }
}
```

检查点五需要补齐三个层次：

```text
@RestControllerAdvice
    声明这是跨 REST Controller 生效的建议组件

@ExceptionHandler(TopicNotFoundException.class)
    声明该方法处理哪一种异常

ResponseEntity<ApiError>
    明确控制 HTTP 状态、响应头推断和响应体
```

最终处理方法的职责只有：

1. 接收已经发生的 `TopicNotFoundException`；
2. 构造稳定的 `ApiError`；
3. 返回 `404 Not Found`。

它不应重新查询主题，也不应修改 Service 中的目录数据。

## 6. 为什么不能捕获所有 Exception 并返回 404

下面的范围过宽：

```java
@ExceptionHandler(Exception.class)
```

未知主题适合 404，但其他异常可能表示：

| 失败 | 更可能的语义 |
| --- | --- |
| 请求字段格式错误 | 400 Bad Request |
| 没有登录 | 401 Unauthorized |
| 已登录但无权访问 | 403 Forbidden |
| 资源不存在 | 404 Not Found |
| 当前状态发生冲突 | 409 Conflict |
| 程序缺陷或依赖故障 | 500 Internal Server Error |

把未知程序缺陷也伪装成 404，会误导客户端并掩盖服务端故障。翻译规则应尽可能针对明确的异常类型，未预期异常保留 500 语义并进入诊断流程。

## 7. 异常在哪里记录日志

不要因为异常经过三层就重复记录三次相同堆栈。常见原则是：在真正能够处理失败，或者拥有足够上下文且即将越过系统边界的位置记录。

当前 404 是预期的客户端可处理结果，通常不需要按服务器错误打印完整堆栈。真正的未知异常则需要保留堆栈和请求追踪信息。

```text
预期业务失败 → 结构化响应，低级别或不重复记录
未知系统失败 → 500，记录诊断上下文和堆栈
```

日志策略属于运行时设计，HTTP 响应属于外部契约；不能把堆栈、数据库语句或内部路径直接放进响应 message，以免泄露实现细节。

## 8. 与其他 Spring 写法的取舍

Spring 还可以使用 `@ResponseStatus` 修饰异常，或在 Controller 中抛出 `ResponseStatusException`。它们适合较简单的映射，但会让异常类或抛出位置更直接地携带 HTTP 信息。

当前课程选择 `@RestControllerAdvice`，因为它能集中定义：

- 状态码；
- 稳定错误 code；
- JSON 结构；
- 未来公共字段；
- 多个 Controller 共用的协议规则。

这不是所有项目唯一正确的方案。选择依据是错误契约是否需要集中维护，以及内部异常是否希望保持与 HTTP 解耦。

## 9. 测试如何证明翻译成立

只断言异常被抛出，不能证明 HTTP 客户端得到了正确协议。首章 Web 测试同时断言：

```text
状态码       = 404
Content-Type = application/json
code         = TOPIC_NOT_FOUND
message      = Unknown study topic: missing
```

这四项分别保护协议状态、表示格式、机器可读分类和具体上下文。处理器完成后，原先冒出 MockMvc 的 Java 异常应被解析为正常的 HTTP 测试结果。

## 10. 常见误区

- `Optional.empty()` 不等于 HTTP 404；它还没有跨越 Web 边界。
- 抛异常不等于错误响应已经完成；必须存在相应翻译规则。
- 返回错误 JSON 不等于状态正确；还要显式验证 404。
- 统一处理不等于所有异常统一成同一种错误。
- 对外 message 不应暴露堆栈、SQL 或内部文件路径。
- 翻译器只转换表达，不应偷偷加入新的业务查询或状态修改。

## 回到检查点五前应能确认

- 同一失败在业务层和 HTTP 层可以有不同但对应的表达。
- 异常翻译发生在边界，目的是维持内外两侧的职责与依赖方向。
- `@RestControllerAdvice` 集中承载跨 Controller 的错误协议。
- `@ExceptionHandler` 应针对明确异常，不能把所有异常都伪装成 404。
- 稳定 code 面向程序，具体 message 面向人。
- 本检查点只负责把已有异常翻译成响应，不改变 Service 查询规则。
