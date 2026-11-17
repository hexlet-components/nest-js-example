import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module.js";
import { TasksController } from "./tasks.controller.js";
import { ProjectTasksController } from "./project-tasks.controller.js";
import { TasksService } from "./tasks.service.js";
@Module({
  imports: [ProjectsModule],
  controllers: [TasksController, ProjectTasksController],
  providers: [TasksService],
})
export class TasksModule {}
