import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
};

describe('Equipment screen', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.list).mockResolvedValue([]);
  });
  it('shows an empty list', async () => {
    render(<App />);
    expect(
      await screen.findByText('No hay equipos registrados.'),
    ).toBeInTheDocument();
  });
  it('shows a loading error', async () => {
    vi.mocked(api.list).mockRejectedValue(new Error('offline'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible cargar',
    );
  });
  it('creates an equipment', async () => {
    const user = userEvent.setup();
    vi.mocked(api.create).mockResolvedValue(truck);
    render(<App />);
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
    vi.mocked(api.list).mockResolvedValue([truck]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.maintain).mockResolvedValue({
      id: 'm1',
      hourMeter: 250,
      performedAt: '2026-01-01T00:00:00Z',
    });
    vi.mocked(api.history).mockResolvedValue([
      { id: 'm1', hourMeter: 250, performedAt: '2026-01-01T00:00:00Z' },
    ]);
    render(<App />);
    await screen.findByText('CAM-1');
    await user.click(
      screen.getByRole('button', { name: 'Registrar mantenimiento CAM-1' }),
    );
    await screen.findByText('Mantenimiento registrado.');
    expect(api.maintain).toHaveBeenCalledWith('1');
    await user.click(screen.getByRole('button', { name: 'Historial CAM-1' }));
    const section = await screen.findByRole('region', {
      name: 'Historial de CAM-1',
    });
    expect(within(section).getByText(/250 h/)).toBeInTheDocument();
  });
  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue([truck]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Eliminar CAM-1' }));
    await waitFor(() => expect(api.remove).not.toHaveBeenCalled());
  });

  it('edits an equipment and shows server errors', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue([truck]);
    vi.mocked(api.update).mockRejectedValue(
      new Error('El código ya está registrado'),
    );
    render(<App />);
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

  it('removes an equipment after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(api.list).mockResolvedValue([truck]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(api.remove).mockResolvedValue(undefined);
    render(<App />);
    await screen.findByText('CAM-1');
    await user.click(screen.getByRole('button', { name: 'Eliminar CAM-1' }));
    expect(
      await screen.findByText('No hay equipos registrados.'),
    ).toBeInTheDocument();
    expect(api.remove).toHaveBeenCalledWith('1');
  });
});
