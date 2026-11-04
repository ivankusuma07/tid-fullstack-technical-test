import { Inject, Injectable } from '@nestjs/common';
import { Role } from '../domain/role.enum';
import { User } from '../domain/user';
import { USER_REPOSITORY, UserRepository } from '../domain/user.repository';

@Injectable()
export class UsersService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  list(role?: Role): Promise<User[]> {
    return this.users.findAll({ role });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }
}
