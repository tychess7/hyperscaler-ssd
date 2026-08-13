import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { createSsdCandidates, deleteSsdCandidate, listSsdCandidates } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const candidateInput = z.object({
  manufacturer: z.enum(["Samsung", "SK hynix", "Micron", "KIOXIA", "SanDisk", "DapuStor"]),
  model: z.string().trim().min(1).max(128),
  formFactor: z.string().trim().max(32).nullable(),
  capacityGb: z.number().int().positive().max(1_000_000),
  pcieGen: z.string().trim().max(16).nullable(),
  nvmeVersion: z.string().trim().max(16).nullable(),
  readIops: z.number().int().nonnegative().max(2_000_000_000).nullable(),
  writeIops: z.number().int().nonnegative().max(2_000_000_000).nullable(),
  readMBps: z.number().int().nonnegative().max(2_000_000).nullable(),
  writeMBps: z.number().int().nonnegative().max(2_000_000).nullable(),
  dwpd: z.number().nonnegative().max(1000).nullable(),
  enduranceTbw: z.number().int().nonnegative().max(2_000_000_000).nullable(),
  powerActiveW: z.number().nonnegative().max(10000).nullable(),
  powerLossProtection: z.enum(["verified", "not_verified", "unknown"]),
  encryption: z.enum(["verified", "not_verified", "unknown"]),
  sourceFileName: z.string().trim().max(255).nullable(),
  sourceUrl: z.string().trim().url().max(2048).nullable(),
  notes: z.string().trim().max(10_000).nullable(),
});

function serializeCandidate(input: z.infer<typeof candidateInput>) {
  return {
    ...input,
    dwpd: input.dwpd === null ? null : input.dwpd.toFixed(2),
    powerActiveW: input.powerActiveW === null ? null : input.powerActiveW.toFixed(2),
  };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  ssdCandidate: router({
    list: protectedProcedure.query(({ ctx }) => listSsdCandidates(ctx.user.id)),
    create: protectedProcedure.input(candidateInput).mutation(async ({ ctx, input }) => {
      await createSsdCandidates(ctx.user.id, [serializeCandidate(input)]);
      return { success: true } as const;
    }),
    importMany: protectedProcedure.input(z.object({ candidates: z.array(candidateInput).min(1).max(200) })).mutation(async ({ ctx, input }) => {
      await createSsdCandidates(ctx.user.id, input.candidates.map(serializeCandidate));
      return { success: true, imported: input.candidates.length } as const;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteSsdCandidate(ctx.user.id, input.id);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
