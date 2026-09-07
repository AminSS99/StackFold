import { NextResponse } from 'next/server';
import { db } from '@platform/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  const { userId, amount } = await req.json();

  const invoice = await db.invoice.create({
    data: {
      userId,
      amount,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ invoice, stripeReady: !!stripe });
}
