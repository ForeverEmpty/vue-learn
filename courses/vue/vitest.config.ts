import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['courses/vue/packages/**/__tests__/**/*.test.ts'],
  },
})
