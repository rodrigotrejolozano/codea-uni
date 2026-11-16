import { describe, expect, it } from 'vitest';
import { equipmentSchema } from './schema';

describe('equipment schema', () => {
  const valid = { code: ' CAM-1 ', type: 'TRUCK', hourMeter: '250' };
  it('trims the code and converts the hour meter', () => {
    expect(equipmentSchema().parse(valid)).toEqual({
      code: 'CAM-1',
      type: 'TRUCK',
      hourMeter: 250,
    });
  });
  it.each(['', ' ', '-1', '1.5', '2147483648'])(
    'rejects invalid hours %s',
    (hourMeter) => {
      expect(equipmentSchema().safeParse({ ...valid, hourMeter }).success).toBe(
        false,
      );
    },
  );
  it('rejects blank and excessively long codes', () => {
    expect(equipmentSchema().safeParse({ ...valid, code: '  ' }).success).toBe(
      false,
    );
    expect(
      equipmentSchema().safeParse({ ...valid, code: 'a'.repeat(101) }).success,
    ).toBe(false);
  });
  it('rejects readings below the current hour meter', () => {
    expect(
      equipmentSchema(250).safeParse({ ...valid, hourMeter: '249' }).success,
    ).toBe(false);
    expect(equipmentSchema(250).safeParse(valid).success).toBe(true);
  });
  it('rejects an unsupported equipment type', () => {
    expect(
      equipmentSchema().safeParse({ ...valid, type: 'OTHER' }).success,
    ).toBe(false);
  });
});
