import { defineConfig } from 'vitest/config';

// apps/api o'z konfiguratsiyasi bilan alohida ishga tushadi (pnpm --filter @iquest/api test)
export default defineConfig({ test: { exclude: ['**/node_modules/**', 'apps/api/**'] } });
