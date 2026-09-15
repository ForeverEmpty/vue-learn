# Spring 基础 00·10：Profile 与 `application-{profile}.properties`

Profile 用一个名字表示当前激活的一组环境差异。它既可以影响配置文件，也可以条件化 Bean；本章只使用第一种能力。

## 基础文件与 Profile 文件

基础文件：

```text
application.properties
```

`local` Profile 对应：

```text
application-local.properties
```

激活 `local` 时，Spring Boot 会先考虑基础文件，再用 Profile 文件中的同名键覆盖：

```properties
# application.properties
study.plan.display-name=Spring Study Plan
study.plan.daily-minutes=30
study.plan.reminders-enabled=false
```

```properties
# application-local.properties
study.plan.display-name=Local Intensive Plan
study.plan.daily-minutes=60
study.plan.reminders-enabled=true
```

没有在 Profile 文件中重复的键会继续沿用基础值。这是按键合并和覆盖，不是必须复制整个基础文件。

## 激活 Profile

命令行：

```powershell
java -jar target/spring-course-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

也可以通过环境变量：

```powershell
$env:SPRING_PROFILES_ACTIVE = "local"
```

开发者可以在基础配置中提供默认激活值，但生产部署通常由运行环境明确选择。课程不会把 `local` 永久写进 `application.properties`，避免打包后在所有环境自动启用。

## `default` Profile

没有显式激活 Profile 时，Environment 仍有名为 `default` 的默认 Profile。普通的 `application.properties` 并不等同于 `application-default.properties`：前者总是基础配置，后者是默认 Profile 的特定配置。

本章只需要“没有激活时使用基础值，激活 local 时叠加 local 文件”，不额外建立 default 文件。

## 多个 Profile

可以激活多个 Profile：

```text
--spring.profiles.active=local,debug
```

对于同一位置的多个 Profile 文件，后面的 Profile 可以覆盖前面的值，即 last-wins。多个 Profile 开始互相覆盖时，应先检查它们是否承担了过多、重叠的职责。

## 不要在 Profile 文件里激活自己

`spring.profiles.active` 和 `spring.profiles.default` 只能放在非 Profile 特定文档中。不要在 `application-local.properties` 中写：

```properties
spring.profiles.active=local
```

Profile 文件被加载的前提本来就是 Profile 已经被激活。在里面再次激活自身既不能建立清晰入口，也违反该属性的放置规则。

## 与 `@Profile` 的区别

Profile 也能放到 Bean 定义上：

```java
@Profile("local")
@Service
class LocalOnlyService {
}
```

这表示只有激活 `local` 时才注册该 Bean。它适合环境确实需要不同实现的情况。

当前学习计划只改变数据值，Service 算法完全相同，所以使用 Profile 配置文件，不创建两套 `StudyPlanService`。用配置解决数据差异，用条件 Bean 解决对象实现差异。

## Profile 不是秘密管理器

`prod` Profile 可以选择生产环境配置，但不能因为文件名包含 `prod` 就把数据库密码提交到仓库。Profile 解决配置分组与条件激活，秘密仍应由安全的外部来源提供。

## 常见误区

- 把 Profile 理解成另一份完整应用；代码和大部分配置仍然共享。
- 为一个数值变化创建两套 Service 类。
- 在 Profile 文件复制所有基础值，导致两份配置逐渐漂移。
- 在 `application-local.properties` 中设置 `spring.profiles.active=local`。
- 忘记停止旧进程，误把旧进程的响应当成新 Profile 的结果。

## 官方查询

- [Spring Boot Profiles](https://docs.spring.io/spring-boot/reference/features/profiles.html)
- [Profile-specific Files](https://docs.spring.io/spring-boot/reference/features/external-config.html#features.external-config.files.profile-specific)
