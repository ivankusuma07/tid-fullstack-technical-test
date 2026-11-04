import { Role } from './role.enum';
import { User } from './user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findAll(filter?: { role?: Role }): Promise<User[]>;
}
