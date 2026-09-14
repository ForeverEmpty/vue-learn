# Spring 基础 00·06：依赖倒置、IoC 与依赖注入

Spring Boot 首章中的 `TopicController` 需要使用 `TopicCatalogService`。看起来只是一条构造器赋值语句，背后实际连接了三个经常被混用的概念：

- 依赖倒置原则（Dependency Inversion Principle，DIP）；
- 控制反转（Inversion of Control，IoC）；
- 依赖注入（Dependency Injection，DI）。

它们相关，但不是三个同义词。本专题先用纯 Java 代码建立区别，再映射到 Spring 容器。

> 本专题是设计知识补充，不改变 Spring Boot 01·01 的 7 项正式测试，也不单独生成复习题。理解后回到正式章节继续检查点。

## 1. 先区分“思想、原则、模式和机制”

| 概念 | 本专题中的定位 | 回答的问题 |
| --- | --- | --- |
| IoC | 宽泛的设计思想 | 原本由业务对象掌握的创建或流程控制权，交给谁？ |
| DIP | SOLID 中的一条设计原则 | 高层策略与低层细节在源码中应该依赖谁？ |
| DI | 实现 IoC 的常用模式或技术 | 一个对象所需的依赖怎样从外部交给它？ |
| Spring `ApplicationContext` | 框架机制 | 怎样发现、创建、保存并连接大量 Bean？ |

设计模式是可复用的协作方案，不等于某个固定类名；设计原则是判断结构好坏的方向，也不是要求所有代码必须长成同一种形状；框架则把一部分常见方案做成了可以运行的基础设施。

## 2. 起点：服务自己创建具体依赖

假设欢迎业务需要发送通知：

```java
public final class NotificationService {
    private final ConsoleNotificationSender sender =
            new ConsoleNotificationSender();

    public void welcome(String username) {
        sender.send(username, "Welcome to Spring learning");
    }
}
```

它现在可以工作，但 `NotificationService` 同时做了两件事：

1. 决定欢迎消息的业务规则；
2. 决定通知发送器必须是 `ConsoleNotificationSender`，并负责创建它。

当发送方式改成邮件、短信或测试记录器时，高层业务类也必须修改。问题不在 `new` 这个关键字本身，而在于变化频率和职责不同的决策被绑在了一起。

源码依赖方向是：

```text
高层欢迎业务
    ↓ 直接依赖并创建
低层控制台发送细节
```

## 3. 依赖倒置：让双方朝抽象靠拢

先声明业务真正需要的能力：

```java
public interface NotificationSender {
    void send(String recipient, String message);
}
```

高层服务依赖这个能力，而不是某一种发送技术：

```java
public final class NotificationService {
    private final NotificationSender sender;

    public NotificationService(NotificationSender sender) {
        this.sender = sender;
    }
}
```

低层实现也朝同一个抽象靠拢：

```java
public final class ConsoleNotificationSender
        implements NotificationSender {

    @Override
    public void send(String recipient, String message) {
        System.out.println("to=" + recipient + ", message=" + message);
    }
}
```

现在源码依赖关系变成：

```text
NotificationService ──依赖──> NotificationSender <──实现── ConsoleNotificationSender
       高层策略                       抽象                    低层细节
```

DIP 的重点不是“项目里必须到处建接口”，而是高层策略不应被不稳定的低层实现细节锁死，二者应围绕稳定的业务抽象协作。

如果一个具体类稳定、没有替换或隔离需要，直接依赖具体类也可能完全合理。为了形式上符合某个原则而给每个类机械创建接口，会增加导航和维护成本，却没有隔离真实变化。

## 4. 依赖注入：从外部交给对象

上面的构造器完成了依赖注入：

```java
new NotificationService(sender)
```

`NotificationService` 不再寻找或创建发送器；调用方在创建它时把依赖传入。这里完全没有 Spring，说明 DI 不是 Spring 专属能力。

常见注入方式有：

| 方式 | 特点 | 本课程选择 |
| --- | --- | --- |
| 构造器注入 | 依赖在对象创建时必须齐全，可配合 `final` | 默认选择 |
| 方法或 setter 注入 | 适合真正可选、创建后允许替换的协作者 | 按需使用 |
| 字段注入 | 源码简短，但依赖隐藏，普通 Java 测试不易构造 | 不作为默认方式 |

构造器注入不会自动让代码松耦合。如果构造器参数仍是一个变化剧烈的具体实现，高层源码依旧直接依赖它；DI 和 DIP 可以协作，但完成其中一个不代表自动完成另一个。

## 5. 控制反转：创建控制权移到组合根

总要有一个地方真正调用构造器：

```java
public static void main(String[] args) {
    NotificationSender sender = new ConsoleNotificationSender();
    NotificationService service = new NotificationService(sender);

    service.welcome("learner");
}
```

这个集中选择实现、创建对象并连接对象图的位置称为组合根（composition root）。业务服务失去对具体依赖创建方式的控制，组合根获得了这部分控制，这就是一种 IoC。

注意：控制没有消失，只是移动了。

```text
之前：NotificationService 决定创建哪种 Sender
之后：main 组合根决定创建哪种 Sender，再注入 Service
```

小程序可以手写组合根。对象数量增加后，还要处理配置、生命周期、作用域、条件选择和循环依赖检查，框架容器开始体现价值。

## 6. Spring 容器怎样接管组合

在 Spring 中可以写：

```java
@Service
public final class ConsoleNotificationSender
        implements NotificationSender {
    // ...
}

@Service
public final class NotificationService {
    private final NotificationSender sender;

    public NotificationService(NotificationSender sender) {
        this.sender = sender;
    }
}
```

启动时，`ApplicationContext` 大致完成：

```text
组件扫描发现两个候选组件
    ↓
创建 ConsoleNotificationSender Bean
    ↓
发现 NotificationService 构造器需要 NotificationSender
    ↓
按类型找到候选 Bean
    ↓
调用构造器并保存组装完成的 NotificationService Bean
```

因此：

- 注解提供组件元数据；
- 构造器暴露对象的必要依赖；
- `ApplicationContext` 充当容器化的组合者；
- 业务方法仍是普通 Java 方法。

当 `NotificationSender` 有两个实现时，容器无法仅凭类型确定该选谁。后续课程会在真正出现多实现需求时学习 `@Primary`、`@Qualifier` 和配置类，不在本章提前堆叠注解。

## 7. 为什么可测试性会改善

可以提供一个只记录调用的实现：

```java
public final class RecordingNotificationSender
        implements NotificationSender {
    private String recipient;
    private String message;

    @Override
    public void send(String recipient, String message) {
        this.recipient = recipient;
        this.message = message;
    }
}
```

测试直接组合：

```java
RecordingNotificationSender sender =
        new RecordingNotificationSender();
NotificationService service = new NotificationService(sender);

service.welcome("learner");

// 断言 sender 记录了正确的接收者和消息
```

这里验证的是业务服务怎样使用依赖，不需要启动 Spring，也不需要真的发邮件。可测试性来自清晰的替换边界和显式依赖，不是因为使用了大量测试框架。

## 8. DI 与 Service Locator 不同

下面的写法让服务主动去全局容器中寻找依赖：

```java
NotificationSender sender =
        applicationContext.getBean(NotificationSender.class);
```

这称为 Service Locator 风格。它把依赖藏在方法内部，调用者只看构造器无法知道对象需要什么，还让业务代码依赖容器 API。

依赖注入的方向相反：业务对象声明自己需要什么，外部负责传入。除框架基础设施或动态查找等特殊场景，本课程不会在业务类中主动调用 `ApplicationContext.getBean(...)`。

## 9. 生命周期和共享状态边界

Spring 中的普通 Bean 默认是单例作用域：同一个容器通常只创建一个实例并被多个请求共享。单例表示容器中的实例数量，不自动表示线程安全。

无状态服务通常容易安全共享：

```java
public void welcome(String username) {
    sender.send(username, "Welcome");
}
```

如果把每次请求的用户名保存在 Bean 的可变字段中，多个请求线程就可能互相覆盖。这一点会复用 Java 并发课程中的共享状态知识。DI 解决对象怎样取得协作者，不解决协作者内部的并发正确性。

## 10. 运行真实示例

本专题的源码位于：

```text
courses/spring/src/main/java/study/spring/design/di/
├─ NotificationSender.java
├─ ConsoleNotificationSender.java
├─ NotificationService.java
└─ DependencyInjectionExample.java
```

在仓库根目录运行：

```bash
npm run spring:compile
npm run spring:example:di
```

预期输出：

```text
to=learner, message=Welcome to Spring learning
```

可以尝试新增一个实现，把消息写入集合而不是控制台。只修改组合根选择的实现，保持 `NotificationService` 不变；这能直观看到变化被隔离在哪一侧。

## 回到 Spring Boot 首章前应能确认

- IoC 描述控制权转移，DI 是完成这种转移的一种具体方式。
- DIP 讨论源码依赖方向；DI 讨论依赖怎样被提供，两者不是同一个概念。
- 构造器注入让必要依赖显式、完整，并方便纯 Java 测试。
- 总要有组合根负责选择实现与创建对象；Spring 容器把这个工作系统化。
- 接口用于隔离真实变化，不应机械地给每个类增加接口。
- Spring 单例 Bean 不自动线程安全；共享可变状态仍需单独设计。
