# Spring 基础 00·16：校验错误与稳定错误契约

创建请求引入三种新的失败：请求体不是合法 JSON、字段不满足结构约束、slug 与已有主题冲突。它们都失败，但原因和 HTTP 语义不同。

## 1. 三类失败先分类

| 失败 | Spring 或应用表达 | HTTP |
| --- | --- | --- |
| JSON 无法反序列化 | `HttpMessageNotReadableException` | 400 |
| DTO 约束不满足 | `MethodArgumentNotValidException` | 400 |
| slug 已存在 | `TopicAlreadyExistsException` | 409 |

400 表示请求本身无法按当前契约处理；409 表示请求格式有效，但与服务器当前状态冲突。

## 2. 扩展统一错误结构

第一章只有 code 和 message：

```java
public record ApiError(String code, String message) {
}
```

现在字段校验需要告诉客户端具体位置：

```java
public record ApiFieldViolation(String field, String message) {
}
```

统一错误体扩展为：

```java
public record ApiError(
        String code,
        String message,
        List<ApiFieldViolation> violations
) {
}
```

普通错误的 violations 是空列表，字段校验错误则携带多个条目。这样客户端始终面对同一顶层结构。

## 3. 为什么使用空列表而不是 null

404 或 409 示例：

```json
{
  "code": "TOPIC_ALREADY_EXISTS",
  "message": "Study topic already exists: spring-boot",
  "violations": []
}
```

字段错误示例：

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "violations": [
    { "field": "estimatedMinutes", "message": "estimatedMinutes must be greater than zero" },
    { "field": "slug", "message": "slug must use lowercase letters, numbers, and single hyphens" },
    { "field": "title", "message": "title is required" }
  ]
}
```

空列表让客户端可以直接迭代，不必先判断字段是否为 null。record 紧凑构造器中的 `List.copyOf` 还能避免外部在错误对象创建后修改列表。

## 4. 从绑定错误提取字段信息

```java
List<ApiFieldViolation> violations = exception.getBindingResult()
        .getFieldErrors()
        .stream()
        .map(error -> new ApiFieldViolation(
                error.getField(),
                error.getDefaultMessage()
        ))
        .sorted(Comparator.comparing(ApiFieldViolation::field))
        .toList();
```

`BindingResult` 保存本次绑定与校验产生的问题。对外只提取稳定且安全的 `field` 与 `message`，不直接序列化整个 Spring 异常对象。

排序不是 HTTP 必需条件，但能让输出稳定，便于客户端展示、文档示例和人工排查。

## 5. 错误 code 与 message

本章使用：

```text
MALFORMED_REQUEST      JSON 无法读取
VALIDATION_FAILED      字段约束失败
TOPIC_ALREADY_EXISTS   业务状态冲突
TOPIC_NOT_FOUND        资源不存在
```

code 面向程序，应保持稳定；message 面向人，可以提供更具体描述。客户端不要解析英文 message 来判断错误类型。

## 6. 为什么继续放在 Advice

Controller 的成功路径应该清晰：

```text
接收 DTO → 调用 Service → 返回 201
```

如果每个 Controller 都捕获校验、JSON 和业务异常，就会重复状态码与错误体构造。`@RestControllerAdvice` 把异常集中翻译为 HTTP 契约，并让多个 Controller 共享同一结构。

Advice 只翻译失败，不应：

- 重新执行创建操作；
- 修改目录状态；
- 把未知异常全部伪装成 400；
- 把堆栈或内部类型名返回给客户端。

## 7. 方法重载与多个异常处理器

Java 允许在同一个类中声明多个同名 `handle` 方法，只要参数类型不同：

```java
handle(TopicNotFoundException exception)
handle(TopicAlreadyExistsException exception)
handle(MethodArgumentNotValidException exception)
handle(HttpMessageNotReadableException exception)
```

Spring 依据 `@ExceptionHandler` 声明和异常类型选择匹配方法。方法同名不是关键，清晰的参数类型和注解映射才是关键。

## 8. 常见误区

- 所有客户端错误都返回 400，丢失 409 的状态冲突语义。
- 字段错误只返回一句“参数错误”，客户端不知道应标记哪个输入框。
- 把 Spring 的完整异常直接作为 JSON，泄漏内部结构并产生不稳定契约。
- `violations` 有时为 null、有时为数组，增加客户端分支。
- 捕获 `Exception.class` 后统一返回 400，掩盖真实服务器缺陷。
- 只定义约束而没有统一翻译，导致不同接口返回不同错误结构。

## 官方查询

- [`MethodArgumentNotValidException` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/MethodArgumentNotValidException.html)
- [`HttpMessageNotReadableException` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/converter/HttpMessageNotReadableException.html)
