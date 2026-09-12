# Java 并发 01·03：wait、notifyAll 与有界缓冲区

第二章使用 `synchronized` 阻止多个线程同时修改共享状态。本章继续追问：如果线程已经拿到锁，却发现当前条件不允许它继续工作，怎样在不占着锁的情况下等待其他线程改变状态？

我们会逐步实现一个泛型有界缓冲区，并把它组合成真正的生产者—消费者传递场景。

> 当前进度：已完成。7 项章节测试和全部 Java 测试均已通过，6 道复习题已完成修正复核；本章还按需补充了无复习题的 00·03、00·07 和 00·08 基础小章。

## 本章依赖关系

```text
01·01 Thread、start、join
        ↓
01·02 共享状态、synchronized、对象内置锁
        ↓
01·03 条件不满足时 wait，状态改变后 notifyAll
        ↓
有容量限制的生产者—消费者缓冲区
```

本章还会使用 `BoundedBuffer<T>`、`Deque<T>` 和 `List<T>`。这些语言与集合基础已单独放入无复习题的 [00·07：泛型与 Deque、List](../00-foundation/07-generics-and-deque.md)。

## 本章目标

- 维护 `0 <= size <= capacity` 的缓冲区不变量。
- 理解对象内置锁、入口等待和对象等待集之间的关系。
- 知道 `wait()` 会释放当前对象的锁，`sleep()` 不会。
- 使用 `while` 重新检查等待条件，而不是只判断一次。
- 在共享状态改变后调用 `notifyAll()`。
- 让空缓冲区阻塞消费者，让满缓冲区阻塞生产者。
- 正确把等待期间的 `InterruptedException` 交给调用者。
- 组合泛型缓冲区、生产者、消费者、`start()` 和 `join()` 完成一条传递流水线。

## 有界缓冲区维护什么状态

```java
public final class BoundedBuffer<T> {
    private final int capacity;
    private final Deque<T> elements = new ArrayDeque<>();
}
```

`capacity` 创建后不再改变，`elements.size()` 会随着生产和消费变化。任何时刻都必须满足：

```text
0 <= elements.size() <= capacity
```

两个公开操作分别受不同条件约束：

| 操作 | 可以继续的条件 | 条件不满足时 |
| --- | --- | --- |
| `put(element)` | `size < capacity` | 缓冲区已满，等待消费者取走元素 |
| `take()` | `size > 0` | 缓冲区为空，等待生产者放入元素 |

条件检查、队列修改和通知都必须由同一个缓冲区对象的锁保护，否则“检查条件”和“执行操作”之间仍可能被其他线程插入。

## synchronized 只解决了互斥

假设容量为 `1`，生产者进入同步方法后发现缓冲区已满。如果它继续占着锁反复检查：

```java
while (elements.size() == capacity) {
    // 一直检查
}
```

消费者无法进入同一个对象的同步方法，也就无法取走元素。生产者等待消费者，但又不释放消费者需要的锁，程序不会取得进展。

因此条件等待必须同时完成两件事：

```text
当前线程暂停
+
释放当前对象的锁，让改变条件的线程能够进入
```

## wait 的完整动作

在持有对象内置锁时调用：

```java
wait();
```

这里省略了接收者，等价于 `this.wait()`。它的过程不是简单的“暂停”：

```text
线程确认条件不满足
→ 调用 this.wait()
→ 原子地释放 this 的锁，并进入 this 的等待集
→ 被 notifyAll、interrupt 或其他允许的原因唤醒
→ 重新竞争 this 的锁
→ 获得锁后，wait 才真正返回
→ 再次检查条件
```

`wait()` 必须在当前线程已经持有该对象锁时调用，否则会抛出 `IllegalMonitorStateException`。把 `put`、`take` 声明为实例同步方法，可以让其中的 `wait()` 使用当前缓冲区的锁和等待集。

## wait 与 sleep 不能互换

`Thread.sleep(...)` 只让当前线程暂停一段时间，不会释放已经持有的对象锁。它既不知道等待的业务条件，也要求程序猜测应该睡多久。

`wait()` 服务于对象上的条件协作：暂停时释放对象锁，等其他线程改变共享状态并发出通知。二者解决的问题不同。

## 为什么必须使用 while

等待空缓冲区出现元素时要写：

```java
while (elements.isEmpty()) {
    wait();
}
```

不能只写 `if`：

```java
if (elements.isEmpty()) {
    wait();
}
```

一个线程被唤醒不代表条件现在必然满足：

- `notifyAll()` 会同时唤醒等待集中的多个线程，但它们之后要逐个重新竞争锁。
- 先获得锁的消费者可能已经取走唯一的元素。
- Java 允许线程在没有对应通知的情况下从等待中返回，称为虚假唤醒。

因此正确协议始终是：

```text
while 条件不满足
    wait
获得锁后重新检查
条件真正满足才执行队列操作
```

## 状态改变后再通知

生产者成功放入元素后，空条件可能已经解除：

```java
elements.addLast(element);
notifyAll();
```

消费者成功取出元素后，满条件可能已经解除：

```java
T element = elements.removeFirst();
notifyAll();
return element;
```

要先修改共享状态，再发出通知。被唤醒的线程获得锁并重新检查时，才能看到新的条件。

`notifyAll()` 只把等待线程变成有资格重新竞争锁的状态，不会让当前线程立刻交出锁。当前同步方法退出后，其他线程才可能获得这把锁。

## 为什么本章使用 notifyAll

同一个缓冲区对象的等待集中可能同时存在：

- 等待“非空”的消费者；
- 等待“未满”的生产者。

`notify()` 只选择其中一个等待线程，可能唤醒条件仍不满足的角色。`notifyAll()` 让所有等待线程重新竞争锁，再由每个线程自己的 `while` 判断能否继续。

这是一种更容易保证正确性的监视器协议。后续学习 `Condition` 时，可以为“非空”和“未满”建立不同等待队列，进行更精确的通知。

## 中断怎样穿过缓冲区

`wait()` 可能抛出 `InterruptedException`，因此：

```java
public synchronized T take() throws InterruptedException
```

本章不在缓冲区内部吞掉中断，也不把它转换成普通返回值。`put` 和 `take` 直接把异常交给调用者，让更上层的线程任务决定是退出、重试还是恢复中断标记。

## 本章源码与测试

```text
courses/java/src/main/java/study/concurrency/
├─ BoundedBuffer.java
└─ ProducerConsumerScenario.java

courses/java/src/test/java/study/concurrency/
└─ BoundedBufferTest.java
```

章节测试包含 7 项行为：

1. 校验并保存容量。
2. 单线程 FIFO 与大小变化。
3. 空缓冲区阻塞消费者并在生产后唤醒。
4. 满缓冲区阻塞生产者并在消费后唤醒。
5. 两个生产者和两个消费者传递全部元素。
6. 等待中的消费者响应中断。
7. 综合流水线按顺序传递一组消息。

## 检查点一：完成必要的 00 基础补充

先阅读 [00·07：泛型与 Deque、List](../00-foundation/07-generics-and-deque.md)。本节没有复习题，也不要求背诵集合 API；只需能看懂：

```text
BoundedBuffer<T> 让 put 和 take 使用同一种元素类型
Deque 的 addLast/removeFirst 形成 FIFO
List 表示综合场景中的有序输入和输出
```

阅读后回到本章，运行起点：

```bash
npm run java:compile
npm run java:test:chapter-03
```

预期为编译成功、`0 passed, 7 failed`。这只是尚未实现的起点，不需要修复全部测试。

## 检查点二：建立容量不变量

只实现 `BoundedBuffer` 构造函数：

- `capacity <= 0` 时抛出 `IllegalArgumentException`。
- 合法容量保存到字段中。
- 不修改 `put` 和 `take`。

完成后只应先通过“构造函数校验并保存容量”。这一阶段建立的是缓冲区永久不变的配置，还没有实现元素传递。

## 检查点三：先完成单线程 FIFO

暂时不等待，在两个方法中完成最基本的队列操作：

```text
put  → 把 element 添加到队尾
take → 从队头移除并返回元素
```

此时 FIFO 测试应通过，但空缓冲区的消费者会过早失败，满缓冲区的生产者也不会等待。这个中间实现故意让基础数据结构行为先于线程协作成立。

## 检查点四：让消费者等待“非空”

在 `take()` 中加入监视器条件循环：

```text
while 队列为空
    wait
```

生产者成功放入元素后通知所有等待线程。完成后，消费者应能在空缓冲区等待，并在生产后继续；等待期间被中断时，`InterruptedException` 也应正常交给调用者。

不要使用 `sleep()`，不要把 `while` 改成 `if`，也不要捕获并忽略中断。

## 检查点五：让生产者等待“未满”

在 `put()` 中加入另一个条件循环：

```text
while 当前大小等于容量
    wait
```

消费者成功取出元素后调用 `notifyAll()`。至此 `put` 与 `take` 形成对称协议：

```text
put：等未满 → 放入 → 通知状态改变
take：等非空 → 取出 → 通知状态改变
```

完成后，前 6 项缓冲区测试都应通过，包括容量为 `3` 时的多生产者、多消费者传递。

## 检查点六：组合生产者—消费者流水线

最后实现 `ProducerConsumerScenario.transfer`，把前三章知识组合起来：

1. 创建指定容量的 `BoundedBuffer<T>`。
2. 创建只由消费者写入的结果 `List<T>`。
3. 使用已经提供的 `createWorker` 创建生产者和消费者。
4. 生产者按输入顺序逐项 `put`。
5. 消费者按输入数量逐项 `take` 并加入结果。
6. 先启动两个线程，再分别 `join`。
7. 检查 `workerFailure`；工作线程失败时不能静默返回部分结果，并应把原异常保存为 `IllegalStateException` 的 cause。
8. 成功时返回 `List.copyOf(result)`，避免调用者继续修改内部结果列表。

这里会重新使用第一章的 `start()`、`join()`，第二章的共享对象与同步，并把本章的条件等待用于容量为 `2`、输入数量为 `5` 的真实传递。

完成后运行：

```bash
npm run java:test:chapter-03
npm run java:test
```

章节结果应为 `7 passed, 0 failed`，完整测试还必须保留前两章的全部通过结果。

## 本章完成标准

- 能解释 `wait()` 为什么必须释放对象锁。
- 能追踪等待线程从等待集、被通知到重新获得锁的过程。
- 条件等待使用 `while`，状态改变后使用 `notifyAll()`。
- 缓冲区始终维护大小上下界并保持 FIFO。
- 空时阻塞消费者、满时阻塞生产者，中断能够向上传递。
- 综合场景正确组合生产者、消费者、`start()` 和 `join()`。
- 第三章测试达到 `7 passed, 0 failed`，完整 Java 测试全部通过。
- 完成 [第三章复习题](../../review_questions/01-concurrency/03-wait-notify-and-bounded-buffer.md)。
