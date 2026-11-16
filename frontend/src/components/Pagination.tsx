type Props = {
  label: string;
  page: number;
  totalPages: number;
  total: number;
  unit: string;
  busy?: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({
  label,
  page,
  totalPages,
  total,
  unit,
  busy = false,
  onPageChange,
}: Props) {
  return (
    <nav aria-label={label} className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page <= 1 || busy}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        {total === 0
          ? `0 ${unit}`
          : `Página ${page} de ${totalPages} · ${total} ${unit}`}
      </span>
      <button
        type="button"
        className="cursor-pointer rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page >= totalPages || busy}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
