import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

// Manually parse .env.local if it exists
try {
  const envPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = val;
        }
      }
    });
  }
} catch (e) {
  console.warn('Could not load .env.local manually:', e);
}

export default defineConfig({
  test: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
