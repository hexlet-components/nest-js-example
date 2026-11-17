import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { NodeRequest } from "@nestjs/platform-node";
export type AuthenticatedRequest = NodeRequest & { user: { id: string }; requestId?: string };
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user.id,
);
