import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const { user } = session;
  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      schoolName: user.schoolName,
      telegramUsername: user.telegramUsername,
      telegramId: user.telegramId,
      isAdmin: isAdmin(user),
    },
  });
}
