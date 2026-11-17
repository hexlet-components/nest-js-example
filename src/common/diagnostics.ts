import {
  Injectable,
  NestMiddleware,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NodeResponse } from "@nestjs/platform-node";
import type { AuthenticatedRequest } from "../auth/current-user.js";
import { finalize } from "rxjs";
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: NodeResponse, next: () => void) {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  }
}
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimingInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const started = performance.now();
    return next.handle().pipe(
      finalize(() =>
        this.logger.log({
          requestId: req.requestId,
          method: req.method,
          durationMs: Math.round(performance.now() - started),
        }),
      ),
    );
  }
}
