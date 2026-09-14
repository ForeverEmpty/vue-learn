# 00. Spring 基础查询手册

这个目录与 Java、Vue 课程的 00 模块作用相同：正式章节第一次出现新的 Spring 注解、核心类型、重要属性或设计思想时，在这里增加一篇独立说明；理解后再返回正式章节。

它不是要求开始 Spring Boot 前全部背完的前置课程，而是一份可以不断扩展、从业务代码反向跳转的查询手册。

## 当前目录

| 小节 | 类型 | 主题 | 首次使用位置 |
| --- | --- | --- | --- |
| 01 | 启动 | [`@SpringBootApplication` 与启动入口](./01-spring-boot-application-and-startup.md) | `SpringCourseApplication` |
| 02 | 容器 | [组件角色注解与 Bean](./02-stereotype-annotations-and-beans.md) | `TopicCatalogService`、`TopicController` |
| 03 | Web | [MVC 请求映射注解](./03-mvc-request-mapping-annotations.md) | `TopicController` |
| 04 | Web | [`@RestControllerAdvice` 与 `@ExceptionHandler`](./04-rest-controller-advice-and-exception-handler.md) | `TopicExceptionHandler` |
| 05 | HTTP | [`ResponseEntity` 与 `HttpStatus`](./05-response-entity-and-http-status.md) | `TopicExceptionHandler.handle` |
| 06 | 设计 | [依赖倒置、IoC 与依赖注入](./06-dependency-inversion-ioc-and-dependency-injection.md) | Controller 构造器注入 |
| 07 | 设计 | [异常翻译与统一错误边界](./07-exception-translation-and-error-boundaries.md) | 未知主题的 404 映射 |

## 每篇基础说明回答什么

对于注解，至少回答：

1. 注解应该放在类、方法、参数还是字段上？
2. 它是不是由其他注解组合而成？
3. Spring 在启动时还是请求处理中读取它？
4. 常用属性是什么，默认值意味着什么？
5. 它改变了哪一段可观察行为？
6. 它容易和哪个相似注解混淆？

对于核心类型或配置项，至少回答它承载的数据、由谁创建、在哪一层使用以及常见边界。

## 学习约定

- 每类紧密相关的注解或类型使用一个独立 Markdown 文件，不堆进总索引。
- 正式章节保留当前任务所需的简要说明，并链接到这里的详细篇章。
- 设计思想和设计模式也各自单开详细篇章，并尽量提供可运行实例。
- 00 基础默认不创建复习题；需要练习时再主动提出。
- 新知识只在实际出现时补充，不要求一次学完未来所有 Spring 注解。
