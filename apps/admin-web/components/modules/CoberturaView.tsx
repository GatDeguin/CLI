'use client';

import { ModulePermission, Operator } from '../../lib/admin-types';
import { ModuleView } from './ModuleView';

export function CoberturaView({ module, operator }: { module: ModulePermission; operator: Operator }) {
  return <ModuleView module={module} operator={operator} />;
}
