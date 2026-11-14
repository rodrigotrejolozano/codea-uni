import { useEffect, useState } from 'react';

type Equipment = {
  id: string;
  code: string;
  type: 'TRUCK' | 'EXCAVATOR' | 'DRILL';
  hourMeter: number;
};

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; equipment: Equipment[] };

const labels: Record<Equipment['type'], string> = {
  TRUCK: 'Camión',
  EXCAVATOR: 'Excavadora',
  DRILL: 'Perforadora',
};

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function loadEquipment() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        if (!apiUrl) throw new Error('VITE_API_URL is required');
        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/equipment`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Unable to load equipment');
        const equipment: Equipment[] = await response.json();
        setState({ status: 'success', equipment });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    }

    void loadEquipment();
    return () => controller.abort();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
            Gestión de activos
          </p>
          <h1 className="mt-2 text-3xl font-bold">Equipos mineros</h1>
          <p className="mt-2 text-slate-600">
            Consulta los equipos registrados y sus horas de uso.
          </p>
        </header>
        <section
          aria-labelledby="equipment-title"
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 id="equipment-title" className="mb-4 text-xl font-semibold">
            Equipos registrados
          </h2>
          {state.status === 'loading' && <p role="status">Cargando equipos…</p>}
          {state.status === 'error' && (
            <p role="alert" className="text-red-700">
              No fue posible cargar los equipos. Verifica la conexión e
              inténtalo de nuevo.
            </p>
          )}
          {state.status === 'success' &&
            (state.equipment.length === 0 ? (
              <p>No hay equipos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 p-3">Código</th>
                      <th className="border-b border-slate-200 p-3">Tipo</th>
                      <th className="border-b border-slate-200 p-3">
                        Horómetro
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.equipment.map((item) => (
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </section>
      </div>
    </main>
  );
}

export default App;
