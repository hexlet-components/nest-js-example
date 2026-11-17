import { ApiProblemResponses } from "../common/api-problem-responses.js";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { z } from "zod";
import { Public } from "./public.js";
import { AuthService } from "./auth.service.js";
import { loginSchema } from "../contracts.js";
import type { Credentials } from "../contracts.js";
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public()
  @Post("login")
  @ApiProblemResponses(400, 401, 500)
  @ApiOkResponse({ standardSchema: z.object({ accessToken: z.string() }) })
  @HttpCode(200)
  login(@Body({ schema: loginSchema }) input: Credentials) {
    return this.auth.login(input);
  }
}
