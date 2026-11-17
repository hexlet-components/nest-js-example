import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectDrizzle } from "@nestjs/drizzle";
import { eq } from "drizzle-orm";
import { users } from "../database/schema.js";
import type { Database } from "../database/schema.js";
import type { Credentials } from "../contracts.js";
import { hashPassword } from "../auth/password.js";
@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: Database) {}
  async create(input: Credentials) {
    const passwordHash = await hashPassword(input.password);
    try {
      const [user] = await this.db
        .insert(users)
        .values({ email: input.email, passwordHash })
        .returning({ id: users.id, email: users.email });
      return user!;
    } catch (error) {
      if (
        (error as { cause?: { code?: string; constraint?: string } }).cause?.code === "23505" &&
        (error as { cause?: { constraint?: string } }).cause?.constraint === "users_email_unique"
      )
        throw new ConflictException("Email is already registered");
      throw error;
    }
  }
  async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async findOne(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException();
    return user;
  }
}
