import { ApiProblemResponses } from "../common/api-problem-responses.js";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  SerializeOptions,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.js";
import {
  createTaskSchema,
  idSchema,
  publicTaskSchema,
  updateTaskSchema,
  searchSchema,
} from "../contracts.js";
import type { CreateTask, UpdateTask, Search } from "../contracts.js";
import { TasksService } from "./tasks.service.js";
@ApiBearerAuth()
@ApiProblemResponses(400, 401, 404, 500)
@Controller("tasks")
@SerializeOptions({ schema: publicTaskSchema })
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Post()
  @ApiCreatedResponse({ standardSchema: publicTaskSchema })
  create(@CurrentUser() userId: string, @Body({ schema: createTaskSchema }) input: CreateTask) {
    return this.tasks.create(userId, input);
  }
  @Get()
  @ApiOkResponse({ standardSchema: publicTaskSchema, isArray: true })
  findAll(@CurrentUser() userId: string, @Query({ schema: searchSchema }) query: Search) {
    return this.tasks.findAll(userId, query);
  }
  @Get(":id")
  @ApiOkResponse({ standardSchema: publicTaskSchema })
  findOne(@CurrentUser() userId: string, @Param({ schema: idSchema }) { id }: { id: string }) {
    return this.tasks.findOne(userId, id);
  }
  @Patch(":id")
  @ApiOkResponse({ standardSchema: publicTaskSchema })
  update(
    @CurrentUser() userId: string,
    @Param({ schema: idSchema }) { id }: { id: string },
    @Body({ schema: updateTaskSchema }) input: UpdateTask,
  ) {
    return this.tasks.update(userId, id, input);
  }
  @Delete(":id")
  @ApiNoContentResponse()
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param({ schema: idSchema }) { id }: { id: string }) {
    return this.tasks.remove(userId, id);
  }
}
