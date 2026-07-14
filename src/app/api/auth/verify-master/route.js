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

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json({ error: 'User not found or no master password set' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid master password' }, { status: 401 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Verify master password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
