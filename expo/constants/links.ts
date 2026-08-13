export const INVITE_WEB_ORIGIN = 'https://pinnedly-48c49.web.app';

export function buildInviteWebUrl(token: string): string {
  return `${INVITE_WEB_ORIGIN}/invite/${encodeURIComponent(token)}`;
}
