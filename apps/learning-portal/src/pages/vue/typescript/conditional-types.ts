import {
  renderTypeLessonPage,
  type TypeLesson,
} from "./type-lesson";

const lesson: TypeLesson = {
  lessonNumber: "09",
  title: "条件类型、infer、类型守卫与重载",
  lead:
    "根据输入类型选择结果、从结构中提取内部类型，再把这些规则用于 isRef 和 computed 这样的真实 API。",
  concepts: [
    "T extends U ? X : Y 在类型层面选择结果，裸类型参数会对联合成员分发。",
    "infer 给成功匹配的结构片段临时命名，例如提取 Ref 内部值。",
    "类型谓词帮助分支收窄，函数重载描述不同输入与返回类型的对应关系。",
  ],
  examples: [
    {
      label: "条件类型",
      title: "ToRef 根据输入选择包装或复用",
      code: `type ToRef<T> =
  T extends Ref<unknown>
    ? T
    : Ref<T>

type A = ToRef<number>
type B = ToRef<Ref<number>>`,
      explanation:
        "A 是 Ref<number>；B 保留原来的 Ref<number>。条件类型让静态返回类型与运行时 isRef 分支保持一致。",
    },
    {
      label: "infer",
      title: "提取 Ref 外壳中的 Value",
      code: `type UnwrapRef<T> =
  T extends Ref<infer Value>
    ? Value
    : T

type Result = UnwrapRef<Ref<string>>`,
      explanation:
        "T 成功匹配 Ref<某类型> 后，infer 把内部类型命名为 Value，因此 Result 是 string。",
    },
    {
      label: "函数重载",
      title: "computed 的输入决定 value 是否可写",
      code: `function computed<T>(
  getter: () => T,
): ComputedRef<T>

function computed<T>(
  options: WritableComputedOptions<T>,
): WritableComputedRef<T>`,
      explanation:
        "调用者传函数时得到 readonly value，传 get/set 对象时得到可写 value；统一实现签名则负责兼容这两种输入。",
    },
  ],
  documentPath: "courses/vue/docs/00-js-ts/09-conditional-infer-overloads.md",
};

export function renderConditionalTypesPage(container: HTMLElement): void {
  renderTypeLessonPage(container, lesson);
}

