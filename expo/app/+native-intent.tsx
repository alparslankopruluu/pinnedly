export function redirectSystemPath({
  path,
}: { path: string; initial: boolean }) {
  if (path.includes('/invite/')) {
    const token = path.split('/invite/')[1]?.split(/[?#]/)[0];
    if (token) {
      return `/invite/${token}`;
    }
  }

  return '/';
}