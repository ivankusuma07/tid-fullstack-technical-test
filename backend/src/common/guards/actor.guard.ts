import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { UsersService } from '../../modules/users/application/users.service';
import { RequestWithActor } from '../decorators/actor.decorator';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

export const ACTOR_HEADER = 'x-user-id';

/**
 * No real authentication (not required by the brief): the frontend sends the selected
 * user's id in `X-User-Id`. The guard resolves it to a user so the backend still
 * enforces roles. Swapping this guard for a JWT guard is the only change needed for auth.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithActor>();
    const header = req.headers[ACTOR_HEADER];
    const userId = Array.isArray(header) ? header[0] : header;

    if (!userId) throw new UnauthorizedException('Missing X-User-Id header');
    if (!isUUID(userId)) throw new UnauthorizedException('X-User-Id must be a UUID');

    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException(`Unknown user ${userId}`);

    req.actor = { id: user.id, name: user.name, role: user.role };
    return true;
  }
}
