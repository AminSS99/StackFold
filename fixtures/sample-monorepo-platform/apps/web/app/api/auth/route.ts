import { NextResponse } from 'next/server';
import { db } from '@platform/db';
import { generateToken } from '@platform/utils';

export async function POST(req: Request) {
  const { email } = await req.json();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const token = generateToken(user.id);
  return NextResponse.json({ token });
}
