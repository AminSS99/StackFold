'use client';

import React, { useState } from 'react';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: params.id, quantity }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Product ID: {params.id}</h1>
      <button
        onClick={handleBuy}
        disabled={loading}
        className="mt-4 px-6 py-2 bg-indigo-600 rounded text-white"
      >
        {loading ? 'Processing...' : 'Buy Now'}
      </button>
    </div>
  );
}
