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
  createProjectSchema,
  idSchema,
  publicProjectSchema,
  updateProjectSchema,
} from "../contracts.js";
import type { CreateProject, UpdateProject } from "../contracts.js";
import { ProjectsService } from "./projects.service.js";
@ApiBearerAuth()
@ApiProblemResponses(400, 401, 404, 500)
@Controller("projects")
@SerializeOptions({ schema: publicProjectSchema })
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}
  @Post()
  @ApiCreatedResponse({ standardSchema: publicProjectSchema })
  create(
    @CurrentUser() userId: string,
    @Body({ schema: createProjectSchema }) input: CreateProject,
  ) {
    return this.projects.create(userId, input);
  }
  @Get()
  @ApiOkResponse({ standardSchema: publicProjectSchema, isArray: true })
  findAll(@CurrentUser() userId: string) {
    return this.projects.findAll(userId);
  }
  @Get(":id")
  @ApiOkResponse({ standardSchema: publicProjectSchema })
  findOne(@CurrentUser() userId: string, @Param({ schema: idSchema }) { id }: { id: string }) {
    return this.projects.findOne(userId, id);
  }
  @Patch(":id")
  @ApiOkResponse({ standardSchema: publicProjectSchema })
  update(
    @CurrentUser() userId: string,
    @Param({ schema: idSchema }) { id }: { id: string },
    @Body({ schema: updateProjectSchema }) input: UpdateProject,
  ) {
    return this.projects.update(userId, id, input);
  }
  @Delete(":id")
  @ApiProblemResponses(409)
  @ApiNoContentResponse()
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param({ schema: idSchema }) { id }: { id: string }) {
    return this.projects.remove(userId, id);
  }
}
