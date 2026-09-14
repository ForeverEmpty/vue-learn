# Spring 基础 00·05：`ResponseEntity` 与 `HttpStatus`

异常处理方法需要同时控制 HTTP 状态和 JSON 响应体：

```java
ApiError error = new ApiError(
        "TOPIC_NOT_FOUND",
        exception.getMessage()
);

return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(error);
```

## `ResponseEntity<T>` 表达什么

`ResponseEntity<T>` 是一份完整 HTTP 响应实体的 Java 表达，可以包含：

```text
status   HTTP 状态码
headers  HTTP 响应头
body     类型为 T 的响应体
```

当前返回类型是：

```java
ResponseEntity<ApiError>
```

泛型参数 `ApiError` 只描述响应体类型，不是状态码类型。

## `HttpStatus.NOT_FOUND`

`HttpStatus` 是 Spring 提供的 HTTP 状态枚举。`NOT_FOUND` 是代表 404 的枚举常量：

```text
HttpStatus.NOT_FOUND
→ 数值 404
→ 原因短语 Not Found
```

同类常量还包括 `OK`、`CREATED`、`BAD_REQUEST`、`CONFLICT` 和 `INTERNAL_SERVER_ERROR`。应先根据 HTTP 语义选择状态，而不是看到异常就统一返回 500。

## builder 调用顺序

```java
ResponseEntity.status(HttpStatus.NOT_FOUND)
```

先创建一个状态为 404 的响应构建器，此时还没有 `ApiError` body。

```java
.body(error)
```

再放入响应体并结束构建，得到 `ResponseEntity<ApiError>`。

完整类型变化可以理解为：

```text
status(...) → BodyBuilder
body(error) → ResponseEntity<ApiError>
```

## 常用快捷方法

```java
ResponseEntity.ok(body)              // 200 + body
ResponseEntity.badRequest().body(e)  // 400 + body
ResponseEntity.notFound().build()    // 404，无 body
ResponseEntity.status(status).body(e)
```

当前错误契约要求 404 同时带结构化 JSON，所以不能只使用 `notFound().build()`，否则没有 `ApiError` body。

## Content-Type 从哪里来

本章没有手写：

```text
Content-Type: application/json
```

Spring MVC 看到响应体是 `ApiError`，并在 classpath 中找到 JSON 消息转换器，于是选择 JSON 表示并设置相应响应头。

如果接口要支持多种表示格式，可以结合请求映射的 `produces` 和客户端 `Accept` 头进行内容协商；首章只验证 JSON。

## ResponseEntity 与直接返回对象

成功方法可以直接返回：

```java
public StudyTopic findBySlug(...) {
    return topic;
}
```

Spring MVC 默认使用 200，并把对象写入响应体。

异常处理需要显式指定 404，因此返回：

```java
ResponseEntity<ApiError>
```

不是每个 Controller 方法都必须使用 `ResponseEntity`。只在确实要控制状态、响应头或其他响应细节时使用，能保持普通成功路径更简洁。

## `ApiError`、`ResponseEntity` 和 `HttpStatus` 的分工

| 元素 | 职责 |
| --- | --- |
| `ApiError` | 应用定义的错误响应数据结构 |
| `HttpStatus.NOT_FOUND` | 标准 HTTP 协议状态 |
| `ResponseEntity<ApiError>` | 把状态、响应头和 body 组合成完整响应 |

修改 `ApiError.code` 不会自动改变 HTTP 状态；使用 404 也不会自动创建 JSON body。两者必须明确组合。

## 常见误区

- `ResponseEntity` 不是业务实体或数据库实体，它代表 HTTP 响应。
- `HttpStatus.NOT_FOUND` 是枚举常量，不是需要自己填写的字符串。
- 返回错误 JSON 时仍要验证状态码，不能只验证 body。
- 不应让纯业务 Service 返回 `ResponseEntity`，否则 Service 会依赖 Web 协议。
- 不要为了“统一风格”让所有方法都返回复杂的 `ResponseEntity<?>`；优先保留具体泛型。

## 官方查询

- [`ResponseEntity` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/ResponseEntity.html)
- [`HttpStatus` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/HttpStatus.html)
