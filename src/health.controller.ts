import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/public.js";
@Controller("health")
export class HealthController {
  @Public() @Get() get() {
    return { status: "ok" };
  }
}
