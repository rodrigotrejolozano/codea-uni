import { EquipmentType } from '../generated/prisma/enums.js';

export const MAINTENANCE_INTERVALS: Record<EquipmentType, number> = {
  TRUCK: 250,
  EXCAVATOR: 500,
  DRILL: 300,
};

export function maintenanceStatus(
  type: EquipmentType,
  hourMeter: number,
  lastHourMeter = 0,
) {
  const intervalHours = MAINTENANCE_INTERVALS[type];
  const hoursSinceMaintenance = hourMeter - lastHourMeter;
  return {
    intervalHours,
    hoursSinceMaintenance,
    requiresMaintenance: hoursSinceMaintenance >= intervalHours,
  };
}
