import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../modules/users/domain/role.enum';
import { RequestWithActor } from '../decorators/actor.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Runs after ActorGuard. Rejects early when the endpoint is reserved for other roles. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles?.length) return true;

    const { actor } = ctx.switchToHttp().getRequest<RequestWithActor>();
    if (!actor || !roles.includes(actor.role)) {
      throw new ForbiddenException(`This action requires role ${roles.join(' or ')}`);
    }
    return true;
  }
}
