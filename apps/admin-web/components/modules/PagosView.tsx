'use client';

import { ModulePermission } from '../../lib/admin-types';
import { ModuleView } from './ModuleView';

export function PagosView({ module }: { module: ModulePermission }) {
  return <ModuleView module={module} />;
}
