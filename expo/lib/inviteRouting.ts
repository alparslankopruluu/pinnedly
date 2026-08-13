export function normalizeInvitePath(path: string): string {
  if (path.includes('/invite/')) {
    const token = path.split('/invite/')[1]?.split(/[?#]/)[0];
    if (token) return `/invite/${token}`;
  }
  return '/';
}
