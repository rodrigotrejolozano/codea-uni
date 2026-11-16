import { useState } from 'react';
import type { Equipment, EquipmentInput } from './api';
import { EquipmentTable } from './components/EquipmentTable';
import { Pagination } from './components/Pagination';
import { EquipmentForm } from './components/EquipmentForm';
import {
  useEquipment,
  useEquipmentMutations,
  useHistory,
} from './equipment/queries';

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
            <EquipmentTable
              equipment={equipment}
              busy={busy}
              onEdit={setForm}
              onMaintain={maintain}
              onHistory={showHistory}
              onRemove={remove}
            />
          )}
          {equipmentQuery.data && (
            <Pagination
              label="Paginación de equipos"
              page={page}
              totalPages={equipmentQuery.data.totalPages}
              total={equipmentQuery.data.total}
              unit="equipos"
              busy={busy}
              onPageChange={setPage}
            />
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
            {history.data && (
              <Pagination
                label="Paginación de historial"
                page={historyPage}
                totalPages={history.data.totalPages}
                total={history.data.total}
                unit="registros"
                onPageChange={setHistoryPage}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default App;
