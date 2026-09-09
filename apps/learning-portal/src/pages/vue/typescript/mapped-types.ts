import {
  renderTypeLessonPage,
  type TypeLesson,
} from "./type-lesson";

const lesson: TypeLesson = {
  lessonNumber: "08",
  title: "映射类型、修饰符与工具类型",
  lead:
    "在类型层面逐个遍历对象属性，让一条转换规则自动应用到所有键，并理解常用工具类型背后的结构。",
  concepts: [
    "[Key in keyof T] 遍历类型键，不会在运行时执行 JavaScript 循环。",
    "T[Key] 读取当前属性类型，外层规则决定怎样转换它。",
    "readonly、?、-readonly 与 -? 控制映射结果的属性修饰符。",
  ],
  examples: [
    {
      label: "ToRefs",
      title: "对每个属性应用 ToRef",
      code: `type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>
}

type Source = {
  name: string
  count: Ref<number>
}`,
      explanation:
        "name 会变为 Ref<string>；count 已经是 Ref<number>，由 ToRef 条件类型决定保持原类型。",
    },
    {
      label: "修饰符",
      title: "添加和移除属性修饰符",
      code: `type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key]
}

type Complete<T> = {
  [Key in keyof T]-?: T[Key]
}`,
      explanation:
        "-readonly 移除只读限制，-? 移除可选标记。没有减号时，readonly 和 ? 表示添加相应修饰符。",
    },
    {
      label: "键重映射",
      title: "使用 as 生成新的属性名",
      code: `type Getters<T> = {
  [Key in keyof T as
    \`get\${Capitalize<string & Key>}\`]:
      () => T[Key]
}`,
      explanation:
        "Key 仍遍历源对象键，但 as 会生成 getName、getAge 等新键；模板字面量类型只发生在编译阶段。",
    },
  ],
  documentPath: "courses/vue/docs/00-js-ts/08-mapped-types-and-utilities.md",
};

export function renderMappedTypesPage(container: HTMLElement): void {
  renderTypeLessonPage(container, lesson);
}

