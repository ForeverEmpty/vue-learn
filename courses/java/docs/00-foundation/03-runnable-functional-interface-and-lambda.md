# Java 00·03：`Runnable`、函数式接口与 lambda

`Runnable` 用来描述一段可以执行的任务：

```java
public interface Runnable {
    void run();
}
```

它只有一个抽象方法，因此属于函数式接口。

## `@FunctionalInterface` 的作用

```java
@FunctionalInterface
public interface Runnable {
    void run();
}
```

`@FunctionalInterface` 是给接口使用的注解，表达两个含义：

1. 设计者明确声明“这个接口就是准备作为函数式接口使用的”。
2. 编译器必须检查它是否仍然只有一个抽象方法。

如果以后误加第二个抽象方法：

```java
@FunctionalInterface
interface Task {
    void run();
    void cancel();
}
```

接口定义本身就会编译失败。这样可以尽早发现修改破坏了 lambda 所依赖的单一方法形状。

这个注解不是让接口“变成”函数式接口的开关。即使不写注解，只要接口事实上只有一个抽象方法，它仍然可以接收 lambda；注解的价值是表达意图并让编译器持续保护这个约定。

接口中的 `default`、`static` 和 `private` 方法已经带有实现，不属于需要实现者完成的抽象方法，因此不会破坏函数式接口：

```java
@FunctionalInterface
interface Task {
    void run();

    default String description() {
        return "task";
    }

    static Task empty() {
        return () -> {};
    }
}
```

## 完整写法

```java
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("执行任务");
    }
};
```

`@Override` 表示这里实现的是接口中声明的 `run()` 方法。

## lambda 写法

函数式接口可以使用 lambda 简写：

```java
Runnable task = () -> {
    System.out.println("执行任务");
};
```

lambda 创建了任务对象，但不会自动执行任务。第一章需要始终区分：

```text
Runnable = 描述做什么
Thread   = 管理由哪条线程执行以及线程状态
```

直接调用 `task.run()` 只是由当前线程执行一个普通方法；是否创建新线程由 `Thread` 的使用方式决定。

## 本章中的 InterruptibleTask

生产者—消费者场景定义了：

```java
@FunctionalInterface
interface InterruptibleTask {
    void run() throws InterruptedException;
}
```

它仍然只有一个抽象方法，所以可以使用 lambda：

```java
InterruptibleTask producerTask = () -> {
    buffer.put(element);
};
```

它与 `Runnable` 的关键区别是自己的抽象方法声明了 `throws InterruptedException`。因此 lambda 内可以直接调用同样会抛出该异常的 `put()` 或 `take()`，再由外层统一处理。

这也解释了为什么上一版 `input.forEach(...)` 迫使代码在 lambda 内捕获异常：`forEach` 接收的是 `Consumer<T>`，其抽象方法 `accept(T)` 没有声明 `InterruptedException`。改用增强 `for` 循环后，代码仍处于 `InterruptibleTask` 的 lambda 中，异常便能自然传播给 `createWorker`。

当前需要记住：

```text
函数式接口                = 只有一个抽象方法的接口
@FunctionalInterface      = 声明意图，并让编译器守住这一约束
lambda                    = 为这个唯一抽象方法提供实现
抽象方法是否声明 throws    = 决定 lambda 能否直接传播对应受检异常
```
