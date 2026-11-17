import "reflect-metadata";
import "dotenv/config";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { NodeAdapter } from "@nestjs/platform-node";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { getDrizzleToken } from "@nestjs/drizzle";
import { sql, eq, DrizzleQueryError } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { AppModule } from "../src/app.module.js";
import { setup } from "../src/setup.js";
import type { Database } from "../src/database/schema.js";
import { DatabaseError } from "pg";
import { Logger } from "@nestjs/common";
import { ProjectsService } from "../src/projects/projects.service.js";
import { projects, tasks } from "../src/database/schema.js";
import { problemDetailsSchema } from "../src/contracts.js";
import { UsersService } from "../src/users/users.service.js";

describe("Task manager on PostgreSQL", () => {
  let app: NestNodeApplication;
  let db: Database;
  let document: ReturnType<typeof setup>;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<NestNodeApplication>(new NodeAdapter(), { logger: false });
    document = setup(app);
    await app.init();
    db = app.get<Database>(getDrizzleToken());
  });
  afterEach(() => vi.restoreAllMocks());
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE tasks,projects,users CASCADE`);
  });
  afterAll(async () => {
    await app.close();
  });
  async function register(email = "ada@example.com") {
    const registered = await app.inject({
      method: "POST",
      url: "/users",
      payload: { email, password: "correct-password-123" },
    });
    expect(registered.statusCode).toBe(201);
    expect(registered.json()).toEqual({ id: expect.any(String), email });
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "correct-password-123" },
    });
    expect(login.statusCode).toBe(200);
    return { authorization: `Bearer ${login.json().accessToken}` };
  }
  async function project(headers: Record<string, string>, name = "Learning") {
    const response = await app.inject({
      method: "POST",
      url: "/projects",
      headers,
      payload: { name },
    });
    expect(response.statusCode).toBe(201);
    return response.json().id as string;
  }
  it("serves health, validates input and returns a safe conflict", async () => {
    const health = await app.inject("/health");
    expect(health.json()).toEqual({ status: "ok" });
    expect(health.headers["x-request-id"]).toBeTypeOf("string");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/users",
          payload: { email: "bad", password: "short" },
        })
      ).statusCode,
    ).toBe(400);
    await register();
    const duplicate = await app.inject({
      method: "POST",
      url: "/users",
      payload: { email: "ada@example.com", password: "correct-password-123" },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.headers["content-type"]).toContain("application/problem+json");
    expect(duplicate.body).not.toContain("password_hash");
  });
  it("checks bearer signatures, expiry and profile serialization", async () => {
    const headers = await register();
    expect((await app.inject({ url: "/users/me", headers })).json()).toEqual({
      id: expect.any(String),
      email: "ada@example.com",
    });
    expect((await app.inject("/users/me")).statusCode).toBe(401);
    const forged = new JwtService({ secret: "another-secret-value-that-is-32-characters" }).sign({
      sub: randomUUID(),
    });
    expect(
      (await app.inject({ url: "/users/me", headers: { authorization: `Bearer ${forged}` } }))
        .statusCode,
    ).toBe(401);
    const expired = app.get(JwtService).sign({ sub: randomUUID() }, { expiresIn: -1 });
    expect(
      (await app.inject({ url: "/users/me", headers: { authorization: `Bearer ${expired}` } }))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/auth/login",
          payload: { email: "ada@example.com", password: "incorrect-password" },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("performs CRUD without resetting omitted PATCH fields", async () => {
    const headers = await register();
    const projectId = await project(headers);
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: { title: "Read Nest", description: "Keep this", projectId },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/tasks/${id}`,
          headers,
          payload: { status: "done" },
        })
      ).json(),
    ).toMatchObject({ title: "Read Nest", description: "Keep this", status: "done" });
    expect(
      (await app.inject({ method: "PATCH", url: `/tasks/${id}`, headers, payload: {} })).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/tasks",
          headers,
          payload: { title: "x", projectId, ownerId: randomUUID() },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers })).statusCode,
    ).toBe(409);
    const deleted = await app.inject({ method: "DELETE", url: `/tasks/${id}`, headers });
    expect(deleted.statusCode).toBe(204);
    expect(deleted.body).toBe("");
    expect((await app.inject({ url: `/tasks/${id}`, headers })).statusCode).toBe(404);
    expect(
      (await app.inject({ method: "DELETE", url: `/projects/${projectId}`, headers })).statusCode,
    ).toBe(204);
  });
  it("isolates two owners, nested creation and search", async () => {
    const ada = await register();
    const grace = await register("grace@example.com");
    const adaProject = await project(ada);
    const graceProject = await project(grace);
    const created = await app.inject({
      method: "POST",
      url: `/projects/${adaProject}/tasks`,
      headers: ada,
      payload: { title: "Read Nest" },
    });
    expect(created.statusCode).toBe(201);
    const { id } = created.json();
    for (const method of ["GET", "PATCH", "DELETE"] as const) {
      const response = await app.inject({
        method,
        url: `/tasks/${id}`,
        headers: grace,
        ...(method === "PATCH" ? { payload: { title: "stolen" } } : {}),
      });
      expect(response.statusCode).toBe(404);
    }
    expect(
      (
        await app.inject({
          method: "PATCH",
          url: `/tasks/${id}`,
          headers: ada,
          payload: { projectId: graceProject },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ url: `/projects/${adaProject}/tasks`, headers: grace })).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({ url: "/tasks?q=Nest&status=todo&limit=1&offset=0", headers: ada })
      ).json(),
    ).toHaveLength(1);
    expect((await app.inject({ url: "/tasks?q=Nest", headers: grace })).json()).toEqual([]);
    expect((await app.inject({ url: "/tasks?limit=zero", headers: ada })).statusCode).toBe(400);
    expect((await app.inject({ url: "/tasks/not-a-uuid", headers: ada })).statusCode).toBe(400);
  });
  it("generates OpenAPI from the same request and response schemas", () => {
    const body = document.paths["/users"]!.post!.requestBody as {
      content: Record<string, { schema: { properties: Record<string, unknown> } }>;
    };
    expect(body.content["application/json"]!.schema.properties).toHaveProperty("password");
    const response = document.paths["/users"]!.post!.responses["201"] as {
      content: Record<string, { schema: { properties: Record<string, unknown> } }>;
    };
    expect(response.content["application/json"]!.schema.properties).toHaveProperty("email");
    expect(response.content["application/json"]!.schema.properties).not.toHaveProperty(
      "passwordHash",
    );
    expect(document.components!.securitySchemes).toHaveProperty("bearer");
  });
  it("converts invalid service responses to a safe 500", async () => {
    const headers = await register();
    const service = app.get(UsersService);
    const original = service.findOne.bind(service);
    service.findOne = async () => ({
      id: "invalid",
      email: "secret@example.com",
      passwordHash: "secret-hash",
    });
    try {
      const response = await app.inject({ url: "/users/me", headers });
      expect(response.statusCode).toBe(500);
      expect(response.body).not.toContain("secret-hash");
      expect(response.body).not.toContain("Serialization");
    } finally {
      service.findOne = original;
    }
  });
  it("returns 404 if a checked project disappears before task creation", async () => {
    const headers = await register();
    const projectId = await project(headers);
    const service = app.get(ProjectsService);
    const findOne = service.findOne.bind(service);
    vi.spyOn(service, "findOne").mockImplementationOnce(async (userId, id) => {
      const found = await findOne(userId, id);
      await db.delete(projects).where(eq(projects.id, id));
      return found;
    });
    const response = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: { title: "Racing create", projectId },
    });
    expect(response.statusCode).toBe(404);
    expect(await db.select().from(tasks)).toEqual([]);
  });
  it("returns 404 and preserves the source task if the checked transfer target disappears", async () => {
    const headers = await register();
    const source = await project(headers, "Source");
    const target = await project(headers, "Target");
    const created = await app.inject({
      method: "POST",
      url: "/tasks",
      headers,
      payload: { title: "Keep original", projectId: source },
    });
    const { id } = created.json();
    const service = app.get(ProjectsService);
    const findOne = service.findOne.bind(service);
    vi.spyOn(service, "findOne").mockImplementationOnce(async (userId, projectId) => {
      const found = await findOne(userId, projectId);
      await db.delete(projects).where(eq(projects.id, projectId));
      return found;
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/tasks/${id}`,
      headers,
      payload: { projectId: target },
    });
    expect(response.statusCode).toBe(404);
    expect((await app.inject({ url: `/tasks/${id}`, headers })).json()).toMatchObject({
      title: "Keep original",
      projectId: source,
    });
  });
  it("keeps safe technical causes in logs and excludes SQL, values, passwords and tokens", async () => {
    const headers = await register();
    const service = app.get(UsersService);
    const log = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    const cause = new DatabaseError("password=secret-password", 0, "error");
    cause.code = "08006";
    const errors = [
      new DrizzleQueryError(
        "SELECT password_hash FROM users WHERE token=$1",
        ["secret-token"],
        cause,
      ),
      new TypeError("secret-password secret-token unexpected response"),
    ];
    const records: Array<{ error: { name: string; frames: string[]; code?: string } }> = [];
    for (const error of errors) {
      vi.spyOn(service, "findOne").mockRejectedValueOnce(error);
      const response = await app.inject({ url: "/users/me", headers });
      expect(response.statusCode).toBe(500);
      expect(problemDetailsSchema.parse(response.json()).requestId).toBe(
        response.headers["x-request-id"],
      );
      const record = log.mock.calls.at(-1)![0] as {
        error: { name: string; frames: string[]; code?: string };
      };
      records.push(record);
      const text = JSON.stringify(record) + response.body;
      for (const secret of [
        "SELECT",
        "password_hash",
        "secret-password",
        "secret-token",
        headers.authorization,
      ])
        expect(text).not.toContain(secret);
      expect(record.error.frames.length).toBeGreaterThan(0);
    }
    expect(records[0]!.error).toMatchObject({ name: "DrizzleQueryError", code: "08006" });
    expect(records[1]!.error.name).toBe("TypeError");
  });
  it("documents Problem Details for actual registration, login, profile and nested errors", async () => {
    const headers = await register();
    const projectId = await project(headers);
    const cases = [
      {
        path: "/users",
        method: "post",
        status: 400,
        request: { method: "POST", url: "/users", payload: { email: "bad", password: "short" } },
      },
      {
        path: "/users",
        method: "post",
        status: 409,
        request: {
          method: "POST",
          url: "/users",
          payload: { email: "ada@example.com", password: "correct-password-123" },
        },
      },
      { path: "/users/me", method: "get", status: 401, request: { url: "/users/me" } },
      {
        path: "/auth/login",
        method: "post",
        status: 400,
        request: { method: "POST", url: "/auth/login", payload: {} },
      },
      {
        path: "/auth/login",
        method: "post",
        status: 401,
        request: {
          method: "POST",
          url: "/auth/login",
          payload: { email: "ada@example.com", password: "incorrect-password" },
        },
      },
      {
        path: "/projects/{projectId}/tasks",
        method: "get",
        status: 401,
        request: { url: `/projects/${projectId}/tasks` },
      },
      {
        path: "/projects/{projectId}/tasks",
        method: "get",
        status: 404,
        request: { url: `/projects/${randomUUID()}/tasks`, headers },
      },
      {
        path: "/projects/{projectId}/tasks",
        method: "post",
        status: 400,
        request: {
          method: "POST",
          url: `/projects/${projectId}/tasks`,
          headers,
          payload: { title: "" },
        },
      },
    ];
    for (const example of cases) {
      const response = await app.inject(
        example.request as Parameters<NestNodeApplication["inject"]>[0],
      );
      expect(response.statusCode).toBe(example.status);
      expect(response.headers["content-type"]).toContain("application/problem+json");
      const actual = problemDetailsSchema.parse(response.json());
      expect(actual.status).toBe(example.status);
      const operation = document.paths[example.path]![example.method as "get" | "post"]!;
      const documented = operation.responses[String(example.status)] as {
        content: Record<
          string,
          { schema: { properties: Record<string, unknown>; required: string[] } }
        >;
      };
      const schema = documented.content["application/problem+json"]!.schema;
      for (const field of ["type", "title", "status", "detail", "instance", "requestId"]) {
        expect(schema.properties).toHaveProperty(field);
        expect(schema.required).toContain(field);
        expect(actual).toHaveProperty(field);
      }
    }
  });
});
