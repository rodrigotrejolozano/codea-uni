import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('API pagination', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it('requests five items per page for equipment and history', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    const response = {
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        page: 1,
        limit: 5,
        total: 0,
        totalPages: 0,
      }),
    };
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    await api.list(2);
    await api.history('equipment-1', 3);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.example.com/equipment?page=2&limit=5',
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.example.com/equipment/equipment-1/maintenances?page=3&limit=5',
    );
  });
});
