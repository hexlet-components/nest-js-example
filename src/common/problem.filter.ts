import { Catch, ExceptionFilter, ArgumentsHost, HttpException, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { STATUS_CODES } from "node:http";
import { safeError } from "./safe-error.js";
import type { ProblemDetails } from "../contracts.js";
import { HttpAdapterHost } from "@nestjs/core";
import type { AuthenticatedRequest } from "../auth/current-user.js";
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}
  catch(error: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const context = host.switchToHttp();
    const req = context.getRequest<AuthenticatedRequest>();
    const res = context.getResponse();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const requestId = req.requestId ?? randomUUID();
    const detail =
      status >= 500
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Request failed";
    if (status >= 500)
      this.logger.error({
        requestId,
        status,
        error: safeError(error),
      });
    httpAdapter.setHeader(res, "Content-Type", "application/problem+json");
    httpAdapter.setHeader(res, "X-Request-Id", requestId);
    httpAdapter.reply(
      res,
      {
        type: "about:blank",
        title: STATUS_CODES[status] ?? "Error",
        status,
        detail,
        instance: req.url ?? "/",
        requestId,
      } satisfies ProblemDetails,
      status,
    );
  }
}
