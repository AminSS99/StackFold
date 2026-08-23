import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmationEmail(to: string, orderId: string, total: number) {
  return await resend.emails.send({
    from: 'orders@stackfold-store.com',
    to,
    subject: `Order Confirmation #${orderId}`,
    html: `<p>Thank you for your order of $${total.toFixed(2)}!</p>`,
  });
}
