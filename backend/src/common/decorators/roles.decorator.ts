import { SetMetadata } from '@nestjs/common';
import { Role } from '../../modules/users/domain/role.enum';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

/** Coarse role check at the HTTP edge. Status / "is assigned mechanic" rules stay in the domain policy. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Skips the actor requirement (health check, user list for the selector). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
