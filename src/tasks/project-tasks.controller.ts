import { ApiProblemResponses } from "../common/api-problem-responses.js";
import { Body, Controller, Get, Param, Post, Query, SerializeOptions } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.js";
import { nestedTaskSchema, projectIdSchema, publicTaskSchema, searchSchema } from "../contracts.js";
import type { CreateTask, Search } from "../contracts.js";
import { TasksService } from "./tasks.service.js";
@ApiBearerAuth()
@ApiProblemResponses(400, 401, 404, 500)
@Controller("projects/:projectId/tasks")
@SerializeOptions({ schema: publicTaskSchema })
export class ProjectTasksController {
  constructor(private readonly tasks: TasksService) {}
  @Post()
  @ApiCreatedResponse({ standardSchema: publicTaskSchema })
  create(
    @CurrentUser() userId: string,
    @Param({ schema: projectIdSchema }) { projectId }: { projectId: string },
    @Body({ schema: nestedTaskSchema }) input: Omit<CreateTask, "projectId">,
  ) {
    return this.tasks.create(userId, { ...input, projectId });
  }
  @Get()
  @ApiOkResponse({ standardSchema: publicTaskSchema, isArray: true })
  findAll(
    @CurrentUser() userId: string,
    @Param({ schema: projectIdSchema }) { projectId }: { projectId: string },
    @Query({ schema: searchSchema }) query: Search,
  ) {
    return this.tasks.findAll(userId, query, projectId);
  }
}
