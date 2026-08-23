import React from 'react';

export const metadata = {
  title: 'StackFold Store',
  description: 'Next.js E-Commerce Reference Store',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-slate-950 text-slate-50">{children}</main>
      </body>
    </html>
  );
}
