import { useEffect, useState, type FormEvent } from 'react';
import {
  api,
  type Equipment,
  type EquipmentInput,
  type EquipmentType,
  type Maintenance,
} from './api';

const labels: Record<EquipmentType, string> = {
  TRUCK: 'Camión',
  EXCAVATOR: 'Excavadora',
  DRILL: 'Perforadora',
};
const inputClass = 'mt-1 w-full rounded border border-slate-300 px-3 py-2';
const buttonClass =
  'rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';

function EquipmentForm({
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
  const [code, setCode] = useState(equipment?.code ?? '');
  const [type, setType] = useState<EquipmentType>(equipment?.type ?? 'TRUCK');
  const [hours, setHours] = useState(String(equipment?.hourMeter ?? 0));
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const hourMeter = Number(hours);
    if (
      !code.trim() ||
      hours.trim() === '' ||
      !Number.isInteger(hourMeter) ||
      hourMeter < (equipment?.hourMeter ?? 0) ||
      hourMeter > 2147483647
    ) {
      setError(
        'Ingresa un código y un horómetro entero válido que no disminuya.',
      );
      return;
    }
    setError('');
    void onSave({ code: code.trim(), type, hourMeter });
  }
  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="text-xl font-semibold">
        {equipment ? 'Editar equipo' : 'Nuevo equipo'}
      </h2>
      <label className="block">
        Código
        <input
          className={inputClass}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={100}
          required
        />
      </label>
      <label className="block">
        Tipo
        <select
          className={inputClass}
          value={type}
          onChange={(e) => setType(e.target.value as EquipmentType)}
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
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
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button className={buttonClass} disabled={busy}>
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded border px-3 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function App() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<'closed' | 'new' | Equipment>('closed');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{
    equipment: Equipment;
    entries: Maintenance[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .list(controller.signal)
      .then(setEquipment)
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
          setError(
            'No fue posible cargar los equipos. Verifica la conexión e inténtalo de nuevo.',
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function run(action: () => Promise<void>, success?: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (success) setNotice(success);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible completar la operación.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(data: EquipmentInput) {
    await run(async () => {
      const updated =
        form === 'new'
          ? await api.create(data)
          : await api.update((form as Equipment).id, data);
      setEquipment((items) =>
        [...items.filter((item) => item.id !== updated.id), updated].sort(
          (a, b) => a.code.localeCompare(b.code),
        ),
      );
      setForm('closed');
    }, 'Equipo guardado.');
  }

  function maintain(item: Equipment) {
    if (
      !window.confirm(
        `¿Registrar mantenimiento para ${item.code} con ${item.hourMeter} horas?`,
      )
    )
      return;
    void run(async () => {
      await api.maintain(item.id);
      try {
        setEquipment(await api.list());
      } catch {
        throw new Error(
          'El mantenimiento se registró, pero no se pudo actualizar la lista. Recarga la página.',
        );
      }
      setHistory(null);
    }, 'Mantenimiento registrado.');
  }
  function remove(item: Equipment) {
    if (
      !window.confirm(
        `¿Eliminar ${item.code}? El equipo se retirará del listado y su historial se conservará.`,
      )
    )
      return;
    void run(async () => {
      await api.remove(item.id);
      setEquipment((items) => items.filter((entry) => entry.id !== item.id));
      setHistory(null);
    }, 'Equipo eliminado.');
  }
  function showHistory(item: Equipment) {
    void run(async () =>
      setHistory({ equipment: item, entries: await api.history(item.id) }),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
            Gestión de activos
          </p>
          <h1 className="mt-2 text-3xl font-bold">Equipos mineros</h1>
          <p className="mt-2 text-slate-600">
            Consulta tus equipos mineros y sus horas de uso.
          </p>
        </header>
        {error && (
          <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-4 rounded bg-emerald-50 p-3 text-emerald-800"
          >
            {notice}
          </p>
        )}
        {form !== 'closed' && (
          <EquipmentForm
            key={form === 'new' ? 'new' : form.id}
            equipment={form === 'new' ? null : form}
            busy={busy}
            onCancel={() => setForm('closed')}
            onSave={save}
          />
        )}
        <section
          aria-labelledby="equipment-title"
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="equipment-title" className="text-xl font-semibold">
              Equipos registrados
            </h2>
            <button
              className={buttonClass}
              disabled={busy}
              onClick={() => setForm('new')}
            >
              Nuevo equipo
            </button>
          </div>
          {loading ? (
            <p role="status">Cargando equipos…</p>
          ) : loadFailed ? (
            <p>Recarga la página para volver a consultar los equipos.</p>
          ) : equipment.length === 0 ? (
            <p>No hay equipos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    {[
                      'Código',
                      'Tipo',
                      'Horómetro',
                      'Mantenimiento',
                      'Acciones',
                    ].map((column) => (
                      <th
                        key={column}
                        className="border-b border-slate-200 p-3"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-slate-100 p-3">
                        {item.code}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {labels[item.type]}
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        {item.hourMeter} h
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <strong
                          className={
                            item.requiresMaintenance
                              ? 'text-red-700'
                              : 'text-emerald-700'
                          }
                        >
                          {item.requiresMaintenance
                            ? 'Requiere mantenimiento'
                            : 'Al día'}
                        </strong>
                        <div>
                          {item.hoursSinceMaintenance} / {item.intervalHours} h
                        </div>
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <div className="flex min-w-48 flex-wrap gap-2">
                          {[
                            ['Editar', () => setForm(item)],
                            ['Registrar mantenimiento', () => maintain(item)],
                            ['Historial', () => showHistory(item)],
                            ['Eliminar', () => remove(item)],
                          ].map(([label, action]) => (
                            <button
                              key={label as string}
                              type="button"
                              disabled={busy}
                              onClick={action as () => void}
                              aria-label={`${label as string} ${item.code}`}
                              className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {label as string}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {history && (
          <section
            aria-labelledby="history-title"
            className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex justify-between gap-3">
              <h2 id="history-title" className="text-xl font-semibold">
                Historial de {history.equipment.code}
              </h2>
              <button
                onClick={() => setHistory(null)}
                className="rounded border px-3 py-1"
              >
                Cerrar
              </button>
            </div>
            {history.entries.length === 0 ? (
              <p className="mt-4">No hay mantenimientos registrados.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {history.entries.map((entry) => (
                  <li key={entry.id}>
                    {new Date(entry.performedAt).toLocaleString('es')} —{' '}
                    {entry.hourMeter} h
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
