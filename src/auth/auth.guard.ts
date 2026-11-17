import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { z } from "zod";
import { IS_PUBLIC } from "./public.js";
import type { AuthenticatedRequest } from "./current-user.js";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match = typeof header === "string" ? /^Bearer (\S+)$/.exec(header) : null;
    if (!match) throw new UnauthorizedException();
    try {
      const payload: unknown = await this.jwt.verifyAsync(match[1]!, { algorithms: ["HS256"] });
      const { sub } = z.object({ sub: z.uuid() }).parse(payload);
      request.user = { id: sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
