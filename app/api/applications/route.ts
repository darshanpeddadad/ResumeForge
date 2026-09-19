import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedApplication } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { safeLog } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await db
      .select()
      .from(savedApplication)
      .where(eq(savedApplication.userId, session.user.id))
      .orderBy(desc(savedApplication.updatedAt));

    return NextResponse.json({ applications });
  } catch (error) {
    safeLog.error("Error fetching saved applications:", error);
    return NextResponse.json({ error: "Failed to fetch saved applications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobTitle,
      companyName,
      targetCountry = "US",
      atsScore = 0,
      status = "saved",
      resumeData,
      latexCode,
      coverLetter,
      outreach,
      notes,
    } = body;

    if (!jobTitle || !companyName) {
      return NextResponse.json(
        { error: "Job title and company name are required to save an application." },
        { status: 400 }
      );
    }

    const id = nanoid();
    const now = new Date();

    const [newApp] = await db
      .insert(savedApplication)
      .values({
        id,
        userId: session.user.id,
        jobTitle,
        companyName,
        targetCountry,
        atsScore: Math.round(Number(atsScore) || 0),
        status,
        resumeData: typeof resumeData === "object" ? JSON.stringify(resumeData) : resumeData,
        latexCode,
        coverLetter: typeof coverLetter === "object" ? JSON.stringify(coverLetter) : coverLetter,
        outreach: typeof outreach === "object" ? JSON.stringify(outreach) : outreach,
        notes: notes || "",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ success: true, application: newApp });
  } catch (error) {
    safeLog.error("Error saving application to vault:", error);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, jobTitle, companyName } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (status) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;
    if (jobTitle) updateFields.jobTitle = jobTitle;
    if (companyName) updateFields.companyName = companyName;

    const [updated] = await db
      .update(savedApplication)
      .set(updateFields)
      .where(
        and(
          eq(savedApplication.id, id),
          eq(savedApplication.userId, session.user.id)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    safeLog.error("Error updating application:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    await db
      .delete(savedApplication)
      .where(
        and(
          eq(savedApplication.id, id),
          eq(savedApplication.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    safeLog.error("Error deleting application from vault:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
