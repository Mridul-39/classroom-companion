import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const teacherId = session.user.id;

  try {
    let settings = await db.appSettings.findUnique({
      where: { teacherId },
    });

    if (!settings) {
      settings = await db.appSettings.create({
        data: { teacherId },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const teacherId = session.user.id;

  try {
    const body = await request.json();
    const { llmProvider, llmModel, encryptedApiKey } = body;

    const settings = await db.appSettings.upsert({
      where: { teacherId },
      update: {
        llmProvider,
        llmModel,
        encryptedApiKey,
      },
      create: {
        teacherId,
        llmProvider,
        llmModel,
        encryptedApiKey,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
