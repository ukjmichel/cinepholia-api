export function envToBool(
  value: string | undefined | null,
  defaultValue = false
): boolean {
  if (typeof value === 'undefined' || value === null) return defaultValue;
  const trueValues = ['true', '1', 'yes', 'on'];
  return trueValues.includes(value.toLowerCase());
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function requireEnvByEnv(name: string, env: string): string {
  // Check env-specific var first (e.g. MYSQL_DATABASE_TEST), fallback to base var
  const envSpecificName = `${name}_${env.toUpperCase()}`;
  return process.env[envSpecificName] || requireEnv(name);
}
