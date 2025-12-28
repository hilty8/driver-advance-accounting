import type { Config } from 'jest';

const config: Config = {
  testMatch: ['<rootDir>/tests/integration/**/*.spec.ts', '<rootDir>/tests/contracts/**/*.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
  testTimeout: 20000
};

export default config;
