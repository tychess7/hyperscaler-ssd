import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User-owned SSD candidate records. Nullable fields are intentionally preserved
 * as "not verified" rather than being inferred from an incomplete data sheet.
 */
export const ssdCandidates = mysqlTable(
  "ssdCandidates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    manufacturer: varchar("manufacturer", { length: 64 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    formFactor: varchar("formFactor", { length: 32 }),
    capacityGb: int("capacityGb").notNull(),
    pcieGen: varchar("pcieGen", { length: 16 }),
    nvmeVersion: varchar("nvmeVersion", { length: 16 }),
    readIops: int("readIops"),
    writeIops: int("writeIops"),
    readMBps: int("readMBps"),
    writeMBps: int("writeMBps"),
    dwpd: decimal("dwpd", { precision: 6, scale: 2 }),
    enduranceTbw: int("enduranceTbw"),
    powerActiveW: decimal("powerActiveW", { precision: 6, scale: 2 }),
    powerLossProtection: mysqlEnum("powerLossProtection", ["verified", "not_verified", "unknown"]).default("unknown").notNull(),
    encryption: mysqlEnum("encryption", ["verified", "not_verified", "unknown"]).default("unknown").notNull(),
    sourceFileName: varchar("sourceFileName", { length: 255 }),
    sourceUrl: varchar("sourceUrl", { length: 2048 }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("ssdCandidates_user_idx").on(table.userId)],
);

export type SsdCandidate = typeof ssdCandidates.$inferSelect;
export type InsertSsdCandidate = typeof ssdCandidates.$inferInsert;
