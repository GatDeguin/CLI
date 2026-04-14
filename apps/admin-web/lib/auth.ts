import { cookies } from 'next/headers';

import { findOperatorById } from './mock-admin-data';

export const SESSION_COOKIE = 'admin_operator_session';

export const getCurrentOperator = () => {
  const store = cookies();
  const operatorId = store.get(SESSION_COOKIE)?.value;
  if (!operatorId) {
    return null;
  }

  return findOperatorById(operatorId) ?? null;
};
