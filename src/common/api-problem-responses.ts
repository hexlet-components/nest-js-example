import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger";
import { STATUS_CODES } from "node:http";
import { z } from "zod";
import { problemDetailsSchema } from "../contracts.js";
// The shared schema uses only JSON Schema keywords supported by OpenAPI 3.0.
const schema = z.toJSONSchema(problemDetailsSchema, { target: "openapi-3.0" }) as SchemaObject;
export const ApiProblemResponses = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: STATUS_CODES[status],
        content: { "application/problem+json": { schema } },
      }),
    ),
  );
