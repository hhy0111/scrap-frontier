import type { RaidResolution } from '../../types/raid';

export const getRaidThreatGain = (result: RaidResolution['result']): number => {
  switch (result) {
    case 'victory':
      return 20;
    case 'retreat':
      return 8;
    case 'defeat':
      return 4;
    default:
      return 0;
  }
};
