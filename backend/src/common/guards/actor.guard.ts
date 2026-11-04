import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../modules/auth/application/auth.service';
import { RequestWithActor } from '../decorators/actor.decorator';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

/**
 * Resolves "who is acting" from `Authorization: Bearer <JWT>` and attaches it as `req.actor`.
 * Controllers and services only ever see `Actor`, so they did not change when this guard
 * replaced the earlier `X-User-Id` header.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithActor>();
    const header = req.headers['authorization'];
    const value = Array.isArray(header) ? header[0] : header;
    const [scheme, token] = value?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing access token (Authorization: Bearer <token>)');
    }
    req.actor = await this.auth.authenticate(token);
    return true;
  }
}
