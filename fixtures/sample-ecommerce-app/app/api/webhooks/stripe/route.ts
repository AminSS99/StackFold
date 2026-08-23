import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook configuration' }, { status: 400 });
  }

  try {
    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      // Update order status in database
      const order = await prisma.order.create({
        data: {
          userId: session.customer_details?.email || 'anonymous',
          totalAmount: session.amount_total ? session.amount_total / 100 : 0,
          status: 'PAID',
          stripePaymentIntentId: session.payment_intent as string,
        },
      });

      // Send confirmation email
      if (session.customer_details?.email) {
        await sendOrderConfirmationEmail(
          session.customer_details.email,
          order.id,
          Number(order.totalAmount)
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }
}
