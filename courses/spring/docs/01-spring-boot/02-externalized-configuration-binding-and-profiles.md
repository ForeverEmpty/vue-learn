# Spring Boot 01·02：外部化配置、类型安全绑定与 Profile

> 完成状态：6 个检查点、第二章 9 项自动验收、Spring 全量 16 项验收、四级配置覆盖实践和复习题均已完成。

第一章建立了固定行为：同一主题永远返回同一份数据。真实应用还需要处理另一类变化——代码不变，但不同运行环境需要不同参数。

本章不会只读取一个孤立字符串。你将建立一条完整配置链：

```text
application.properties
Profile 配置文件
操作系统环境变量
命令行参数
        ↓
Spring Environment 与覆盖优先级
        ↓
StudyPlanProperties 类型化配置 Bean
        ↓
StudyPlanService 组合主题与配置并计算计划
        ↓
GET /api/study-plans/{slug}
```

最终，同一个可执行 jar 不需要重新编译，就能根据运行环境生成不同的学习计划。

## 本章目标

- 理解“外部化配置”为什么能让同一份构建产物适应不同环境。
- 区分配置来源、最终值、类型化配置对象三个层次。
- 使用 `@ConfigurationProperties` 把一组属性绑定到不可变 record。
- 使用 `@EnableConfigurationProperties` 显式注册配置对象。
- 在配置进入 Service 前固定对象不变量，让无效配置快速失败。
- 通过构造器把配置注入业务 Service，而不是在业务方法中读取字符串键。
- 使用 `application-local.properties` 表达环境差异。
- 推导基础配置、Profile、环境变量和命令行参数之间的覆盖结果。
- 继续复用第一章的查询服务、404 异常和统一错误响应。

自动验收代码会继续存在，但只负责告诉你功能是否达到目标；本章复习题不考测试框架、测试分类、注解或断言 API。

## 开始前的基础查询

本章会使用以下 Java 基础：

1. [Java 00·10：record 数据载体](../../../java/docs/00-foundation/10-record-data-carriers.md)
2. [Java 00·11：Optional](../../../java/docs/00-foundation/11-optional.md)——重点回看 `map`。
3. [Java 00·13：record 紧凑构造器与对象不变量](../../../java/docs/00-foundation/13-record-compact-constructor-and-invariants.md)

Spring 配置机制分别放在：

1. [Spring 00·08：`@ConfigurationProperties` 与配置对象注册](../00-foundation/08-configuration-properties-and-registration.md)
2. [Spring 00·09：`Environment`、`PropertySource` 与覆盖优先级](../00-foundation/09-environment-property-sources-and-precedence.md)
3. [Spring 00·10：Profile 与 Profile 特定配置文件](../00-foundation/10-profiles-and-profile-specific-configuration.md)
4. [Spring 00·11：类型化配置边界与快速失败](../00-foundation/11-typed-configuration-boundary-and-fail-fast.md)

请求映射继续使用第一章已经学习过的 [Spring 00·03：MVC 请求映射注解](../00-foundation/03-mvc-request-mapping-annotations.md)，不重复发明另一套入口规则。

## 1. 这次要解决的业务问题

主题目录已经能够返回：

```json
{
  "slug": "spring-boot",
  "title": "Spring Boot",
  "estimatedMinutes": 45
}
```

现在希望用户输入主题后得到一份计划：

```json
{
  "displayName": "Spring Study Plan",
  "topicSlug": "spring-boot",
  "topicTitle": "Spring Boot",
  "totalMinutes": 45,
  "dailyMinutes": 30,
  "estimatedDays": 2,
  "remindersEnabled": false
}
```

其中主题标题和总分钟数来自 `TopicCatalogService`，下面三个值来自运行配置：

```text
displayName
dailyMinutes
remindersEnabled
```

预计天数由两侧数据共同计算：

```text
45 分钟主题，每天 30 分钟
第 1 天学习 30 分钟
第 2 天学习剩余 15 分钟
结果为 2 天
```

正整数向上取整可以写成：

```java
int estimatedDays = (totalMinutes + dailyMinutes - 1) / dailyMinutes;
```

这个公式依赖 `dailyMinutes > 0`。因此配置对象必须先拒绝零和负数，Service 才能安全计算。

## 2. 外部化配置不是什么

如果在 Service 中写：

```java
private static final int DAILY_MINUTES = 30;
```

修改学习强度就必须修改源码、重新编译、重新打包。这个值已经成为代码的一部分。

外部化后：

```properties
study.plan.daily-minutes=30
```

代码只声明“我需要一个每日分钟数”，运行环境决定具体值。外部化配置不是让业务规则全部变成任意开关，也不是把 Java 常量机械搬进 properties；它适合部署环境、运行策略和可调整参数。

## 3. 从原始属性到配置 Bean

目标类型已经提供了起始骨架：

```java
public record StudyPlanProperties(
        String displayName,
        int dailyMinutes,
        boolean remindersEnabled
) {
}
```

你会给它添加：

```java
@ConfigurationProperties(prefix = "study.plan")
```

再在主应用类添加：

```java
@EnableConfigurationProperties(StudyPlanProperties.class)
```

两者不能互相替代：前者描述绑定规则，后者把配置类型注册进当前应用。

基础配置使用规范的 kebab-case：

```properties
study.plan.display-name=Spring Study Plan
study.plan.daily-minutes=30
study.plan.reminders-enabled=false
```

绑定器根据 record 构造器参数完成类型转换：

```text
"Spring Study Plan" → String
"30"                → int
"false"             → boolean
```

如果写成 `study.plan.daily-minutes=abc`，问题不是 Service 计算错误，而是字符串无法绑定为 `int`，应用应在启动阶段失败。

## 4. 为什么配置对象需要构造约束

类型转换只能证明 `30` 是整数，不能证明 `0` 是合理的每日学习时间。

```text
类型正确：0 是合法 int
业务无效：0 不能作为除数，也无法形成可执行学习计划
```

因此 `StudyPlanProperties` 的紧凑构造器需要固定：

```text
displayName != null
displayName 不是空白字符串
dailyMinutes > 0
```

这是一条边界原则：能创建出来的配置对象就应该满足后续代码依赖的基本条件。详细设计见 [Spring 00·11](../00-foundation/11-typed-configuration-boundary-and-fail-fast.md)。

## 5. 配置进入 Service 后如何参与业务

`StudyPlanService` 同时需要：

```text
TopicCatalogService  提供主题数据
StudyPlanProperties  提供运行配置
```

构造器已经把两项依赖写出来：

```java
public StudyPlanService(
        TopicCatalogService topicCatalogService,
        StudyPlanProperties properties
) {
    this.topicCatalogService = topicCatalogService;
    this.properties = properties;
}
```

`createFor` 的数据流应该是：

```text
slug
→ TopicCatalogService.findBySlug
→ Optional<StudyTopic>
→ 有主题：结合 StudyPlanProperties 计算 StudyPlan
→ 无主题：保持 Optional.empty()
```

可以使用 `Optional.map` 表达“存在时转换，缺失时仍然缺失”。Service 不应该在这里抛出 404，因为它仍然不依赖 HTTP。

## 6. 新接口如何复用第一章边界

第二章新增：

```http
GET /api/study-plans/spring-boot
```

Controller 的职责仍然是：

```text
绑定 slug
→ 调用 StudyPlanService
→ 成功时返回 StudyPlan
→ 缺失时抛出 TopicNotFoundException
```

第一章的 `TopicExceptionHandler` 已经能够把同一种异常翻译成统一 404 JSON，因此不需要再创建 `StudyPlanExceptionHandler`：

```json
{
  "code": "TOPIC_NOT_FOUND",
  "message": "Unknown study topic: missing"
}
```

这是递进复用，而不是复制已有错误处理代码。

## 7. Profile 只覆盖差异

基础环境：

```properties
study.plan.display-name=Spring Study Plan
study.plan.daily-minutes=30
study.plan.reminders-enabled=false
```

本地强化环境：

```properties
study.plan.display-name=Local Intensive Plan
study.plan.daily-minutes=60
study.plan.reminders-enabled=true
```

激活 `local` 后，不需要更换 Java 类。Spring Boot 使用 Profile 文件的同名值创建同一个 `StudyPlanProperties` 类型，再注入同一个 `StudyPlanService`。

如果差异只是数据，就不应为了 Profile 编写两套计算逻辑。如何区分数据变化和行为变化、什么时候才应该用 `@Profile` 替换实现，见 [Spring 00·12：数据变化、行为变化与条件 Bean](../00-foundation/12-data-variation-behavior-variation-and-conditional-beans.md)。

## 8. 四级覆盖关系

本章只使用最常见的四级来源：

```text
application.properties                   30
application-local.properties             60
STUDY_PLAN_DAILYMINUTES 环境变量          20
--study.plan.daily-minutes 命令行参数     15
```

当它们同时出现时，最终值为 `15`：

```text
基础文件 < Profile 文件 < 环境变量 < 命令行参数
```

这不是简单的文件先后顺序，而是 Spring Boot 定义的 `PropertySource` 优先级。本章先掌握当前子集，完整机制随时查询 [Spring 00·09](../00-foundation/09-environment-property-sources-and-precedence.md)。

## 9. 起始文件

第二章已经创建可编译骨架：

```text
src/main/java/study/spring/plan/
├─ StudyPlanProperties.java   类型化配置与不变量
├─ StudyPlan.java             HTTP 响应数据
├─ StudyPlanService.java      主题与配置的组合计算
└─ StudyPlanController.java   新的 HTTP 入口

src/main/resources/
├─ application.properties
└─ application-local.properties
```

起始代码故意保持以下状态：

- 配置 record 尚未验证不变量；
- 配置类型尚未参与 Spring 绑定；
- Service 返回空结果；
- Controller 尚未建立请求映射；
- local Profile 文件只有 TODO。

所有类型都能编译。未完成的是运行目的，不是 Java 语法。

## 检查点一：固定配置对象不变量

先阅读 [Java 00·13：record 紧凑构造器](../../../java/docs/00-foundation/13-record-compact-constructor-and-invariants.md) 和 [Spring 00·11：类型化配置边界与快速失败](../00-foundation/11-typed-configuration-boundary-and-fail-fast.md)。

在 `StudyPlanProperties` 中实现紧凑构造器：

1. `displayName == null` 或 `displayName.isBlank()` 时抛出 `IllegalArgumentException`。
2. `dailyMinutes <= 0` 时抛出 `IllegalArgumentException`。
3. 不要为 `remindersEnabled == false` 抛异常；关闭提醒是合法配置。
4. 不要手工给 record 组件赋值，正常结束后由规范构造过程完成。

执行：

```bash
npm run spring:test:chapter-02
```

预期 9 项中 3 项通过。这里只看通过数量和失败是否仍集中在尚未实现的配置绑定、计划生成与 Web 接口，不需要阅读测试源码。

## 检查点二：绑定基础配置

阅读 [Spring 00·08：配置属性与注册](../00-foundation/08-configuration-properties-and-registration.md)。完成三处协作：

1. 给 `StudyPlanProperties` 添加 `@ConfigurationProperties(prefix = "study.plan")`。
2. 给 `SpringCourseApplication` 添加 `@EnableConfigurationProperties(StudyPlanProperties.class)`。
3. 在 `application.properties` 保留 `spring.application.name`，并加入本章三个基础值：

```properties
study.plan.display-name=Spring Study Plan
study.plan.daily-minutes=30
study.plan.reminders-enabled=false
```

完成后，启动过程应该能创建一个 `StudyPlanProperties` Bean。不要同时给配置 record 添加 `@Component`，本章只保留一条明确注册路径。

再次执行章节验收，预期 4 项通过。

## 检查点三：让 Service 消费类型化配置

实现 `StudyPlanService`：

1. 使用 `@Service` 注册它。
2. 保留已有构造器注入，不在方法里读取 `Environment`。
3. `createFor(slug)` 调用 `TopicCatalogService.findBySlug(slug)`。
4. 主题存在时创建 `StudyPlan`，字段分别来自主题、配置和计算结果。
5. 主题缺失时保持 `Optional.empty()`。
6. 使用正整数向上取整公式计算 `estimatedDays`。

字段映射：

| `StudyPlan` 字段 | 来源 |
| --- | --- |
| `displayName` | `StudyPlanProperties` |
| `topicSlug`、`topicTitle`、`totalMinutes` | `StudyTopic` |
| `dailyMinutes`、`remindersEnabled` | `StudyPlanProperties` |
| `estimatedDays` | 总分钟数与每日分钟数计算 |

完成后预期 5 项通过。此时纯业务组合已经成立，但还没有新的 HTTP 路由。

## 检查点四：建立学习计划接口

在 `StudyPlanController` 上完成：

1. REST Controller 角色注解。
2. 类级路径 `/api/study-plans`。
3. `findBySlug` 的 GET 子路径 `/{slug}`。
4. 把路径变量绑定到参数 `slug`。
5. 调用 `StudyPlanService.createFor`；缺失时抛出已有 `TopicNotFoundException`。

不要在 Controller 中重新计算天数，也不要重新拼装错误 JSON。

完成后预期 8 项通过：计划成功响应、方法限制和统一 404 应同时成立。

## 检查点五：添加 local Profile

阅读 [Spring 00·10：Profile 特定配置](../00-foundation/10-profiles-and-profile-specific-configuration.md)。在 `application-local.properties` 中写入：

```properties
study.plan.display-name=Local Intensive Plan
study.plan.daily-minutes=60
study.plan.reminders-enabled=true
```

不要在这个文件中添加 `spring.profiles.active=local`。Profile 必须由应用外部或基础配置激活，而不是在尚未加载的 Profile 文件中激活自身。

执行：

```bash
npm run spring:test:chapter-02
npm run spring:test
```

预期第二章 9 项全部通过，全量共 16 项通过。

## 检查点六：用同一个 jar 验证覆盖优先级

先打包：

```powershell
cd courses/spring
.\mvnw.cmd package
```

### 6.1 基础配置

启动：

```powershell
java -jar target/spring-course-0.0.1-SNAPSHOT.jar
```

在另一个终端请求：

```powershell
Invoke-RestMethod http://localhost:8080/api/study-plans/spring-boot
```

应观察到 `dailyMinutes=30`、`estimatedDays=2`。停止应用后继续。

### 6.2 local Profile

```powershell
java -jar target/spring-course-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

同一请求应变为 `dailyMinutes=60`、`estimatedDays=1`、`remindersEnabled=true`。

### 6.3 环境变量覆盖 Profile

在启动应用的终端中：

```powershell
$env:STUDY_PLAN_DAILYMINUTES = "20"
java -jar target/spring-course-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

这次应得到 `dailyMinutes=20`、`estimatedDays=3`。环境变量只影响当前 PowerShell 进程及其子进程，没有修改 properties 文件。

### 6.4 命令行覆盖环境变量

保持环境变量后启动：

```powershell
java -jar target/spring-course-0.0.1-SNAPSHOT.jar --spring.profiles.active=local --study.plan.daily-minutes=15
```

最终应得到 `dailyMinutes=15`、`estimatedDays=3`，证明命令行参数在当前四类来源中优先级最高。

完成后清理当前终端的临时环境变量：

```powershell
Remove-Item Env:STUDY_PLAN_DAILYMINUTES
```

每次切换配置前都先停止旧应用，避免请求仍进入旧进程。

## 本章完成标准

- 无效的配置对象不能被创建。
- `StudyPlanProperties` 由三个基础属性完成类型安全绑定。
- `StudyPlanService` 通过构造器得到配置并生成计划，不读取字符串键。
- 新接口成功返回完整计划，未知主题继续复用统一 404。
- local Profile 只覆盖环境差异，不复制 Java 实现。
- 能根据四级来源推导最终属性值。
- 第二章 9 项和全量 16 项自动验收全部通过。
- 同一个可执行 jar 已观察基础值、Profile、环境变量和命令行四种结果。
- 完成 [本章复习题](../../review_questions/01-spring-boot/02-externalized-configuration-binding-and-profiles.md)。

## 官方资料

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- [Spring Boot Profiles](https://docs.spring.io/spring-boot/reference/features/profiles.html)
- [`@ConfigurationProperties` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/context/properties/ConfigurationProperties.html)
- [`@EnableConfigurationProperties` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/context/properties/EnableConfigurationProperties.html)
