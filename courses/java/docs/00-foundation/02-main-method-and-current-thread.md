# Java 00·02：`main` 方法与当前线程

普通 Java 程序从约定好的 `main` 方法开始执行：

```java
public static void main(String[] args) throws InterruptedException {
}
```

- `public` 让 JVM 能访问这个入口。
- `static` 表示启动程序时不需要先创建入口类对象。
- `void` 表示该方法没有返回值。
- `String[] args` 保存命令行参数，本章暂时不用。
- `throws InterruptedException` 表示该方法可能把这种异常继续向外传递。

## `main` 已经运行在线程中

进入 `main` 方法时，JVM 已经提供了一条执行路线，通常称为 `main` 线程：

```java
Thread currentThread = Thread.currentThread();
String threadName = currentThread.getName();
System.out.println(threadName);
```

第一章不是从“零个线程”变成“一个线程”，而是从已有的 `main` 线程中再创建工作线程。
