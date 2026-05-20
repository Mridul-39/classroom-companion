import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    let settings = await db.appSettings.findUnique({
      where: { teacherId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = await db.appSettings.create({
        data: {
          teacherId,
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'teacherId is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { llmProvider, llmModel, encryptedApiKey } = body;

    const settings = await db.appSettings.upsert({
      where: { teacherId },
      update: {
        llmProvider,
        llmModel,
        encryptedApiKey, // TODO: encrypt this before saving in production
      },
      create: {
        teacherId,
        llmProvider,
        llmModel,
        encryptedApiKey, // TODO: encrypt this before saving in production
      }
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
