import { auth } from "@/lib/auth";
import { ensureAdminUserExists } from "@/lib/admin";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const { GET: authGet, POST: authPost } = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  await ensureAdminUserExists().catch(() => {});
  return authGet(req);
}

export async function POST(req: NextRequest) {
  await ensureAdminUserExists().catch(() => {});
  return authPost(req);
}
