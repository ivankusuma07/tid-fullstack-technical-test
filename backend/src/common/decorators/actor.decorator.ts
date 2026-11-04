import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor } from '../../modules/users/domain/user';

export interface RequestWithActor {
  headers: Record<string, string | string[] | undefined>;
  actor?: Actor;
}

/** Injects the acting user resolved by ActorGuard. */
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  return ctx.switchToHttp().getRequest<RequestWithActor>().actor!;
});
