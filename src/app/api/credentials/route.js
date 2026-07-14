import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/credentials — List all credentials for authenticated user
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites') === 'true';

    const where = { userId: session.user.id };
    if (category && category !== 'All') where.category = category;
    if (favorites) where.isFavorite = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { url: { contains: search } },
        { category: { contains: search } },
      ];
    }

    const credentials = await prisma.credential.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

// POST /api/credentials — Create a new credential
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { encryptedData, iv, name, url, category } = await request.json();

    if (!encryptedData || !iv || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const credential = await prisma.credential.create({
      data: {
        userId: session.user.id,
        encryptedData,
        iv,
        name,
        url: url || null,
        category: category || 'General',
      },
    });

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error('Create credential error:', error);
    return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
  }
}
