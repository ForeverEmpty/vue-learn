# 00. Java 基础补充

这个目录独立于 Java 并发主课程，用来补充学习过程中实际遇到的语言基础。主课程出现前置知识障碍时，可以暂时进入对应小章；理解后再返回原检查点。

大章节编号 `00` 表示语言基础模块。不同知识点分别存放在独立文档中，不要求开始主课程前一次读完。

## 课程目录

| 小节 | 主题 | 状态 | 与并发课程的联系 |
| --- | --- | --- | --- |
| 01 | [类、对象与静态方法](./01-classes-objects-and-static-methods.md) | 按需学习 | 看懂 `ThreadBasics` 工具类与静态方法。 |
| 02 | [`main` 方法与当前线程](./02-main-method-and-current-thread.md) | 按需学习 | 理解 Java 程序入口本身已经运行在线程中。 |
| 03 | [`Runnable`、函数式接口与 lambda](./03-runnable-functional-interface-and-lambda.md) | 按需学习 | 分开理解“任务是什么”和“由哪个线程执行”。 |
| 04 | [方法引用](./04-method-references.md) | 按需学习 | 看懂测试中的 `taskRuns::incrementAndGet`。 |
| 05 | [受检异常与 `InterruptedException`](./05-checked-exceptions-and-interruption.md) | 按需学习 | 看懂 `join()` 为什么影响方法签名。 |
| 06 | [`AtomicInteger` 入门](./06-atomic-integer-preview.md) | 按需学习 | 看懂工作线程和测试线程之间使用的安全计数器。 |

## 学习方式

1. 正式章节照常推进，不把整个 00 模块设为前置任务。
2. 遇到不熟悉且会妨碍理解的知识点时，直接进入相应小章。
3. 理解最小示例后回到原来的正式章节检查点。
4. 基础知识章不自动创建复习题；需要练习时再主动提出。
