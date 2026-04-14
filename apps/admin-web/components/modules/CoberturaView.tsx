'use client';

import { ModulePermission } from '../../lib/admin-types';
import { ModuleView } from './ModuleView';

export function CoberturaView({ module }: { module: ModulePermission }) {
  return <ModuleView module={module} />;
}
