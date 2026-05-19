"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-[13px] text-[#555] transition-colors hover:text-[#888]"
    >
      Sign out
    </button>
  );
}
