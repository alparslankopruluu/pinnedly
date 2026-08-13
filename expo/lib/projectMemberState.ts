export async function removeMemberAfterRequest<T>(
  getMembers: () => T[],
  memberId: string,
  getMemberId: (member: T) => string,
  request: () => Promise<void>
): Promise<T[]> {
  await request();
  return getMembers().filter((member) => getMemberId(member) !== memberId);
}
