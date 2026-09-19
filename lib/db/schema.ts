import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Better Auth Core Tables ───

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── BYOK: AI Provider Settings ───

export const aiSettings = pgTable("ai_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'openai' | 'google'
  apiKey: text("api_key").notNull(), // encrypted
  model: text("model"), // optional: 'gpt-4o', 'gemini-3.6-flash', etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Generation Logs Audit ───

export const generationLog = pgTable("generation_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  type: text("type").notNull(), // 'resume' | 'cover_letter' | 'outreach'
  targetCountry: text("target_country"),
  provider: text("provider"),
  model: text("model"),
  status: text("status").notNull(), // 'success' | 'error'
  durationMs: text("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Career Suite: Saved Applications & Kanban ───

export const savedApplication = pgTable("saved_application", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  jobTitle: text("job_title").notNull(),
  companyName: text("company_name").notNull(),
  targetCountry: text("target_country").notNull().default("US"),
  atsScore: integer("ats_score").notNull().default(0),
  status: text("status").notNull().default("saved"), // 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'archived'
  resumeData: text("resume_data"), // Serialized JSON of tailored Resume
  latexCode: text("latex_code"),
  coverLetter: text("cover_letter"), // Serialized JSON of CoverLetterResult
  outreach: text("outreach"), // Serialized JSON of { coldEmail, coldDM }
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Platform System Announcements ───

export const systemAnnouncement = pgTable("system_announcement", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // 'info' | 'warning' | 'success'
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ───

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  aiSettings: many(aiSettings),
  generationLogs: many(generationLog),
  savedApplications: many(savedApplication),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  user: one(user, {
    fields: [aiSettings.userId],
    references: [user.id],
  }),
}));

export const generationLogRelations = relations(generationLog, ({ one }) => ({
  user: one(user, {
    fields: [generationLog.userId],
    references: [user.id],
  }),
}));

export const savedApplicationRelations = relations(savedApplication, ({ one }) => ({
  user: one(user, {
    fields: [savedApplication.userId],
    references: [user.id],
  }),
}));
