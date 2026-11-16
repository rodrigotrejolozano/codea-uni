import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Equipment, EquipmentInput, EquipmentType } from '../api';
import {
  equipmentSchema,
  type EquipmentFormValues,
  type ValidEquipmentValues,
} from '../equipment/schema';

const labels: Record<EquipmentType, string> = {
  TRUCK: 'Camión',
  EXCAVATOR: 'Excavadora',
  DRILL: 'Perforadora',
};
const inputClass = 'mt-1 w-full rounded border border-slate-300 px-3 py-2';

export function EquipmentForm({
  equipment,
  busy,
  onCancel,
  onSave,
}: {
  equipment: Equipment | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (value: EquipmentInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EquipmentFormValues, unknown, ValidEquipmentValues>({
    resolver: zodResolver(equipmentSchema(equipment?.hourMeter ?? 0)),
    defaultValues: {
      code: equipment?.code ?? '',
      type: equipment?.type ?? 'TRUCK',
      hourMeter: String(equipment?.hourMeter ?? 0),
    },
  });
  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSave)}
      className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-semibold">
        {equipment ? 'Editar equipo' : 'Nuevo equipo'}
      </h2>
      <label className="block">
        Código
        <input
          className={inputClass}
          aria-invalid={!!errors.code}
          aria-describedby={errors.code ? 'code-error' : undefined}
          {...register('code')}
        />
      </label>
      {errors.code && (
        <p id="code-error" role="alert" className="text-red-700">
          {errors.code.message}
        </p>
      )}
      <label className="block">
        Tipo
        <select
          className={inputClass}
          aria-invalid={!!errors.type}
          {...register('type')}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {errors.type && (
        <p role="alert" className="text-red-700">
          {errors.type.message}
        </p>
      )}
      {equipment && (
        <p className="text-sm text-slate-600">
          Cambiar el tipo recalcula el intervalo sin reiniciar el ciclo.
        </p>
      )}
      <label className="block">
        Horómetro (horas)
        <input
          className={inputClass}
          type="number"
          min={equipment?.hourMeter ?? 0}
          max={2147483647}
          step="1"
          aria-invalid={!!errors.hourMeter}
          aria-describedby={errors.hourMeter ? 'hour-error' : undefined}
          {...register('hourMeter')}
        />
      </label>
      {errors.hourMeter && (
        <p id="hour-error" role="alert" className="text-red-700">
          {errors.hourMeter.message}
        </p>
      )}
      <div className="flex gap-3">
        <button
          className="cursor-pointer rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={busy}
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="cursor-pointer rounded border px-3 py-2 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
