export type EquipmentType = 'TRUCK' | 'EXCAVATOR' | 'DRILL';
export type Equipment = {
  id: string;
  code: string;
  type: EquipmentType;
  hourMeter: number;
  intervalHours: number;
  hoursSinceMaintenance: number;
  requiresMaintenance: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type EquipmentInput = Pick<Equipment, 'code' | 'type' | 'hourMeter'>;
export type Maintenance = {
  id: string;
  hourMeter: number;
  performedAt: string;
};
export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = import.meta.env.VITE_API_URL;
  if (!url) throw new Error('La URL de la API no está configurada.');
  const response = await fetch(`${url.replace(/\/$/, '')}${path}`, options);
  if (!response.ok) {
    let message = 'No fue posible completar la operación.';
    try {
      const body: { message?: string | string[] } = await response.json();
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* La respuesta puede no ser JSON. */
    }
    throw new Error(message);
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

const json = (method: string, body: EquipmentInput): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
export const api = {
  list: (page: number, signal?: AbortSignal) =>
    request<Paginated<Equipment>>(`/equipment?page=${page}&limit=5`, {
      signal,
    }),
  create: (data: EquipmentInput) =>
    request<Equipment>('/equipment', json('POST', data)),
  update: (id: string, data: EquipmentInput) =>
    request<Equipment>(
      `/equipment/${encodeURIComponent(id)}`,
      json('PATCH', data),
    ),
  remove: (id: string) =>
    request<void>(`/equipment/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  history: (id: string, page: number, signal?: AbortSignal) =>
    request<Paginated<Maintenance>>(
      `/equipment/${encodeURIComponent(id)}/maintenances?page=${page}&limit=5`,
      { signal },
    ),
  maintain: (id: string) =>
    request<Maintenance>(`/equipment/${encodeURIComponent(id)}/maintenances`, {
      method: 'POST',
    }),
};
