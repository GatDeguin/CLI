import { SetMetadata } from '@nestjs/common';

export const ACTIVE_PROFILE_REQUIRED = 'activeProfileRequired';
export const ActiveProfileRequired = () => SetMetadata(ACTIVE_PROFILE_REQUIRED, true);
