import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkIsAdmin, isUserAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = checkIsAdmin(session.user as any) || (await isUserAdmin(session.user.id));
    return NextResponse.json({ isAdmin: Boolean(isAdmin) });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
