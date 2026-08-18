import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

const servers: ReturnType<typeof createServer>[] = [];

async function requestApp(path: string) {
  const server = createServer(createApp());
  servers.push(server);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) => {
          server.close(error => (error ? reject(error) : resolve()));
        })
    )
  );
});

describe("Vercel-compatible Express app", () => {
  it("registers the OAuth start route without binding its own port", async () => {
    const response = await requestApp("/api/oauth/start");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "OAuth start is not configured",
    });
  });

  it("keeps the tRPC endpoint on the reusable Express app", async () => {
    const response = await requestApp("/api/trpc/auth.me");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
