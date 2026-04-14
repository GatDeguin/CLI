import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REQUIRED_ENV_VARS, validateBootstrapConfig } from './env.validation';

function buildValidEnv(): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/clinicadb?schema=public',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    LEGACY_API_URL: 'http://localhost:4010',
    LEGACY_API_KEY: 'legacy-key',
    LAB_API_URL: 'http://localhost:4012',
    LAB_API_KEY: 'lab-key',
    RIS_PACS_API_URL: 'http://localhost:4013',
    RIS_PACS_API_KEY: 'ris-key'
  };
}

test('validateBootstrapConfig accepts a complete and valid environment', () => {
  assert.doesNotThrow(() => validateBootstrapConfig(buildValidEnv()));
});

test('validateBootstrapConfig fails when *_API_URL variables are missing', () => {
  const env = buildValidEnv();
  delete env.LAB_API_URL;

  assert.throws(() => validateBootstrapConfig(env), {
    message: /missing required environment variables: LAB_API_URL/
  });
});

test('validateBootstrapConfig fails when legacy *_API_BASE_URL naming is used', () => {
  const env = buildValidEnv();
  delete env.RIS_PACS_API_URL;
  env.RIS_PACS_API_BASE_URL = 'http://localhost:4013';

  assert.throws(() => validateBootstrapConfig(env), {
    message: /missing required environment variables: RIS_PACS_API_URL/
  });
});

test('validateBootstrapConfig fails when a *_API_URL value is not a valid HTTP URL', () => {
  const env = buildValidEnv();
  env.LEGACY_API_URL = 'legacy.local';

  assert.throws(() => validateBootstrapConfig(env), {
    message: /expected valid http\(s\) URLs for: LEGACY_API_URL/
  });
});

test('REQUIRED_ENV_VARS keeps canonical *_API_URL naming for integrations', () => {
  const integrationUrlVars = REQUIRED_ENV_VARS.filter((key) => key.endsWith('_API_URL'));

  assert.deepEqual(integrationUrlVars.sort(), ['LAB_API_URL', 'LEGACY_API_URL', 'RIS_PACS_API_URL']);
});
