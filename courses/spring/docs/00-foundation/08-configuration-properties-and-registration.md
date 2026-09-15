# Spring 基础 00·08：`@ConfigurationProperties` 与配置对象注册

Spring Boot 可以从配置文件、环境变量和命令行等来源读取字符串属性，再把一组相关属性绑定为一个有明确 Java 类型的对象。

本章使用：

```java
@ConfigurationProperties(prefix = "study.plan")
public record StudyPlanProperties(
        String displayName,
        int dailyMinutes,
        boolean remindersEnabled
) {
}
```

对应配置：

```properties
study.plan.display-name=Spring Study Plan
study.plan.daily-minutes=30
study.plan.reminders-enabled=false
```

## `@ConfigurationProperties` 放在哪里

它的目标位置包括类型和 `@Bean` 方法。当前课程把它放在 record 类型上，表示这个类型描述前缀 `study.plan` 下的一组外部属性。

`prefix` 必须采用小写 kebab-case。组件名也推荐在配置文件中使用 kebab-case：

```text
Java 组件 dailyMinutes
↕ relaxed binding
配置键 daily-minutes
```

## 注解不等于 Bean 注册

`@ConfigurationProperties` 描述“怎样绑定”，但单独写在类型上不保证该类型已经成为容器中的 Bean。

本章采用显式注册：

```java
@SpringBootApplication
@EnableConfigurationProperties(StudyPlanProperties.class)
public class SpringCourseApplication {
}
```

两项职责是：

| 元素 | 职责 |
| --- | --- |
| `@ConfigurationProperties` | 声明属性前缀和目标数据结构 |
| `@EnableConfigurationProperties` | 让指定配置类型参与绑定并注册为 Bean |

另一种选择是 `@ConfigurationPropertiesScan`，让 Spring Boot 从指定包扫描配置属性类型。当前项目只有一个自定义配置对象，显式列出类型更容易追踪，后续数量增加时再考虑扫描。

## record 与构造器绑定

只有一个规范构造器的 record 可以直接使用构造器绑定，不需要额外添加 `@ConstructorBinding`。

启动时大致发生：

```text
收集 PropertySource
→ 按优先级得到每个键的最终值
→ 把字符串转换为 String、int、boolean
→ 调用 StudyPlanProperties 规范构造器
→ 注册不可变配置 Bean
→ 注入 StudyPlanService
```

因此配置对象的紧凑构造器也会在应用启动期间执行。如果配置无法构成有效对象，应用应尽早失败，而不是等某次请求执行除法时才暴露问题。

## relaxed binding

“宽松绑定”允许不同属性来源使用适合自己的命名形式。例如 Java 组件：

```java
int dailyMinutes
```

推荐的 properties 写法：

```properties
study.plan.daily-minutes=30
```

环境变量写法：

```text
STUDY_PLAN_DAILYMINUTES=20
```

环境变量转换规则的重点是：点变成下划线、短横线被移除、字母转为大写。因此 `daily-minutes` 对应 `DAILYMINUTES`，不是凭感觉随意添加下划线。

## 与 `@Value` 的区别

单个属性可以写成：

```java
@Value("${study.plan.daily-minutes}")
private int dailyMinutes;
```

但同一功能有多个相关字段时，逐个散落会造成：

- 前缀重复；
- 类型和默认值分散；
- Service 难以从构造器看出完整配置依赖；
- 很难在一个边界统一验证字段之间的关系。

`@ConfigurationProperties` 更适合应用自己定义的一组结构化配置。`@Value` 仍适合少量、独立的值或确实需要表达式的场景。

## 常见误区

- 只加 `@ConfigurationProperties`，却没有通过 enable 注解、扫描或 Bean 方法注册该类型。
- 把 prefix 写成 `studyPlan`；prefix 应使用 `study.plan` 这类规范形式。
- 在配置对象中注入业务 Service。配置对象应该只承载环境数据，不应反向依赖业务层。
- 认为 record 会自动提供业务默认值；没有外部值时，引用类型可能为 `null`，基本类型会得到 Java 默认值。
- 为单构造器 record 机械添加已经不需要的 `@ConstructorBinding`。

## 官方查询

- [`@ConfigurationProperties` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/context/properties/ConfigurationProperties.html)
- [Spring Boot 外部化配置与类型安全绑定](https://docs.spring.io/spring-boot/reference/features/external-config.html)
