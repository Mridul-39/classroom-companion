import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { unsuspendUser } from "@/lib/adminActions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!target.suspendedAt) {
      return NextResponse.json({ error: "User is not suspended." }, { status: 400 });
    }

    await unsuspendUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Admin unsuspend user failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
