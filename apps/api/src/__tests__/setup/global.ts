import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

// global.ts is at src/__tests__/setup/global.ts
// 4 levels up: setup/ -> __tests__/ -> src/ -> api/
const apiDir = path.resolve(fileURLToPath(import.meta.url), '../../../../')

const dbPath = path.join(apiDir, 'test-integration.db')
const dbWalPath = path.join(apiDir, 'test-integration.db-wal')
const dbShmPath = path.join(apiDir, 'test-integration.db-shm')

export async function setup() {
  // Remove stale test database files
  for (const file of [dbPath, dbWalPath, dbShmPath]) {
    if (existsSync(file)) {
      unlinkSync(file)
    }
  }

  // Push schema to fresh SQLite test database
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./test-integration.db',
    },
    cwd: apiDir,
    stdio: 'pipe',
  })
}
