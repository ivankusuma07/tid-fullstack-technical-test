import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CurrentActor } from '../../../common/decorators/actor.decorator';
import { Public } from '../../../common/decorators/roles.decorator';
import { Actor } from '../../users/domain/user';
import { AuthService } from '../application/auth.service';

class LoginDto {
  @ApiProperty({ example: '11111111-1111-4111-8111-111111111111', description: 'A seeded user id (GET /api/users)' })
  @IsUUID()
  userId: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in as a seeded user; returns a Bearer access token' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'The user the access token belongs to' })
  me(@CurrentActor() actor: Actor) {
    return actor;
  }
}
