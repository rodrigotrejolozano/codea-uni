import type { Prisma } from '../generated/prisma/client.js';
import { maintenanceStatus } from './maintenance-rules.js';

export const includeLatest = {
  maintenances: {
    orderBy: [{ hourMeter: 'desc' as const }, { performedAt: 'desc' as const }],
    take: 1,
  },
};
type WithLatest = Prisma.EquipmentGetPayload<{ include: typeof includeLatest }>;

export function present({ maintenances, ...equipment }: WithLatest) {
  return {
    ...equipment,
    ...maintenanceStatus(
      equipment.type,
      equipment.hourMeter,
      maintenances[0]?.hourMeter ?? 0,
    ),
  };
}
