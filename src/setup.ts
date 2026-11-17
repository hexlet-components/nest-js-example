import { StandardSchemaSerializerInterceptor, StandardSchemaValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, Reflector } from "@nestjs/core";
import type { NestNodeApplication } from "@nestjs/platform-node";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ProblemFilter } from "./common/problem.filter.js";
import { TimingInterceptor } from "./common/diagnostics.js";
export function setup(app: NestNodeApplication) {
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new ProblemFilter(app.get(HttpAdapterHost)));
  app.useGlobalInterceptors(
    new TimingInterceptor(),
    new StandardSchemaSerializerInterceptor(app.get(Reflector)),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("Task manager").setVersion("1").addBearerAuth().build(),
  );
  SwaggerModule.setup("api", app, document);
  return document;
}
