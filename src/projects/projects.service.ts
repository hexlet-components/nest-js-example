import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDrizzle } from "@nestjs/drizzle";
import { and, eq, asc } from "drizzle-orm";
import { projects } from "../database/schema.js";
import type { Database } from "../database/schema.js";
import type { CreateProject, UpdateProject } from "../contracts.js";
@Injectable()
export class ProjectsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}
  async create(userId: string, input: CreateProject) {
    const [project] = await this.db
      .insert(projects)
      .values({ ...input, ownerId: userId })
      .returning();
    return project!;
  }
  findAll(userId: string) {
    return this.db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(asc(projects.id));
  }
  async findOne(userId: string, id: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, userId)));
    if (!project) throw new NotFoundException();
    return project;
  }
  async update(userId: string, id: string, input: UpdateProject) {
    const [project] = await this.db
      .update(projects)
      .set(input)
      .where(and(eq(projects.id, id), eq(projects.ownerId, userId)))
      .returning();
    if (!project) throw new NotFoundException();
    return project;
  }
  async remove(userId: string, id: string) {
    try {
      const [project] = await this.db
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.ownerId, userId)))
        .returning();
      if (!project) throw new NotFoundException();
    } catch (error) {
      if (["23503", "23001"].includes((error as { cause?: { code?: string } }).cause?.code ?? ""))
        throw new ConflictException("Project contains tasks");
      throw error;
    }
  }
}
