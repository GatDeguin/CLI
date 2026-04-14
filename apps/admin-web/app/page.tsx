'use client';

import { useMemo, useState } from 'react';

type Role = 'SuperAdmin' | 'Operaciones' | 'Finanzas' | 'Auditoría' | 'Documentación';

type ModuleKey =
  | 'profesionales'
  | 'agendas'
  | 'coberturas'
  | 'preciosCopagos'
  | 'turnosIncidencias'
  | 'pagosReembolsos'
  | 'documentos'
  | 'auditoria'
  | 'parametrosGlobales'
  | 'reportes';

const RBAC: Record<Role, ModuleKey[]> = {
  SuperAdmin: [
    'profesionales',
    'agendas',
    'coberturas',
    'preciosCopagos',
    'turnosIncidencias',
    'pagosReembolsos',
    'documentos',
    'auditoria',
    'parametrosGlobales',
    'reportes',
  ],
  Operaciones: ['profesionales', 'agendas', 'coberturas', 'turnosIncidencias', 'reportes'],
  Finanzas: ['preciosCopagos', 'pagosReembolsos', 'reportes'],
  Auditoría: ['auditoria', 'reportes', 'documentos'],
  Documentación: ['documentos', 'turnosIncidencias', 'reportes'],
};

const MODULE_LABELS: Record<ModuleKey, string> = {
  profesionales: 'Profesionales',
  agendas: 'Agendas',
  coberturas: 'Coberturas',
  preciosCopagos: 'Precios y copagos',
  turnosIncidencias: 'Turnos e incidencias',
  pagosReembolsos: 'Pagos y reembolsos',
  documentos: 'Documentos',
  auditoria: 'Auditoría',
  parametrosGlobales: 'Parámetros globales',
  reportes: 'Reportes',
};

type Row = { id: string; estado: string; cobertura: string; profesional: string; detalle: string };
const rowsByModule: Record<ModuleKey, Row[]> = {
  profesionales: [
    { id: 'PR-1001', estado: 'Activo', cobertura: 'OSDE 210', profesional: 'Dra. Gómez', detalle: 'Cardiología · CABA' },
    { id: 'PR-1002', estado: 'Pendiente', cobertura: 'Swiss Medical', profesional: 'Dr. Luna', detalle: 'Pediatría · Rosario' },
  ],
  agendas: [
    { id: 'AG-3009', estado: 'Abierta', cobertura: 'Galeno', profesional: 'Dra. Ríos', detalle: 'Lun-Vie 09:00-15:00' },
    { id: 'AG-3010', estado: 'Bloqueada', cobertura: 'Particular', profesional: 'Dr. Díaz', detalle: 'Bloqueo por licencia' },
  ],
  coberturas: [
    { id: 'CO-002', estado: 'Activa', cobertura: 'OSDE 210', profesional: '—', detalle: 'Copago general ARS 7.500' },
    { id: 'CO-010', estado: 'Revisión', cobertura: 'IOMA', profesional: '—', detalle: 'Nomenclador pendiente' },
  ],
  preciosCopagos: [
    { id: 'PC-901', estado: 'Vigente', cobertura: 'Swiss Medical', profesional: '—', detalle: 'Consulta clínica ARS 10.000' },
    { id: 'PC-902', estado: 'Draft', cobertura: 'Particular', profesional: '—', detalle: 'Teleconsulta ARS 8.000' },
  ],
  turnosIncidencias: [
    { id: 'TU-771', estado: 'Confirmado', cobertura: 'OSDE 310', profesional: 'Dr. Paz', detalle: 'Paciente no asistió (No-show)' },
    { id: 'IN-772', estado: 'Escalado', cobertura: 'Galeno', profesional: 'Dra. Rey', detalle: 'Error de agenda duplicada' },
  ],
  pagosReembolsos: [
    { id: 'PG-551', estado: 'Acreditado', cobertura: 'Particular', profesional: '—', detalle: 'MP · ARS 9.500' },
    { id: 'RB-552', estado: 'Pendiente', cobertura: 'OSDE 210', profesional: '—', detalle: 'Reembolso por cancelación' },
  ],
  documentos: [
    { id: 'DC-120', estado: 'Firmado', cobertura: 'OSDE 210', profesional: 'Dr. Luna', detalle: 'Receta electrónica' },
    { id: 'DC-121', estado: 'Observado', cobertura: 'Galeno', profesional: 'Dra. Rey', detalle: 'Orden sin sello' },
  ],
  auditoria: [
    { id: 'AU-800', estado: 'INFO', cobertura: 'Sistema', profesional: 'admin.ops', detalle: 'Cambio de copago PC-901' },
    { id: 'AU-801', estado: 'WARN', cobertura: 'Sistema', profesional: 'caja.1', detalle: 'Intento de reembolso duplicado' },
  ],
  parametrosGlobales: [
    { id: 'PA-01', estado: 'Vigente', cobertura: 'Sistema', profesional: '—', detalle: 'Timeout OTP: 180 segundos' },
    { id: 'PA-02', estado: 'Vigente', cobertura: 'Sistema', profesional: '—', detalle: 'Política no-show: 15 minutos' },
  ],
  reportes: [
    { id: 'RP-90', estado: 'Generado', cobertura: 'Global', profesional: '—', detalle: 'Productividad semanal por sede' },
    { id: 'RP-91', estado: 'Programado', cobertura: 'Global', profesional: '—', detalle: 'Cobranza y mora mensual' },
  ],
};

export default function HomePage() {
  const [role, setRole] = useState<Role>('SuperAdmin');
  const allowedModules = RBAC[role];
  const [module, setModule] = useState<ModuleKey>(allowedModules[0]);
  const [query, setQuery] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = rowsByModule[module];
  const estados = useMemo(() => ['Todos', ...new Set(rows.map((row) => row.estado))], [rows]);
  const filteredRows = rows.filter((row) => {
    const q = query.toLowerCase();
    const matchesQuery = !q || row.id.toLowerCase().includes(q) || row.detalle.toLowerCase().includes(q) || row.profesional.toLowerCase().includes(q);
    const matchesEstado = estadoFiltro === 'Todos' || row.estado === estadoFiltro;
    return matchesQuery && matchesEstado;
  });
  const selected = filteredRows.find((item) => item.id === selectedId) ?? filteredRows[0];

  return (
    <main style={{ padding: 20, display: 'grid', gap: 16 }}>
      <header style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #dbe3f4' }}>
        <h1 style={{ margin: 0, color: '#162b50' }}>Admin Web · Operación</h1>
        <p style={{ margin: '8px 0 0', color: '#476084' }}>
          Módulos operativos con RBAC, filtros y vista de detalle para gestión real.
        </p>
      </header>

      <section style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #dbe3f4', display: 'grid', gap: 12 }}>
        <label>
          <strong>Rol activo (RBAC): </strong>
          <select value={role} onChange={(e) => { const newRole = e.target.value as Role; setRole(newRole); const first = RBAC[newRole][0]; setModule(first); setSelectedId(null); }}>
            {Object.keys(RBAC).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {allowedModules.map((moduleKey) => (
            <button
              key={moduleKey}
              onClick={() => { setModule(moduleKey); setSelectedId(null); }}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: moduleKey === module ? '1px solid #1c5fd4' : '1px solid #dbe3f4',
                background: moduleKey === module ? '#d8e6ff' : '#f6f8fd',
                cursor: 'pointer',
              }}
            >
              {MODULE_LABELS[moduleKey]}
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe3f4', padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>{MODULE_LABELS[module]}</h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input placeholder="Buscar por ID, detalle o profesional" value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: 8 }} />
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
              {estados.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #dbe3f4' }}>
                <th>ID</th><th>Estado</th><th>Cobertura</th><th>Profesional</th><th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} onClick={() => setSelectedId(row.id)} style={{ borderBottom: '1px solid #eef2fa', cursor: 'pointer', background: selected?.id === row.id ? '#f2f7ff' : 'transparent' }}>
                  <td>{row.id}</td><td>{row.estado}</td><td>{row.cobertura}</td><td>{row.profesional}</td><td>{row.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside style={{ background: '#fff', borderRadius: 12, border: '1px solid #dbe3f4', padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Vista de detalle</h3>
          {selected ? (
            <>
              <p><strong>ID:</strong> {selected.id}</p>
              <p><strong>Estado:</strong> {selected.estado}</p>
              <p><strong>Cobertura:</strong> {selected.cobertura}</p>
              <p><strong>Profesional:</strong> {selected.profesional}</p>
              <p><strong>Detalle:</strong> {selected.detalle}</p>
              <button style={{ padding: '8px 12px' }}>Abrir gestión</button>
            </>
          ) : (
            <p>Sin registros para los filtros seleccionados.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
