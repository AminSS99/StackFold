import React from 'react';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stackfold — Visual Project Intelligence & Architecture Control Center',
  description: 'Interactive visual system map for modern TypeScript, Next.js, and Prisma codebases.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-slate-100 antialiased overflow-hidden selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
