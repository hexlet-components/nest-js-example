import "dotenv/config";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
let child: ChildProcess | undefined;
let output = "";
const baseUrl = "http://127.0.0.1:55433";
async function start() {
  output = "";
  child = spawn(process.execPath, ["dist/main.js"], {
    env: { ...process.env, PORT: "55433" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout!.on("data", (data) => {
    output += String(data);
  });
  child.stderr!.on("data", (data) => {
    output += String(data);
  });
  const deadline = performance.now() + 10000;
  while (performance.now() < deadline) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${baseUrl}/health`)).ok) return;
    } catch {}
    await setTimeout(50);
  }
  throw new Error(`Application did not start: ${output}`);
}
async function stop() {
  if (child && child.exitCode === null) {
    const closed = once(child, "close");
    child.kill("SIGTERM");
    await closed;
  }
  child = undefined;
}
afterEach(stop);
it("runs the ESM build, preserves tasks across restart and exits on SIGTERM", async () => {
  await start();
  const email = `${randomUUID()}@example.com`;
  const user = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "correct-password-123" }),
  });
  expect(user.status).toBe(201);
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "correct-password-123" }),
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { "content-type": "application/json", authorization: `Bearer ${accessToken}` };
  const project = await fetch(`${baseUrl}/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Production check" }),
  });
  const { id: projectId } = (await project.json()) as { id: string };
  const created = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title: "Survive restart", projectId }),
  });
  expect(created.status).toBe(201);
  const { id } = (await created.json()) as { id: string };
  const document = await fetch(`${baseUrl}/api-json`);
  expect(document.status).toBe(200);
  await stop();
  await start();
  const saved = await fetch(`${baseUrl}/tasks/${id}`, { headers });
  expect(saved.status).toBe(200);
  expect(await saved.json()).toMatchObject({ title: "Survive restart", projectId });
  await stop();
}, 15000);
