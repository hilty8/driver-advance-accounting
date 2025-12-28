export type AdvanceStatusUpdate = 'settling' | 'settled';

export const determineAdvanceStatusUpdate = (
  advanceBalance: bigint,
  collection: bigint
): AdvanceStatusUpdate | null => {
  if (advanceBalance === 0n) return 'settled';
  if (collection > 0n) return 'settling';
  return null;
};
