import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['src/__tests__/**/*.contract.test.ts'],
    env: {
      DATABASE_URL: 'file:./test-integration.db',
      NODE_ENV: 'test',
    },
    globalSetup: ['src/__tests__/setup/global.ts'],
    // Run integration test files sequentially to avoid DB contention on shared SQLite
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**',
        'src/lib/**',
        'src/llm/**',
        'src/routes/**',
      ],
      exclude: ['src/__tests__/**'],
    },
  },
})
