# Spring 基础 00·03：MVC 请求映射注解

检查点四建立了下面的映射：

```java
@RestController
@RequestMapping("/api/topics")
public final class TopicController {

    @GetMapping("/{slug}")
    public StudyTopic findBySlug(@PathVariable String slug) {
        // ...
    }
}
```

## 三个注解分别放在哪里

| 注解 | 放置位置 | 当前作用 |
| --- | --- | --- |
| `@RequestMapping` | 类或方法 | 声明公共路径前缀或完整映射条件 |
| `@GetMapping` | 方法 | 声明只接受 HTTP GET 的方法映射 |
| `@PathVariable` | 方法参数 | 把 URL 路径片段绑定到 Java 参数 |

完整路径由类级和方法级映射组合：

```text
/api/topics + /{slug}
= /api/topics/{slug}
```

## `@RequestMapping`

`@RequestMapping` 能同时约束多个请求维度。常用属性包括：

| 属性 | 含义 |
| --- | --- |
| `value` / `path` | URL 路径模式，二者互为别名 |
| `method` | HTTP 方法 |
| `consumes` | 可接受的请求体媒体类型 |
| `produces` | 可生成的响应媒体类型 |
| `params` | 必须满足的查询参数条件 |
| `headers` | 必须满足的请求头条件 |

类级映射通常提供公共路径前缀，方法级映射再声明具体操作。

## `@GetMapping`

`@GetMapping` 是组合注解，是下面写法的快捷形式：

```java
@RequestMapping(method = RequestMethod.GET)
```

它同样提供 `value`、`path`、`produces` 等常用属性：

```java
@GetMapping(
    path = "/{slug}",
    produces = MediaType.APPLICATION_JSON_VALUE
)
```

当前应用有 JSON 消息转换器，可以根据返回对象选择 JSON，因此首章不要求显式写 `produces`。

不要在同一个方法上同时叠加 `@GetMapping` 和另一个 `@RequestMapping` 映射；它们表达的是同一个映射槽位，应该选择一种清晰写法。

## `@PathVariable`

路径模板：

```java
@GetMapping("/{slug}")
```

参数绑定：

```java
findBySlug(@PathVariable String slug)
```

模板变量名与 Java 参数名相同，并且构建保留了参数名时，Spring 可以自动匹配。也可以显式声明：

```java
findBySlug(@PathVariable("slug") String requestedSlug)
```

这里 `slug` 是 HTTP 路径变量名，`requestedSlug` 是 Java 局部参数名。

## 404 与 405 为什么不同

```text
没有任何映射匹配路径
→ 404 Not Found

路径存在，但不接受当前 HTTP 方法
→ 405 Method Not Allowed
```

检查点四加入 GET 映射后，同一路径的 POST 从原来的 404 变为 405。这证明 Spring MVC 已经识别该资源路径，只是拒绝了错误方法。

## 谁读取这些注解

应用上下文启动时，Spring MVC 检查 Controller Bean 的映射注解并建立路由表。请求到达时，`DispatcherServlet` 使用路由表选择处理方法，再解析 `@PathVariable` 等参数注解。

因此映射冲突通常在启动时就会暴露；路径变量值则在每次请求时绑定。

## 常见误区

- `@RestController` 注册 Controller 角色，但不自动产生 `/api/...` 路径。
- `@PathVariable` 读取路径片段，不读取 `?name=value` 查询参数；后者使用 `@RequestParam`。
- Java 方法名 `findBySlug` 不决定 URL，映射注解决定 URL。
- 返回 Java 对象不等于响应一定成功；方法仍可能抛异常并进入异常解析流程。

## 官方查询

- [`@RequestMapping` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RequestMapping.html)
- [`@GetMapping` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/GetMapping.html)
- [`@PathVariable` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/PathVariable.html)
