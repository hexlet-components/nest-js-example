import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDrizzle } from "@nestjs/drizzle";
import { and, asc, eq, ilike, inArray, DrizzleQueryError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { tasks, projects } from "../database/schema.js";
import type { Database } from "../database/schema.js";
import { ProjectsService } from "../projects/projects.service.js";
import type { CreateTask, Search, UpdateTask } from "../contracts.js";
@Injectable()
export class TasksService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly projectService: ProjectsService,
  ) {}
  private ownedProjects(userId: string) {
    return this.db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, userId));
  }
  async create(userId: string, input: CreateTask) {
    await this.projectService.findOne(userId, input.projectId);
    try {
      const [task] = await this.db.insert(tasks).values(input).returning();
      return task!;
    } catch (error) {
      this.throwProjectReferenceError(error);
    }
  }
  async findAll(userId: string, query: Search, projectId?: string) {
    if (projectId) await this.projectService.findOne(userId, projectId);
    return this.db
      .select()
      .from(tasks)
      .where(
        and(
          inArray(tasks.projectId, this.ownedProjects(userId)),
          projectId ? eq(tasks.projectId, projectId) : undefined,
          query.status ? eq(tasks.status, query.status) : undefined,
          query.q ? ilike(tasks.title, `%${query.q.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
        ),
      )
      .orderBy(asc(tasks.title), asc(tasks.id))
      .limit(query.limit)
      .offset(query.offset);
  }
  async findOne(userId: string, id: string) {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), inArray(tasks.projectId, this.ownedProjects(userId))));
    if (!task) throw new NotFoundException();
    return task;
  }
  async update(userId: string, id: string, input: UpdateTask) {
    if (input.projectId) await this.projectService.findOne(userId, input.projectId);
    try {
      const [task] = await this.db
        .update(tasks)
        .set(input)
        .where(and(eq(tasks.id, id), inArray(tasks.projectId, this.ownedProjects(userId))))
        .returning();
      if (!task) throw new NotFoundException();
      return task;
    } catch (error) {
      this.throwProjectReferenceError(error);
    }
  }
  private throwProjectReferenceError(error: unknown): never {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof DatabaseError &&
      error.cause.code === "23503" &&
      ["tasks_project_id_fkey", "tasks_project_id_projects_id_fk"].includes(
        error.cause.constraint ?? "",
      )
    ) {
      throw new NotFoundException("Project not found");
    }
    throw error;
  }
  async remove(userId: string, id: string) {
    const [task] = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), inArray(tasks.projectId, this.ownedProjects(userId))))
      .returning();
    if (!task) throw new NotFoundException();
  }
}
