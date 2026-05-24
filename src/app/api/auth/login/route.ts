import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const user = await db.user.findFirst({ where: { email: normalized } });

    // Use a constant-ish error so we don't leak which half is wrong.
    const invalid = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    if (!user || !user.passwordHash) {
      return invalid;
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return invalid;

    if (user.suspendedAt) {
      return NextResponse.json(
        { error: 'This account is suspended. Contact your administrator.' },
        { status: 403 }
      );
    }

    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
