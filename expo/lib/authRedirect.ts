export function getSafePostAuthRoute(redirect: string | string[] | undefined): string {
  const value = Array.isArray(redirect) ? redirect[0] : redirect;
  if (value && /^\/invite\/[A-Za-z0-9_-]+$/.test(value)) return value;
  return '/(tabs)';
}
