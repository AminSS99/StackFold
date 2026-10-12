'use client';

import React from 'react';
import Link from 'next/link';
import { useUser, UserButton, SignInButton } from '@clerk/nextjs';
import { User, LogIn } from 'lucide-react';
import { isCloudEnabled } from '@/lib/cloud';
import { LocalModeBadge } from '@/components/cloud/LocalModeBadge';

export function UserAuthButton() {
  if (!isCloudEnabled()) {
    return <LocalModeBadge />;
  }

  return <AuthContent />;
}

function AuthContent() {
  const { isSignedIn, user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="w-8 h-8 rounded-full bg-[#1b1e17] animate-pulse border border-[#2a2d24]" />
    );
  }

  if (isSignedIn && user) {
    return (
      <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#141611] transition-colors">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-7 h-7 rounded-full border border-[#f6c945]/40',
            },
          }}
        />
        <div className="hidden md:flex flex-col min-w-0 text-left">
          <span className="text-xs font-semibold text-[#f6f7f2] truncate">
            {user.firstName || user.username || 'User'}
          </span>
          <span className="text-[10px] text-[#74796d] truncate">
            {user.primaryEmailAddress?.emailAddress || 'Pro Account'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="w-full flex items-center justify-center md:justify-start gap-2 p-2 rounded-lg text-xs font-medium text-[#f6c945] hover:bg-[#141611] border border-transparent hover:border-[#f6c945]/30 transition-colors"
      title="Sign In to Cloud"
    >
      <LogIn className="w-4 h-4 shrink-0" />
      <span className="hidden md:inline truncate">Sign In</span>
    </Link>
  );
}
