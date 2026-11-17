import { ApiProblemResponses } from "../common/api-problem-responses.js";
import { Body, Controller, Get, Post, SerializeOptions } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.js";
import { Public } from "../auth/public.js";
import { publicUserSchema, registrationSchema } from "../contracts.js";
import type { Credentials } from "../contracts.js";
import { UsersService } from "./users.service.js";
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Public()
  @Post()
  @ApiProblemResponses(400, 409, 500)
  @ApiCreatedResponse({ standardSchema: publicUserSchema })
  @SerializeOptions({ schema: publicUserSchema })
  create(@Body({ schema: registrationSchema }) input: Credentials) {
    return this.users.create(input);
  }
  @Get("me")
  @ApiProblemResponses(401, 404, 500)
  @ApiOkResponse({ standardSchema: publicUserSchema })
  @ApiBearerAuth()
  @SerializeOptions({ schema: publicUserSchema })
  me(@CurrentUser() userId: string) {
    return this.users.findOne(userId);
  }
}
