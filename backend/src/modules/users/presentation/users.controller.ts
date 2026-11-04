import { Controller, Get, Query } from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Role } from '../domain/role.enum';
import { UsersService } from '../application/users.service';

class ListUsersQuery {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Public on purpose: the frontend needs it to build the actor selector before anyone is "logged in". */
  @Get()
  async list(@Query() query: ListUsersQuery) {
    const users = await this.usersService.list(query.role);
    return users.map(({ id, name, role }) => ({ id, name, role }));
  }
}
