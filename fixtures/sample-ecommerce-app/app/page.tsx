import React from 'react';
import { prisma } from '@/lib/prisma';

export default async function HomePage() {
  const products = await prisma.product.findMany({
    take: 10,
    include: {
      category: true,
    },
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Featured Products</h1>
      <div className="grid grid-cols-3 gap-6">
        {products.map((product: any) => (
          <div key={product.id} className="p-4 border rounded">
            <h2 className="text-xl">{product.title}</h2>
            <p className="text-emerald-400">${product.price.toString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
