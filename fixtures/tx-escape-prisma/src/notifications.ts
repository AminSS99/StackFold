import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceipt(to: string, orderId: string) {
  return resend.emails.send({
    from: 'orders@example.com',
    to,
    subject: `Receipt ${orderId}`,
    text: 'Payment received',
  });
}
