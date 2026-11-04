import { UserSummary } from '../domain/user';
import { UserOrmEntity } from './user.orm-entity';

export const toUserSummary = (row: UserOrmEntity): UserSummary => ({
  id: row.id,
  name: row.name,
  role: row.role,
});
