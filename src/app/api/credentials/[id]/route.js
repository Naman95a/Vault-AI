import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/credentials/[id] — Get single credential
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const credential = await prisma.credential.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ credential });
  } catch (error) {
    console.error('Get credential error:', error);
    return NextResponse.json({ error: 'Failed to fetch credential' }, { status: 500 });
  }
}

// PUT /api/credentials/[id] — Update credential
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.credential.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData = {};

    if (body.encryptedData) updateData.encryptedData = body.encryptedData;
    if (body.iv) updateData.iv = body.iv;
    if (body.name) updateData.name = body.name;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.category) updateData.category = body.category;
    if (body.isFavorite !== undefined) updateData.isFavorite = body.isFavorite;

    const credential = await prisma.credential.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ credential });
  } catch (error) {
    console.error('Update credential error:', error);
    return NextResponse.json({ error: 'Failed to update credential' }, { status: 500 });
  }
}

// DELETE /api/credentials/[id] — Delete credential
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.credential.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    await prisma.credential.delete({ where: { id } });

    return NextResponse.json({ message: 'Credential deleted' });
  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json({ error: 'Failed to delete credential' }, { status: 500 });
  }
}
