const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'LEGACY_API_URL',
  'LEGACY_API_KEY',
  'LAB_API_URL',
  'LAB_API_KEY',
  'RIS_PACS_API_URL',
  'RIS_PACS_API_KEY'
] as const;

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateBootstrapConfig(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key] || env[key]?.trim().length === 0);

  if (missing.length > 0) {
    throw new Error(
      `Invalid configuration: missing required environment variables: ${missing.join(', ')}`
    );
  }

  const urlVars = REQUIRED_ENV_VARS.filter((key) => key.endsWith('_API_URL'));
  const invalidUrls = urlVars.filter((key) => !isValidHttpUrl(env[key] ?? ''));

  if (invalidUrls.length > 0) {
    throw new Error(
      `Invalid configuration: expected valid http(s) URLs for: ${invalidUrls.join(', ')}`
    );
  }
}

export { REQUIRED_ENV_VARS };
