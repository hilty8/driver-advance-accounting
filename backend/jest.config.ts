import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  testMatch: ['<rootDir>/tests/unit/**/*.spec.ts', '<rootDir>/src/__tests__/unit/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.unit.ts']
};

export default config;
