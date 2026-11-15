import { describe, expect, it } from 'vitest';
import { EquipmentType } from '../generated/prisma/enums.js';
import { maintenanceStatus } from './maintenance-rules.js';

describe('maintenanceStatus', () => {
  it.each([
    [EquipmentType.TRUCK, 250],
    [EquipmentType.EXCAVATOR, 500],
    [EquipmentType.DRILL, 300],
  ])('uses the %s interval', (type, interval) => {
    expect(maintenanceStatus(type, interval - 1).requiresMaintenance).toBe(
      false,
    );
    expect(maintenanceStatus(type, interval).requiresMaintenance).toBe(true);
    expect(maintenanceStatus(type, interval + 1).requiresMaintenance).toBe(
      true,
    );
  });
  it('starts the next cycle at the last maintenance reading', () => {
    expect(
      maintenanceStatus(EquipmentType.TRUCK, 250, 250).requiresMaintenance,
    ).toBe(false);
    expect(
      maintenanceStatus(EquipmentType.TRUCK, 500, 250).requiresMaintenance,
    ).toBe(true);
  });
  it('recalculates when the type changes', () => {
    expect(
      maintenanceStatus(EquipmentType.EXCAVATOR, 300).requiresMaintenance,
    ).toBe(false);
    expect(
      maintenanceStatus(EquipmentType.TRUCK, 300).requiresMaintenance,
    ).toBe(true);
  });
});
