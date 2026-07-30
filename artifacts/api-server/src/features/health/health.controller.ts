import { Request, Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

export class HealthController {
  public check(req: Request, res: Response): void {
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  }
}
