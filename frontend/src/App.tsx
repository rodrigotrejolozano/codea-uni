import { useState } from 'react';
import type { Equipment, EquipmentInput, EquipmentType } from './api';
import { EquipmentForm } from './components/EquipmentForm';
import {
  useEquipment,
  useEquipmentMutations,
  useHistory,
} from './equipment/queries';

const labels: Record<EquipmentType, string> = {
  TRUCK: 'Camión',
  EXCAVATOR: 'Excavadora',
  DRILL: 'Perforadora',
};
const buttonClass =
  'cursor-pointer rounded bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50';

function App() {
  const [page, setPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const equipmentQuery = useEquipment(page);
  const mutations = useEquipmentMutations();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<'closed' | 'new' | Equipment>('closed');
  const [historyEquipment, setHistoryEquipment] = useState<Equipment | null>(
    null,
  );
  const history = useHistory(historyEquipment?.id ?? null, historyPage);
  const [busy, setBusy] = useState(false);
  const equipment = equipmentQuery.data?.data ?? [];
  const loading = equipmentQuery.isPending;
  const loadFailed = equipmentQuery.isError && !equipmentQuery.data;

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

  async function refreshAfterSave(message: string, id?: string) {
    try {
      await mutations.refresh(page, id);
    } catch {
      throw new Error(
        `${message}, pero no se pudo actualizar la lista. Recarga la página.`,
      );
    }
  }

  async function save(data: EquipmentInput) {
    if (form === 'closed') return;
    await run(async () => {
      if (form === 'new') await mutations.create.mutateAsync(data);
      else await mutations.update.mutateAsync({ id: form.id, data });
      setForm('closed');
      await refreshAfterSave('El equipo se guardó');
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
      await mutations.maintain.mutateAsync(item.id);
      setHistoryEquipment(null);
      await refreshAfterSave('El mantenimiento se registró', item.id);
    }, 'Mantenimiento registrado.');
  }
  function remove(item: Equipment) {
    if (
      !window.confirm(
        `¿Eliminar ${item.code}? Se marcará como eliminado y conservará su historial.`,
      )
    )
      return;
    void run(async () => {
      await mutations.remove.mutateAsync(item.id);
      setHistoryEquipment(null);
      await refreshAfterSave('El equipo se eliminó', item.id);
    }, 'Equipo eliminado.');
  }
  function showHistory(item: Equipment) {
    setError('');
    setHistoryPage(1);
    setHistoryEquipment(item);
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
        <details className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold">
            ¿Cómo funcionan los mantenimientos?
          </summary>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>
              Intervalos: camión 250 h, excavadora 500 h y perforadora 300 h.
            </p>
            <p>
              El horómetro refleja las horas totales y no puede disminuir. Sin
              historial, el ciclo se calcula desde 0.
            </p>
            <p>
              Registrar un mantenimiento inicia un nuevo ciclo desde la lectura
              actual sin poner el horómetro en cero. Cambiar el tipo recalcula
              el intervalo sin reiniciar el ciclo.
            </p>
            <p>
              Un equipo eliminado conserva su historial y su código puede usarse
              en otro equipo activo.
            </p>
          </div>
        </details>
        {(error ||
          (loadFailed &&
            'No fue posible cargar los equipos. Verifica la conexión e inténtalo de nuevo.')) && (
          <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">
            {error ||
              'No fue posible cargar los equipos. Verifica la conexión e inténtalo de nuevo.'}
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
                      'Estado',
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
                        {item.deletedAt ? 'Eliminado' : 'Activo'}
                        <div className="text-xs text-slate-500">
                          Creado:{' '}
                          {new Date(item.createdAt).toLocaleDateString('es')} ·
                          ID: {item.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 p-3">
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
                        <div>
                          {!item.deletedAt &&
                            `${item.hoursSinceMaintenance} / ${item.intervalHours} h`}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 p-3">
                        <div className="flex min-w-48 flex-wrap gap-2">
                          {(item.deletedAt
                            ? [['Historial', () => showHistory(item)]]
                            : [
                                ['Editar', () => setForm(item)],
                                [
                                  'Registrar mantenimiento',
                                  () => maintain(item),
                                ],
                                ['Historial', () => showHistory(item)],
                                ['Eliminar', () => remove(item)],
                              ]
                          ).map(([label, action]) => (
                            <button
                              key={label as string}
                              type="button"
                              disabled={busy}
                              onClick={action as () => void}
                              aria-label={`${label as string} ${item.code}`}
                              className="cursor-pointer rounded border border-slate-300 px-2 py-1 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          {equipmentQuery.data && equipmentQuery.data.totalPages > 1 && (
            <nav
              aria-label="Paginación de equipos"
              className="mt-4 flex items-center gap-3"
            >
              <button
                className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1 || busy}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page} de {equipmentQuery.data.totalPages} ·{' '}
                {equipmentQuery.data.total} equipos
              </span>
              <button
                className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= equipmentQuery.data.totalPages || busy}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </section>
        {historyEquipment && (
          <section
            aria-labelledby="history-title"
            className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
          >
            <div className="flex justify-between gap-3">
              <h2 id="history-title" className="text-xl font-semibold">
                Historial de {historyEquipment.code}{' '}
                {historyEquipment.deletedAt ? '(Eliminado)' : '(Activo)'}
              </h2>
              <button
                onClick={() => setHistoryEquipment(null)}
                className="cursor-pointer rounded border px-3 py-1"
              >
                Cerrar
              </button>
            </div>
            {history.isPending ? (
              <p role="status" className="mt-4">
                Cargando historial…
              </p>
            ) : history.isError ? (
              <p role="alert" className="mt-4 text-red-700">
                No fue posible cargar el historial.{' '}
                <button
                  type="button"
                  onClick={() => void history.refetch()}
                  className="cursor-pointer underline"
                >
                  Reintentar
                </button>
              </p>
            ) : history.data.data.length === 0 ? (
              <p className="mt-4">No hay mantenimientos registrados.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {history.data.data.map((entry) => (
                  <li key={entry.id}>
                    Fecha de registro:{' '}
                    {new Date(entry.performedAt).toLocaleString('es')} —{' '}
                    {entry.hourMeter} h
                  </li>
                ))}
              </ul>
            )}
            {history.data && history.data.totalPages > 1 && (
              <nav
                aria-label="Paginación de historial"
                className="mt-4 flex items-center gap-3"
              >
                <button
                  className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage(historyPage - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {historyPage} de {history.data.totalPages} ·{' '}
                  {history.data.total} registros
                </span>
                <button
                  className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={historyPage >= history.data.totalPages}
                  onClick={() => setHistoryPage(historyPage + 1)}
                >
                  Siguiente
                </button>
              </nav>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
