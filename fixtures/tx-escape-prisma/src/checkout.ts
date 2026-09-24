import { prisma } from './database';
import { sendReceipt } from './notifications';

export async function completeCheckout(userEmail: string) {
  return prisma.$transaction(async tx => {
    const order = await tx.order.create({
      data: { userEmail, status: 'PAID' },
    });

    await sendReceipt(userEmail, order.id);

    return order;
  });
}
