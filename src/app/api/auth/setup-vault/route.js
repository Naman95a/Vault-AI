import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { masterSalt, password } = await request.json();

    if (!masterSalt || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { masterSalt, hashedPassword },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Setup vault error:', error);
    return NextResponse.json({ error: 'Failed to setup vault' }, { status: 500 });
  }
}
