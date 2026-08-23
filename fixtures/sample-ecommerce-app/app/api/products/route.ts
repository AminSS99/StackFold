import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createProductSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  categoryId: z.string(),
  inventory: z.number().int().nonnegative().default(0),
});

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
    });
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        title: validated.title,
        description: validated.description,
        price: validated.price,
        categoryId: validated.categoryId,
        inventory: validated.inventory,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid product data' }, { status: 400 });
  }
}
