import { z } from 'zod';

export function equipmentSchema(minimumHours = 0) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, 'El código es obligatorio.')
      .max(100, 'El código no puede superar 100 caracteres.'),
    type: z.enum(['TRUCK', 'EXCAVATOR', 'DRILL'], {
      error: 'Selecciona un tipo válido.',
    }),
    hourMeter: z
      .string()
      .trim()
      .min(1, 'El horómetro es obligatorio.')
      .refine(
        (value) => /^\d+$/.test(value),
        'Ingresa un número entero no negativo.',
      )
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .min(
            minimumHours,
            `El horómetro no puede ser menor que ${minimumHours}.`,
          )
          .max(2147483647, 'El horómetro supera el máximo permitido.'),
      ),
  });
}

export type EquipmentFormValues = z.input<ReturnType<typeof equipmentSchema>>;
export type ValidEquipmentValues = z.output<ReturnType<typeof equipmentSchema>>;
