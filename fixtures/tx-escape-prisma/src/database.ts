export const prisma = {
  async $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return callback({ order: { create: async (input: unknown) => input } });
  },
};
