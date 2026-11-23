import { describe, it, expect } from 'vitest';
import { loadEnv } from '../env.js';

describe('Environment Loader', () => {
  it('loads valid default environment without error', () => {
    const env = loadEnv();
    expect(env.PORT).toBeDefined();
    expect(env.GROQ_MODEL).toBe('llama-3.3-70b-versatile');
    expect(env.CORS_ORIGINS).toBeDefined();
  });
});
