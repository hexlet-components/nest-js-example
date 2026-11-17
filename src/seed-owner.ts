import pg from "pg";
import { registrationSchema } from "./contracts.js";
import { hashPassword, verifyPassword } from "./auth/password.js";
const input = registrationSchema.parse({
  email: process.env.OWNER_EMAIL,
  password: process.env.OWNER_PASSWORD,
});
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const existing = await client.query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [input.email],
  );
  const user = existing.rows[0];
  if (user) {
    if (!(await verifyPassword(user.password_hash, input.password)))
      throw new Error("The owner email exists with another password");
    console.log(user.id);
  } else {
    const passwordHash = await hashPassword(input.password);
    const inserted = await client.query<{ id: string }>(
      "INSERT INTO users (email,password_hash) VALUES ($1,$2) RETURNING id",
      [input.email, passwordHash],
    );
    console.log(inserted.rows[0]!.id);
  }
} finally {
  await client.end();
}
