import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (id !== session.user.id) {
    return NextResponse.json({ error: 'You can only update your own profile' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, email, telegramUsername, schoolName } = body;

    // telegramId is intentionally excluded — that's set by the bot only.
    const user = await db.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        telegramUsername,
        schoolName,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
