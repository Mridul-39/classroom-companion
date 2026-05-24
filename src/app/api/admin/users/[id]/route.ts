import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, UnauthorizedError } from "@/lib/auth";
import { cascadeDeleteUser } from "@/lib/adminActions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user: admin } = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You can't delete your own admin account." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await cascadeDeleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    console.error("Admin delete user failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
