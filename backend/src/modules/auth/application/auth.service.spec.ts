import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InMemoryUserRepository } from '../../../testing/in-memory-repositories';
import { UsersService } from '../../users/application/users.service';
import { Role } from '../../users/domain/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const now = new Date();
  const users = new InMemoryUserRepository([
    { id: 'u-admin', name: 'Admin', role: Role.ADMIN, createdAt: now, updatedAt: now },
  ]);
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
  const auth = new AuthService(jwt, new UsersService(users));

  it('issues a token that authenticates back to the same user', async () => {
    const session = await auth.login('u-admin');
    expect(session.tokenType).toBe('Bearer');
    expect(session.user).toEqual({ id: 'u-admin', name: 'Admin', role: Role.ADMIN });
    await expect(auth.authenticate(session.accessToken)).resolves.toEqual(session.user);
  });

  it('rejects unknown users at login', async () => {
    await expect(auth.login('nobody')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tokens signed with another secret', async () => {
    const forged = await new JwtService({ secret: 'other' }).signAsync({ sub: 'u-admin' });
    await expect(auth.authenticate(forged)).rejects.toThrow('Invalid or expired access token');
  });

  it('rejects expired tokens', async () => {
    const expired = await jwt.signAsync({ sub: 'u-admin' }, { expiresIn: -10 });
    await expect(auth.authenticate(expired)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const token = await jwt.signAsync({ sub: 'deleted-user' });
    await expect(auth.authenticate(token)).rejects.toThrow('User no longer exists');
  });
});
