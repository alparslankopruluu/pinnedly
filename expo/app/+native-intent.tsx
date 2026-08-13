import { normalizeInvitePath } from '@/lib/inviteRouting';

export function redirectSystemPath({
  path,
}: { path: string; initial: boolean }) {
  return normalizeInvitePath(path);
}
