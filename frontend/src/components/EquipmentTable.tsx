import {
  ClipboardPlus,
  History,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Equipment, EquipmentType } from '../api';

const labels: Record<EquipmentType, string> = {
  TRUCK: 'Camión',
  EXCAVATOR: 'Excavadora',
  DRILL: 'Perforadora',
};
const cellClass =
  'flex justify-between gap-3 border-b border-slate-100 p-3 md:table-cell';
const date = (value: string | null) =>
  value ? new Date(value).toLocaleString('es') : '—';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <td className={cellClass}>
      <span className="font-semibold text-slate-600 md:hidden">{label}</span>
      <span>{children}</span>
    </td>
  );
}

type Props = {
  equipment: Equipment[];
  busy: boolean;
  onEdit: (item: Equipment) => void;
  onMaintain: (item: Equipment) => void;
  onHistory: (item: Equipment) => void;
  onRemove: (item: Equipment) => void;
};

export function EquipmentTable({
  equipment,
  busy,
  onEdit,
  onMaintain,
  onHistory,
  onRemove,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="block w-full text-left text-sm md:table md:min-w-[1100px] md:border-collapse">
        <thead className="hidden md:table-header-group">
          <tr>
            {[
              'Código',
              'ID',
              'Tipo',
              'Horómetro',
              'Estado',
              'Fecha de registro',
              'Fecha de actualización',
              'Fecha de eliminación',
              'Mantenimiento',
              'Acciones',
            ].map((column) => (
              <th
                scope="col"
                key={column}
                className="border-b border-slate-200 p-3"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block space-y-4 md:table-row-group md:space-y-0">
          {equipment.map((item) => {
            const actions: {
              label: string;
              icon: LucideIcon;
              run: () => void;
            }[] = item.deletedAt
              ? [
                  {
                    label: 'Historial',
                    icon: History,
                    run: () => onHistory(item),
                  },
                ]
              : [
                  { label: 'Editar', icon: Pencil, run: () => onEdit(item) },
                  {
                    label: 'Registrar mantenimiento',
                    icon: ClipboardPlus,
                    run: () => onMaintain(item),
                  },
                  {
                    label: 'Historial',
                    icon: History,
                    run: () => onHistory(item),
                  },
                  {
                    label: 'Eliminar',
                    icon: Trash2,
                    run: () => onRemove(item),
                  },
                ];
            return (
              <tr
                key={item.id}
                className="block overflow-hidden rounded-lg border border-slate-200 md:table-row md:rounded-none md:border-0"
              >
                <Cell label="Código">{item.code}</Cell>
                <Cell label="ID">
                  <span title={item.id}>{item.id.slice(0, 8)}</span>
                </Cell>
                <Cell label="Tipo">{labels[item.type]}</Cell>
                <Cell label="Horómetro">{item.hourMeter} h</Cell>
                <Cell label="Estado">
                  {item.deletedAt ? 'Eliminado' : 'Activo'}
                </Cell>
                <Cell label="Fecha de registro">{date(item.createdAt)}</Cell>
                <Cell label="Fecha de actualización">
                  {date(item.updatedAt)}
                </Cell>
                <Cell label="Fecha de eliminación">{date(item.deletedAt)}</Cell>
                <Cell label="Mantenimiento">
                  <strong
                    className={
                      item.deletedAt
                        ? 'text-slate-500'
                        : item.requiresMaintenance
                          ? 'text-red-700'
                          : 'text-emerald-700'
                    }
                  >
                    {item.deletedAt
                      ? 'No aplica'
                      : item.requiresMaintenance
                        ? 'Requiere mantenimiento'
                        : 'Al día'}
                  </strong>
                  {!item.deletedAt && (
                    <div>
                      {item.hoursSinceMaintenance} / {item.intervalHours} h
                    </div>
                  )}
                </Cell>
                <Cell label="Acciones">
                  <span className="flex flex-wrap gap-2">
                    {actions.map(({ label, icon: Icon, run }) => (
                      <button
                        key={label}
                        type="button"
                        disabled={busy}
                        onClick={run}
                        title={label}
                        aria-label={`${label} ${item.code}`}
                        className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded border border-slate-300 p-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon size={18} aria-hidden="true" />
                      </button>
                    ))}
                  </span>
                </Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
