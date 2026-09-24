import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/cloud/AuthProvider';

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
      <body className="bg-[#070806] text-[#f6f7f2] antialiased overflow-hidden selection:bg-[#f6c945] selection:text-[#070806]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
