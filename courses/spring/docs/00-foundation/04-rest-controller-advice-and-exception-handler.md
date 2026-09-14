# Spring 基础 00·04：`@RestControllerAdvice` 与 `@ExceptionHandler`

这两个注解共同建立 Spring MVC 的统一 REST 异常处理，但它们修饰的位置和职责不同。

正确骨架是：

```java
@RestControllerAdvice
public final class TopicExceptionHandler {

    @ExceptionHandler(TopicNotFoundException.class)
    public ResponseEntity<ApiError> handle(
            TopicNotFoundException exception
    ) {
        // 构造 HTTP 响应
    }
}
```

## 首先记住放置位置

```text
@RestControllerAdvice
        ↓ 修饰类
TopicExceptionHandler

@ExceptionHandler(...)
        ↓ 修饰方法
handle(...)
```

`@RestControllerAdvice` 的 Java `@Target` 是 `TYPE`，即类、接口等类型位置；`@ExceptionHandler` 的 `@Target` 是 `METHOD`。它们不是两个连续放在同一个类上的开关。

## `@RestControllerAdvice` 是什么

它是一个组合注解：

```text
@ControllerAdvice
+
@ResponseBody
```

两部分含义是：

- `@ControllerAdvice`：声明一个可向多个 Controller 提供增强方法的 Spring 组件；
- `@ResponseBody`：异常处理方法的返回值写入 HTTP 响应体，并经过消息转换器处理，而不是被解释为视图名称。

默认情况下，它可以作用于应用中的所有 `@Controller` 和 `@RestController`。首章只有一个 Controller，所以直接使用默认范围。

## 为什么它会成为 Bean

`@ControllerAdvice` 本身带有组件语义，因此 `@RestControllerAdvice` 修饰的类能够被组件扫描发现并注册为 Bean。

如果只是创建一个没有该注解的 `TopicExceptionHandler` 普通类，Spring MVC 不会自动搜索其中的 `handle` 方法。

## 常用范围属性

大型应用不一定希望一个 advice 作用于所有 Controller，可以使用：

| 属性 | 作用 |
| --- | --- |
| `basePackages` / `value` | 只作用于指定包中的 Controller |
| `basePackageClasses` | 用类型安全方式指定包 |
| `assignableTypes` | 只作用于指定 Controller 类型 |
| `annotations` | 只作用于带某种注解的 Controller |
| `name` | 建议该 advice Bean 的名称 |

首章不需要这些属性。没有真实范围需求时保持默认，比提前写包名字符串更简单。

## `@ExceptionHandler` 是什么

`@ExceptionHandler` 修饰异常处理方法，告诉 Spring MVC：当请求处理过程中出现指定异常时，这个方法是候选处理器。

显式声明异常类型：

```java
@ExceptionHandler(TopicNotFoundException.class)
```

也可以根据方法的异常参数推断：

```java
@ExceptionHandler
public ResponseEntity<ApiError> handle(
        TopicNotFoundException exception
) {
}
```

当前课程使用显式写法，让读代码时无需再从方法参数反推映射关系。

## 常用属性

Spring Framework 7 中主要包括：

| 属性 | 作用 |
| --- | --- |
| `value` | 处理的异常类型 |
| `exception` | 与 `value` 互为别名，处理的异常类型 |
| `produces` | 该处理方法能够生成的媒体类型 |

因此下面两种异常声明含义相同：

```java
@ExceptionHandler(TopicNotFoundException.class)
```

```java
@ExceptionHandler(exception = TopicNotFoundException.class)
```

首章使用最常见的第一种形式。

## 两个注解怎样协作

应用启动时：

```text
组件扫描发现 @RestControllerAdvice 类
→ Spring MVC 记录其中的 @ExceptionHandler 方法
```

请求运行时：

```text
DispatcherServlet 调用 TopicController
→ Controller 抛出 TopicNotFoundException
→ 异常解析器先查 Controller 自己的局部处理方法
→ 再查全局 ControllerAdvice Bean
→ 找到 handle(TopicNotFoundException)
→ 调用 handle
→ 返回值写入 HTTP 响应体
```

这套机制只处理进入 Spring MVC 请求链的异常，不是 JVM 中任何线程抛出的异常都会自动进入这里。定时任务、消息消费者或手动创建的新线程有自己的错误边界。

## 局部与全局异常处理

`@ExceptionHandler` 可以直接写在某个 Controller 内，此时主要服务该 Controller；放在 `@RestControllerAdvice` Bean 中则可以跨 Controller 复用。

```text
Controller 内部 @ExceptionHandler
→ 局部、离使用点近

@RestControllerAdvice 中 @ExceptionHandler
→ 全局、错误契约集中
```

Spring MVC 会优先寻找当前 Controller 中的匹配方法，然后再考虑全局 advice。首章选择全局形式，是因为 `ApiError` 代表整个 API 希望保持一致的错误契约。

## 它与 try/catch 的区别

Controller 当然可以手写：

```java
try {
    // 调用 Service
} catch (TopicNotFoundException exception) {
    // 构造响应
}
```

但每个入口都这样写会重复协议转换。`@ExceptionHandler` 把这类边界转换集中到专门方法，同时让 Controller 的成功路径保持清晰。

这不代表业务代码以后完全不写 `try/catch`。如果当前层能够恢复、重试、补偿或添加必要上下文，局部捕获仍然合理；统一 advice 负责的是跨越 HTTP 边界的最终表达。

## 当前检查点中的分工

```java
@RestControllerAdvice
public final class TopicExceptionHandler {
```

这一步解决“Spring 怎样发现全局处理类”。

```java
@ExceptionHandler(TopicNotFoundException.class)
public ResponseEntity<ApiError> handle(...) {
```

这一步解决“哪个方法处理哪种异常”。

方法内部的 `ResponseEntity` 再解决“返回哪个状态码和响应体”。三个职责不要混在一个注解概念里。

## 常见误区

- 只添加 `@RestControllerAdvice` 不会自动决定所有异常怎样返回，仍需要处理方法。
- 只给普通类的方法添加 `@ExceptionHandler`，但类没有成为 Controller 或 advice Bean，Spring MVC不会使用它。
- 不要用 `@ExceptionHandler(Exception.class)` 把所有故障伪装成 404。
- advice 负责转换响应，不应在这里重新执行主题查询或修改业务数据。
- `@RestControllerAdvice` 不是 AOP 环绕通知；它是 Spring MVC 的 Controller advice 机制。

## 官方查询

- [`@RestControllerAdvice` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RestControllerAdvice.html)
- [`@ExceptionHandler` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html)
- [Spring MVC Controller Advice](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html)
