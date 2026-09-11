# Java 00·03：`Runnable`、函数式接口与 lambda

`Runnable` 用来描述一段可以执行的任务：

```java
public interface Runnable {
    void run();
}
```

它只有一个抽象方法，因此属于函数式接口。

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
