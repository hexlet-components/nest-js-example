import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "./password.js";
import { UsersService } from "../users/users.service.js";
import type { Credentials } from "../contracts.js";
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}
  async login(input: Credentials) {
    const user = await this.users.findByEmail(input.email);
    const valid = await verifyPassword(user?.passwordHash ?? DUMMY_PASSWORD_HASH, input.password);
    if (!user || !valid) throw new UnauthorizedException();
    return { accessToken: await this.jwt.signAsync({ sub: user.id }) };
  }
}
