import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Actor } from '../../users/domain/user';
import { UsersService } from '../../users/application/users.service';

export interface TokenPayload {
  /** User id. Role is re-read from the DB on every request, so it is not trusted from the token. */
  sub: string;
}

export interface Session {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: Actor;
}

/**
 * Issues and verifies access tokens.
 *
 * The brief has no credentials, so "login" means picking a seeded user. A password or SSO
 * check would be added inside `login`; nothing else (guard, controllers, services) changes.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async login(userId: string): Promise<Session> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException(`Unknown user ${userId}`);

    const payload: TokenPayload = { sub: user.id };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      user: { id: user.id, name: user.name, role: user.role },
    };
  }

  /** Verifies the token and loads the current user (so a deleted user or changed role takes effect). */
  async authenticate(token: string): Promise<Actor> {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');
    return { id: user.id, name: user.name, role: user.role };
  }
}
