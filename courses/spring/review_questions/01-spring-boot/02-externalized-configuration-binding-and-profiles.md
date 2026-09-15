# Spring Boot 01·02 复习：外部化配置、类型安全绑定与 Profile

> 批改状态：已完成。第 1 题正确；第 2、3、5 题需要精确化；第 4 题由 Codex 详细讲解。

本章复习题只检查生产配置与业务设计，不涉及 JUnit、MockMvc、测试分类、测试注解或断言 API。

## 1. 为什么把 `dailyMinutes` 写在 `application.properties` 后，同一个 jar 可以在不同环境使用不同值？这与把它写成 Java 常量有什么区别？

可以根据不同环境读取不同的配置文件或配置，不同配置值不相同
写为常量每次修改值需要重新编译

> **批改：正确。** 外部配置由运行环境提供，同一份编译产物可以在启动时得到不同值；Java 常量已经编进产物，修改后需要重新编译和打包。补充一点：外部化配置不会自动刷新当前已创建的 Bean，本章配置是在应用启动时完成绑定。

## 2. `@ConfigurationProperties(prefix = "study.plan")` 和 `@EnableConfigurationProperties(StudyPlanProperties.class)` 分别承担什么职责？为什么不能把两者当成同一件事？

ConfigurationProperties标记该类为配置类
EnableConfigurationProperties注册某个类为配置类进入应用

@ConfigurationProperties 声明属性前缀和目标数据结构，告诉绑定器“哪些外部属性怎样进入这个类型”；它单独存在不保证对象已经成为 Bean
@EnableConfigurationProperties 则让指定类型参与绑定并注册为容器中的 Bean

> **批改：方向正确，但“配置类”这个说法不够精确。** `@ConfigurationProperties` 声明属性前缀和目标数据结构，告诉绑定器“哪些外部属性怎样进入这个类型”；它单独存在不保证对象已经成为 Bean。`@EnableConfigurationProperties` 则让指定类型参与绑定并注册为容器中的 Bean。前者描述绑定，后者负责启用和注册。

## 3. 基础配置为 30，local Profile 为 60，环境变量为 20，命令行参数为 15。当四者同时生效时最终值是什么？请写出覆盖过程。

Default > Local > Environment > Property
最终为15

> 为覆盖

Default > Local > Environment > 命令行参数

> **批改：最终值正确，来源名称和箭头含义需要修正。** `Default` 容易与 Spring 的 `default` Profile 混淆，此处应称为基础 `application.properties`；最后的 `Property` 也过于宽泛，应明确为命令行参数。按优先级从低到高是：基础配置 `30` → local Profile 覆盖为 `60` → 环境变量覆盖为 `20` → 命令行参数覆盖为 `15`，所以最终是 `15`。

## 4. 为什么本章只用 `application-local.properties` 改数据，而没有为 local Profile 再创建一个 `StudyPlanService`？什么情况下才更适合使用条件 Bean？


> **讲解：先判断变化的是“数据”还是“行为”。** 本章无论是否激活 local，都执行相同流程：查主题、读取每日分钟数、计算天数、创建计划。只有 `displayName`、`dailyMinutes` 和 `remindersEnabled` 的值改变，因此用配置覆盖即可。如果再创建一个 `LocalStudyPlanService`，两份 Service 会复制同一算法，后续修改时容易产生分叉。
>
> 条件 Bean 适合实现方式真正不同的场景。例如本地环境的 `ReminderSender` 只向控制台打印，而生产环境的实现需要调用邮件供应商。两者共享 `ReminderSender` 接口，但内部行为和依赖不同，可以分别使用 `@Profile("local")` 与 `@Profile("prod")`，让 Spring 启动时只注册当前实现。消费方仍只依赖接口，不读取 Profile，也不写环境判断。
>
> 可以记成：**算法不变、只换输入值，用配置；契约不变、实现方式不同，用条件 Bean。** 完整示例见 [Spring 00·12：数据变化、行为变化与条件 Bean](../../docs/00-foundation/12-data-variation-behavior-variation-and-conditional-beans.md)。


## 5. `StudyPlanProperties`、`StudyPlanService` 和 `StudyPlanController` 各自负责什么？如果 Service 直接调用 `Environment.getProperty("study.plan.daily-minutes")`，会破坏哪一层边界？

StudyPlanProperties负责获取配置
StudyPlanService负责业务逻辑、
StudyPlanController负责Http边界
直接调用会破坏后续若使用命令行参数修改配置

破坏了“类型化配置边界”，校验规则容易分散，拼错键也更晚暴露

> **批改：前三项职责基本正确，最后一句不正确。** `Environment` 本身已经合并配置文件、Profile、环境变量和命令行参数，所以直接调用 `getProperty` 仍能读到命令行覆盖值。真正被破坏的是“类型化配置边界”：字符串键和类型转换会泄漏到业务层，配置依赖在构造器上不再明确，校验规则容易分散，拼错键也更晚暴露。`StudyPlanProperties` 负责承载并验证绑定后的配置；Service 只消费类型安全对象并执行业务组合；Controller 只处理 HTTP 输入输出。
