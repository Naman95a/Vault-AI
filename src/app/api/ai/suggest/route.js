import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import { getPasswordSuggestion } from '@/lib/gemini';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { context } = await request.json();

    const suggestion = await getPasswordSuggestion(context || 'general account');

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('AI suggest error:', error);
    return NextResponse.json({ error: 'Suggestion failed' }, { status: 500 });
  }
}
