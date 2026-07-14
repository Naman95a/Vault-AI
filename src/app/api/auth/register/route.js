import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash the password for authentication
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate a random salt for PBKDF2 key derivation (client-side encryption)
    const saltArray = new Uint8Array(32);
    crypto.getRandomValues(saltArray);
    const masterSalt = Array.from(saltArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        hashedPassword,
        masterSalt,
      },
    });

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
