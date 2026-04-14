'use client';

import { useEffect, useMemo, useState } from 'react';

import { AdminRecord, HistoryEvent, ModulePermission, RecordListResponse } from '../../lib/admin-types';

type Props = {
  module: ModulePermission;
};

export function ModuleView({ module }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecordListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const selected = data?.items.find((item) => item.id === selectedId) ?? data?.items[0] ?? null;

  const statuses = useMemo(() => {
    const unique = new Set(data?.items.map((item) => item.estado) ?? []);
    return ['Todos', ...unique];
  }, [data]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams({ q: query, status, page: String(page), pageSize: '8' });
      const response = await fetch(`/api/modules/${module.module}/records?${params.toString()}`);
      if (!response.ok) {
        setData(null);
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as RecordListResponse;
      setData(payload);
      setSelectedId((previous) => previous ?? payload.items[0]?.id ?? null);
      setLoading(false);
    };

    load();
  }, [module.module, query, status, page]);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }

    const loadHistory = async () => {
      const response = await fetch(`/api/modules/${module.module}/records/${selected.id}/history`);
      if (!response.ok) {
        setHistory([]);
        return;
      }
      const payload = (await response.json()) as { items: HistoryEvent[] };
      setHistory(payload.items);
    };

    loadHistory();
  }, [selected?.id, module.module]);

  const intervene = async (record: AdminRecord, action: string) => {
    await fetch(`/api/modules/${module.module}/records/${record.id}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });

    const historyResponse = await fetch(`/api/modules/${module.module}/records/${record.id}/history`);
    const payload = (await historyResponse.json()) as { items: HistoryEvent[] };
    setHistory(payload.items);
  };

  const exportFile = async (format: 'csv' | 'xlsx') => {
    const response = await fetch(`/api/modules/${module.module}/export?format=${format}`);
    if (!response.ok) {
      return;
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `${module.module}.${format}`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 8)));

  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={query} placeholder="Buscar" onChange={(e) => { setQuery(e.target.value); setPage(1); }} style={{ padding: 8, minWidth: 220 }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span>RF: {module.rf.join(', ')}</span>
        {module.canExport && (
          <>
            <button onClick={() => exportFile('csv')}>Exportar CSV</button>
            <button onClick={() => exportFile('xlsx')}>Exportar XLSX</button>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #dbe3f4', borderRadius: 8, background: '#fff', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>ID</th><th>Estado</th><th>Cobertura</th><th>Profesional</th><th>Paciente</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <tr key={row.id} style={{ background: row.id === selected?.id ? '#f0f7ff' : 'transparent' }} onClick={() => setSelectedId(row.id)}>
                  <td>{row.id}</td>
                  <td>{row.estado}</td>
                  <td>{row.cobertura}</td>
                  <td>{row.profesional}</td>
                  <td>{row.paciente}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {row.allowedActions.map((action) => (
                        <button key={action} onClick={() => intervene(row, action)}>{action}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p style={{ padding: '0 12px' }}>Cargando...</p>}
        </div>

        <aside style={{ border: '1px solid #dbe3f4', borderRadius: 8, background: '#fff', padding: 12 }}>
          <h4>Historial de cambios</h4>
          {history.length === 0 && <p>Sin eventos</p>}
          <ul>
            {history.map((event) => (
              <li key={event.id}>
                <strong>{new Date(event.date).toLocaleString('es-AR')}</strong> · {event.actor} · {event.change}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
