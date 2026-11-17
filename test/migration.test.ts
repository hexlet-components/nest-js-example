import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { expect, it } from "vitest";
import { verifyPassword } from "../src/auth/password.js";
const run = promisify(execFile);
it("upgrades existing projects and tasks without replacing their records", async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const namespace = `migration_${randomUUID().replaceAll("-", "")}`;
  const projectId = randomUUID(),
    taskId = randomUUID(),
    orphanId = randomUUID(),
    legacyId = randomUUID();
  try {
    await client.query(`CREATE SCHEMA ${namespace}`);
    await client.query(`SET search_path TO ${namespace}`);
    await client.query(`CREATE TABLE projects (id UUID PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '');
   CREATE TABLE tasks (id UUID PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'todo',project_id UUID REFERENCES projects(id) ON DELETE RESTRICT)`);
    await client.query("INSERT INTO projects(id,name)VALUES($1,$2)", [
      projectId,
      "Existing project",
    ]);
    await client.query("INSERT INTO tasks(id,title,project_id)VALUES($1,$2,$3),($4,$5,NULL)", [
      taskId,
      "Existing task",
      projectId,
      orphanId,
      "Task without project",
    ]);
    await client.query(
      await readFile(new URL("../migrations/prepare-users.sql", import.meta.url), "utf8"),
    );
    const databaseUrl = new URL(process.env.DATABASE_URL!);
    databaseUrl.searchParams.set("options", `-c search_path=${namespace}`);
    const { stdout } = await run(process.execPath, ["dist/seed-owner.js"], {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl.toString(),
        OWNER_EMAIL: "assigned@example.com",
        OWNER_PASSWORD: "designated-owner-password",
      },
    });
    const ownerId = stdout.trim();
    expect(ownerId).toMatch(/^[a-f0-9-]{36}$/);
    const owner = await client.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id=$1",
      [ownerId],
    );
    expect(await verifyPassword(owner.rows[0]!.password_hash, "designated-owner-password")).toBe(
      true,
    );
    const script = await readFile(
      new URL("../migrations/assign-owners.sql", import.meta.url),
      "utf8",
    );
    // psql substitutes these two UUID variables before submitting the same SQL.
    await client.query(
      script
        .replaceAll(":'owner_id'", `'${ownerId}'`)
        .replaceAll(":'legacy_project_id'", `'${legacyId}'`),
    );
    const projects = await client.query("SELECT id,name,owner_id FROM projects ORDER BY name");
    expect(projects.rows).toContainEqual({
      id: projectId,
      name: "Existing project",
      owner_id: ownerId,
    });
    expect(projects.rows).toContainEqual({
      id: legacyId,
      name: "Imported tasks",
      owner_id: ownerId,
    });
    const tasks = await client.query("SELECT id,title,project_id FROM tasks ORDER BY title");
    expect(tasks.rows).toEqual([
      { id: taskId, title: "Existing task", project_id: projectId },
      { id: orphanId, title: "Task without project", project_id: legacyId },
    ]);
    const constraints = await client.query(
      "SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema=$1 AND ((table_name='projects' AND column_name='owner_id')OR(table_name='tasks'AND column_name='project_id'))",
      [namespace],
    );
    expect(constraints.rows).toHaveLength(2);
    for (const column of constraints.rows) expect(column.is_nullable).toBe("NO");
  } finally {
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`);
    await client.end();
  }
});
