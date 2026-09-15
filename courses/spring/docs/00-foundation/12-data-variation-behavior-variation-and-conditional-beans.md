# Spring 基础 00·12：数据变化、行为变化与条件 Bean

同一个应用进入不同环境时，差异大致分成两类：值发生变化，或者对象的实现方式发生变化。先判断差异属于哪一类，再决定使用配置属性还是条件 Bean。

## 一句话判断

```text
算法不变，只换输入值  → 配置属性
契约不变，但实现不同  → 条件 Bean
```

这也是第二章只创建一份 `StudyPlanService` 的原因。基础环境每天学习 30 分钟，local 环境每天学习 60 分钟，但两边都执行同一套流程：查找主题、读取每日分钟数、计算预计天数并生成计划。变化的是数据，不是业务行为。

## 数据变化：保留同一个对象

基础配置：

```properties
study.plan.daily-minutes=30
```

local Profile：

```properties
study.plan.daily-minutes=60
```

Spring 最终仍然创建相同的对象结构：

```text
StudyPlanProperties
        ↓ 注入
StudyPlanService
```

只有注入的数据不同。如果为 30 和 60 分别创建两个 Service，就会复制查找主题、计算天数和组装结果的代码；以后修改算法时还需要同时维护多份实现。

适合使用配置的常见差异包括：

- 端口、URL 和超时时间；
- 页面大小、批处理数量和每日分钟数；
- 是否启用一个简单功能；
- 不同环境的非敏感显示名称。

## 行为变化：替换实现对象

假设本地环境只把提醒打印到控制台，而生产环境必须调用邮件服务。此时变化的不再是一个字符串或数字，而是“怎样发送提醒”。可以先定义稳定契约：

```java
public interface ReminderSender {
    void send(StudyPlan plan);
}
```

再提供两种实现：

```java
@Service
@Profile("local")
public final class ConsoleReminderSender implements ReminderSender {
    @Override
    public void send(StudyPlan plan) {
        System.out.println("Reminder: " + plan.displayName());
    }
}
```

```java
@Service
@Profile("prod")
public final class EmailReminderSender implements ReminderSender {
    private final EmailClient emailClient;

    public EmailReminderSender(EmailClient emailClient) {
        this.emailClient = emailClient;
    }

    @Override
    public void send(StudyPlan plan) {
        emailClient.send(plan.displayName());
    }
}
```

消费方只依赖接口：

```java
@Service
public final class ReminderService {
    private final ReminderSender sender;

    public ReminderService(ReminderSender sender) {
        this.sender = sender;
    }
}
```

启动时，Spring 根据激活的 Profile 只注册符合条件的实现，再通过构造器注入。`ReminderService` 不需要读取 Profile 名称，也不需要编写 `if (local)`。

## 它与策略模式的关系

`ReminderSender` 的多个实现可以看作策略模式：调用方依赖一个稳定接口，不同实现封装不同算法或外部协作方式。

Spring 的 DI 容器负责装配策略，`@Profile` 负责决定当前启动选择哪一个策略。三者职责不同：

| 元素 | 职责 |
| --- | --- |
| 接口与多个实现 | 提供可替换行为 |
| 依赖注入 | 把选中的实现交给消费方 |
| `@Profile` | 声明实现在哪类环境中可用 |

使用了 `@Profile` 不一定就等于使用策略模式；只有确实存在可替换行为并由共同契约隔离时，这个结构才具有策略模式的意义。

## 什么时候适合条件 Bean

更适合替换 Bean 的情况包括：

- 本地写文件，生产写对象存储；
- 本地打印通知，生产调用邮件或短信供应商；
- 不同部署环境使用协议或 SDK 完全不同的外部系统；
- 某个环境需要注册专属基础设施对象。

如果两个实现只是构造器参数不同，应先考虑保留一个实现并配置参数。如果实现的大部分代码重复，也应先提取共同逻辑，而不是用 Profile 掩盖重复。

## 两种常见反例

不要让业务对象主动判断当前 Profile：

```java
if (environment.matchesProfiles("local")) {
    // local 算法
} else {
    // prod 算法
}
```

这会让环境选择和业务算法缠在同一个类中。确实存在两套行为时，让容器在外部选择实现更清晰。

也不要为纯数据差异创建两份近乎相同的 Service：

```text
LocalStudyPlanService   dailyMinutes = 60
ProdStudyPlanService    dailyMinutes = 30
```

这里真正变化的只是值，应交给 `StudyPlanProperties`。

## 决策顺序

遇到环境差异时依次询问：

1. 变化的是值，还是处理过程？
2. 一个实现加不同配置是否已经足够？
3. 如果过程真的不同，能否抽出稳定接口？
4. 这些实现是否应在启动时二选一？
5. 消费方是否只依赖接口，而不知道具体 Profile？

当前课程的答案是：`StudyPlanService` 的处理过程完全相同，所以用 Profile 文件改变数据；若以后提醒发送方式在不同环境真正不同，再为 `ReminderSender` 建立条件 Bean。

## 官方查询

- [Spring Framework Bean Definition Profiles](https://docs.spring.io/spring-framework/reference/core/beans/environment.html#beans-definition-profiles)
- [Spring Framework `@Profile` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Profile.html)

