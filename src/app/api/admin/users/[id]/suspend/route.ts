import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { suspendUser } from "@/lib/adminActions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user: admin } = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You can't suspend your own admin account." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.suspendedAt) {
      return NextResponse.json({ error: "User is already suspended." }, { status: 400 });
    }

    await suspendUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Admin suspend user failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
