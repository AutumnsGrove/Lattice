import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const GET: RequestHandler = async () => {
  return json({
    status: "healthy",
    service: "grove-meadow",
    checks: [{ name: "worker_alive", status: "pass" }],
    timestamp: new Date().toISOString(),
  });
};
