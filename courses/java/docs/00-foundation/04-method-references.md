# Java 00·04：方法引用

当 lambda 只负责调用一个已有方法时，可以写成方法引用。

第一章测试中会看到：

```java
AtomicInteger taskRuns = new AtomicInteger();
Runnable task = taskRuns::incrementAndGet;
```

`对象::方法名` 表示任务执行时调用这个对象的方法。在这里，它可以近似展开为：

```java
Runnable task = () -> taskRuns.incrementAndGet();
```

之所以能够赋值给 `Runnable`，是因为 `Runnable.run()` 不接收参数，而这里调用 `incrementAndGet()` 也不需要提供参数。返回的整数会被忽略，因为 `Runnable.run()` 本身没有返回值。

第一章只需要能把方法引用还原成对应的 lambda，不需要掌握方法引用的全部形式。
