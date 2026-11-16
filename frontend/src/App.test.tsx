import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    history: vi.fn(),
    maintain: vi.fn(),
  },
}));
const truck = {
  id: '1',
  code: 'CAM-1',
  type: 'TRUCK' as const,
  hourMeter: 250,
  intervalHours: 250,
  hoursSinceMaintenance: 250,
  requiresMaintenance: true,
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const paginated = <T,>(data: T[]) => ({
  data,
  page: 1,
  limit: 5,
  total: data.length,
  totalPages: data.length ? 1 : 0,
});

function renderApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

describe('Equipment screen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.list).mockResolvedValue(paginated([]));
  });
  it('shows an empty list', async () => {
    renderApp();
    expect(
      await screen.findByText('No hay equipos registrados.'),
    ).toBeInTheDocument();
    const pagination = screen.getByRole('navigation', {
      name: 'Paginación de equipos',
    });
    expect(within(pagination).getByText('0 equipos')).toBeInTheDocument();
    expect(
      within(pagination).getByRole('button', { name: 'Anterior' }),
    ).toBeDisabled();
    expect(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    ).toBeDisabled();
  });

  it('shows separate date and ID columns and accessible action titles', async () => {
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    renderApp();
    await screen.findByText('CAM-1');
    for (const name of [
      'ID',
      'Fecha de registro',
      'Fecha de actualización',
      'Fecha de eliminación',
    ]) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: 'Editar CAM-1' }),
    ).toHaveAttribute('title', 'Editar');
    const pagination = screen.getByRole('navigation', {
      name: 'Paginación de equipos',
    });
    expect(
      within(pagination).getByText('Página 1 de 1 · 1 equipos'),
    ).toBeInTheDocument();
    expect(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    ).toBeDisabled();
  });

  it.each([3, 5])(
    'keeps pagination visible with %s items on one page',
    async (total) => {
      vi.mocked(api.list).mockResolvedValue({
        ...paginated([truck]),
        total,
        totalPages: 1,
      });
      renderApp();
      await screen.findByText('CAM-1');
      const pagination = screen.getByRole('navigation', {
        name: 'Paginación de equipos',
      });
      expect(
        within(pagination).getByText(`Página 1 de 1 · ${total} equipos`),
      ).toBeInTheDocument();
      expect(
        within(pagination).getByRole('button', { name: 'Anterior' }),
      ).toBeDisabled();
      expect(
        within(pagination).getByRole('button', { name: 'Siguiente' }),
      ).toBeDisabled();
    },
  );
  it('shows a loading error', async () => {
    vi.mocked(api.list).mockRejectedValue(new Error('offline'));
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar',
    );
  });
  it('creates an equipment', async () => {
    const user = userEvent.setup();
    vi.mocked(api.create).mockResolvedValue(truck);
    vi.mocked(api.list)
      .mockResolvedValueOnce(paginated([]))
      .mockResolvedValue(paginated([truck]));
    renderApp();
    await screen.findByText('No hay equipos registrados.');
    await user.click(screen.getByRole('button', { name: 'Nuevo equipo' }));
    await user.type(screen.getByLabelText('Código'), 'CAM-1');
    await user.clear(screen.getByLabelText('Horómetro (horas)'));
    await user.type(screen.getByLabelText('Horómetro (horas)'), '250');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('Requiere mantenimiento'),
    ).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledWith({
      code: 'CAM-1',
      type: 'TRUCK',
      hourMeter: 250,
    });
  });
  it('confirms maintenance and displays history', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.maintain).mockResolvedValue({
      id: 'm1',
      hourMeter: 250,
      performedAt: '2026-01-01T00:00:00Z',
    });
    vi.mocked(api.history).mockResolvedValue(
      paginated([
        { id: 'm1', hourMeter: 250, performedAt: '2026-01-01T00:00:00Z' },
      ]),
    );
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(
      screen.getByRole('button', { name: 'Registrar mantenimiento CAM-1' }),
    );
    await screen.findByText('Mantenimiento registrado.');
    expect(api.maintain).toHaveBeenCalledWith('1');
    await user.click(screen.getByRole('button', { name: 'Historial CAM-1' }));
    const section = await screen.findByRole('region', {
      name: 'Historial de CAM-1 (Activo)',
    });
    expect(within(section).getByText(/250 h/)).toBeInTheDocument();
  });
  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Eliminar CAM-1' }));
    await waitFor(() => expect(api.remove).not.toHaveBeenCalled());
  });

  it('edits an equipment and shows server errors', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    vi.mocked(api.update).mockRejectedValue(
      new Error('El código ya está registrado'),
    );
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Editar CAM-1' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El código ya está registrado',
    );
    expect(api.update).toHaveBeenCalledWith('1', {
      code: 'CAM-1',
      type: 'TRUCK',
      hourMeter: 250,
    });
  });

  it('edits an equipment and refreshes its status', async () => {
    const user = userEvent.setup();
    const updated = { ...truck, hourMeter: 300, hoursSinceMaintenance: 300 };
    vi.mocked(api.list)
      .mockResolvedValueOnce(paginated([truck]))
      .mockResolvedValue(paginated([updated]));
    vi.mocked(api.update).mockResolvedValue(updated);
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Editar CAM-1' }));
    await user.clear(screen.getByLabelText('Horómetro (horas)'));
    await user.type(screen.getByLabelText('Horómetro (horas)'), '300');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('300 h')).toBeInTheDocument();
    expect(api.update).toHaveBeenCalledWith('1', {
      code: 'CAM-1',
      type: 'TRUCK',
      hourMeter: 300,
    });
  });

  it('removes an equipment after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.remove).mockResolvedValue(undefined);
    vi.mocked(api.list)
      .mockResolvedValueOnce(paginated([truck]))
      .mockResolvedValue(paginated([]));
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Eliminar CAM-1' }));
    expect(await screen.findByText('Equipo eliminado.')).toBeInTheDocument();
    expect(api.remove).toHaveBeenCalledWith('1');
  });

  it('displays field errors without submitting an empty hour meter', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('No hay equipos registrados.');
    await user.click(screen.getByRole('button', { name: 'Nuevo equipo' }));
    await user.clear(screen.getByLabelText('Horómetro (horas)'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('El código es obligatorio.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('El horómetro es obligatorio.'),
    ).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('warns when maintenance succeeds but refreshing fails', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list)
      .mockResolvedValueOnce(paginated([truck]))
      .mockRejectedValue(new Error('offline'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.maintain).mockResolvedValue({
      id: 'm1',
      hourMeter: 250,
      performedAt: '2026-01-01T00:00:00Z',
    });
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(
      screen.getByRole('button', { name: 'Registrar mantenimiento CAM-1' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El mantenimiento se registró, pero no se pudo actualizar',
    );
    expect(api.maintain).toHaveBeenCalledTimes(1);
  });

  it('shows deleted equipment and permits only history', async () => {
    const user = userEvent.setup();
    const removed = { ...truck, deletedAt: '2026-01-02T00:00:00Z' };
    vi.mocked(api.list).mockResolvedValue(paginated([removed]));
    vi.mocked(api.history).mockResolvedValue(
      paginated([
        { id: 'm1', hourMeter: 250, performedAt: '2026-01-01T00:00:00Z' },
      ]),
    );
    renderApp();
    expect(await screen.findByText('Eliminado')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar CAM-1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Registrar mantenimiento CAM-1' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Historial CAM-1' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Historial de CAM-1 (Eliminado)',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fecha de registro:/)).toBeInTheDocument();
  });

  it('loads the next equipment page', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockImplementation(async (page) =>
      page === 1
        ? { ...paginated([truck]), total: 11, totalPages: 2 }
        : {
            ...paginated([{ ...truck, id: '2', code: 'CAM-2' }]),
            page: 2,
            total: 11,
            totalPages: 2,
          },
    );
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText('CAM-2')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2 · 11 equipos')).toBeInTheDocument();
  });

  it('paginates the maintenance history independently', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue(paginated([truck]));
    vi.mocked(api.history).mockImplementation(async (_id, page) => ({
      data: [
        {
          id: `m${page}`,
          hourMeter: page * 250,
          performedAt: '2026-01-01T00:00:00Z',
        },
      ],
      page,
      limit: 5,
      total: 11,
      totalPages: 2,
    }));
    renderApp();
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Historial CAM-1' }));
    const section = await screen.findByRole('region', {
      name: 'Historial de CAM-1 (Activo)',
    });
    await user.click(
      within(section).getByRole('button', { name: 'Siguiente' }),
    );
    expect(await within(section).findByText(/500 h/)).toBeInTheDocument();
    expect(api.history).toHaveBeenCalledWith('1', 2, expect.any(AbortSignal));
  });
});
