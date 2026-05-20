import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { firstName, lastName, email, telegramUsername, telegramId, schoolName } = body;

    const user = await db.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        telegramUsername,
        telegramId,
        schoolName,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
