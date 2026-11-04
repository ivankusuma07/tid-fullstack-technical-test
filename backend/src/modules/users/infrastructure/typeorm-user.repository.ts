import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../domain/role.enum';
import { User } from '../domain/user';
import { UserRepository } from '../domain/user.repository';
import { UserOrmEntity } from './user.orm-entity';

const toDomain = (row: UserOrmEntity): User => ({
  id: row.id,
  name: row.name,
  role: row.role,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(@InjectRepository(UserOrmEntity) private readonly repo: Repository<UserOrmEntity>) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findAll(filter: { role?: Role } = {}): Promise<User[]> {
    const rows = await this.repo.find({
      where: filter.role ? { role: filter.role } : {},
      order: { role: 'ASC', name: 'ASC' },
    });
    return rows.map(toDomain);
  }
}
