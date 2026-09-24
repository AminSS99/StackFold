import React from 'react';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, HardDrive } from 'lucide-react';
import { hasClerkKey } from '@/lib/cloud';

export function generateStaticParams() {
  return [{ 'sign-in': [] }];
}

export default function SignInPage() {
  if (!hasClerkKey()) {
    return (
      <div className="min-h-screen bg-[#070806] text-[#f6f7f2] flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-6 left-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[#a5aa9b] hover:text-[#f6c945] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Studio</span>
          </Link>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-[#2a2d24] bg-[#0d0f0c] p-8 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[#62d49b]/30 bg-[#62d49b]/10">
            <HardDrive className="h-5 w-5 text-[#62d49b]" />
          </div>
          <h1 className="mt-4 text-sm font-bold">Local mode — cloud sign-in disabled</h1>
          <p className="mt-2 text-xs leading-relaxed text-[#a5aa9b]">
            This instance runs local-first without Clerk configuration. Scanning, fixtures,
            graph inspection, Security Lab, and exports remain fully functional.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070806] text-[#f6f7f2] flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-[#a5aa9b] hover:text-[#f6c945] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Studio</span>
        </Link>
      </div>

      <div className="mb-8 flex flex-col items-center gap-2">
        <Logo size="lg" />
        <p className="text-xs text-[#a5aa9b]">Sign in to your Stackfold Cloud workspace</p>
      </div>

      <div className="w-full max-w-md flex justify-center">
        <SignIn
          appearance={{
            elements: {
              card: 'bg-[#0d0f0c] border border-[#2a2d24] shadow-2xl rounded-2xl',
              headerTitle: 'text-[#f6f7f2]',
              headerSubtitle: 'text-[#a5aa9b]',
              formButtonPrimary:
                'bg-[#f6c945] hover:bg-[#ffda67] text-[#070806] font-semibold text-xs transition-colors',
              formFieldInput:
                'bg-[#141611] border-[#2a2d24] text-[#f6f7f2] rounded-lg focus:border-[#f6c945]',
              formFieldLabel: 'text-[#a5aa9b] text-xs',
              footerActionLink: 'text-[#f6c945] hover:text-[#ffda67]',
              identityPreviewText: 'text-[#f6f7f2]',
              identityPreviewEditButton: 'text-[#f6c945]',
            },
          }}
        />
      </div>
    </div>
  );
}
