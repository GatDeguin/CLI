'use client';

import { useEffect, useMemo, useState } from 'react';

import { AgendasView } from '../components/modules/AgendasView';
import { AuditoriaView } from '../components/modules/AuditoriaView';
import { CoberturaView } from '../components/modules/CoberturaView';
import { DocumentosView } from '../components/modules/DocumentosView';
import { PagosView } from '../components/modules/PagosView';
import { ParametrosView } from '../components/modules/ParametrosView';
import { ProfesionalesView } from '../components/modules/ProfesionalesView';
import { ModuleKey, ModulePermission, Operator } from '../lib/admin-types';

const labels: Record<ModuleKey, string> = {
  profesionales: 'Profesionales',
  agendas: 'Agendas',
  cobertura: 'Cobertura',
  pagos: 'Pagos',
  documentos: 'Documentos',
  auditoria: 'Auditoría',
  parametros: 'Parámetros',
};

function Login({ onLogged }: { onLogged: (operator: Operator) => void }) {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  return (
    <section style={{ maxWidth: 420, margin: '64px auto', background: '#fff', border: '1px solid #dbe3f4', borderRadius: 12, padding: 16 }}>
      <h1>Ingreso de operadores</h1>
      <p>Usuarios demo: superadmin/admin123 u operador/operador123</p>
      <div style={{ display: 'grid', gap: 8 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuario" />
        <input value={password} type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <button
          onClick={async () => {
            setError('');
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
              setError('Credenciales inválidas');
              return;
            }

            const payload = (await response.json()) as { operator: Operator };
            onLogged(payload.operator);
          }}
        >
          Iniciar sesión
        </button>
        {error && <p style={{ color: '#b00020' }}>{error}</p>}
      </div>
    </section>
  );
}

function ModuleRenderer({ permission }: { permission: ModulePermission }) {
  const props = { module: permission };
  switch (permission.module) {
    case 'profesionales':
      return <ProfesionalesView {...props} />;
    case 'agendas':
      return <AgendasView {...props} />;
    case 'cobertura':
      return <CoberturaView {...props} />;
    case 'pagos':
      return <PagosView {...props} />;
    case 'documentos':
      return <DocumentosView {...props} />;
    case 'auditoria':
      return <AuditoriaView {...props} />;
    case 'parametros':
      return <ParametrosView {...props} />;
    default:
      return null;
  }
}

export default function HomePage() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch('/api/me');
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { operator: Operator };
      setOperator(payload.operator);
    };

    loadSession();
  }, []);

  useEffect(() => {
    if (!operator || activeModule) {
      return;
    }
    setActiveModule(operator.permissions[0]?.module ?? null);
  }, [operator, activeModule]);

  const activePermission = useMemo(
    () => operator?.permissions.find((entry) => entry.module === activeModule) ?? null,
    [operator, activeModule],
  );

  if (!operator) {
    return <Login onLogged={setOperator} />;
  }

  return (
    <main style={{ padding: 20, display: 'grid', gap: 16 }}>
      <header style={{ background: '#fff', border: '1px solid #dbe3f4', borderRadius: 12, padding: 16 }}>
        <h1 style={{ margin: 0 }}>Admin Web · RF-064 a RF-077</h1>
        <p>Operador: <strong>{operator.name}</strong> ({operator.role})</p>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            setOperator(null);
            setActiveModule(null);
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {operator.permissions.map((permission) => (
          <button
            key={permission.module}
            onClick={() => setActiveModule(permission.module)}
            style={{
              padding: '8px 12px',
              borderRadius: 999,
              border: activeModule === permission.module ? '1px solid #1c5fd4' : '1px solid #dbe3f4',
              background: activeModule === permission.module ? '#d8e6ff' : '#fff',
            }}
          >
            {labels[permission.module]}
          </button>
        ))}
      </nav>

      {activePermission ? <ModuleRenderer permission={activePermission} /> : <p>Sin módulos habilitados.</p>}
    </main>
  );
}
