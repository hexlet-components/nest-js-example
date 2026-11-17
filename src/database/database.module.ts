import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DrizzleModule } from "@nestjs/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "./schema.js";
@Module({
  imports: [
    DrizzleModule.forRootAsync<typeof drizzle>({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        drizzle,
        connection: config.getOrThrow<string>("DATABASE_URL"),
        schema,
      }),
    }),
  ],
})
export class DatabaseModule {}
export type { Database } from "./schema.js";
