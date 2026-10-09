import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '../../database/entities';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<{ user: User }>().user,
);
