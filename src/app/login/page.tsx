"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <>
      {verified && (
        <div className="rounded-[14px] border border-[rgba(0,255,132,0.18)] bg-[rgba(0,255,132,0.08)] px-4 py-3 text-[13px] font-medium text-[#00FF84]">
          Email verified. You can now log in.
        </div>
      )}
      {registered && (
        <div className="rounded-[14px] border border-[rgba(110,168,254,0.18)] bg-[rgba(110,168,254,0.08)] px-4 py-3 text-[13px] font-medium text-[#6EA8FE]">
          Account created. Check your email to verify.
        </div>
      )}
      {reset && (
        <div className="rounded-[14px] border border-[rgba(0,255,132,0.18)] bg-[rgba(0,255,132,0.08)] px-4 py-3 text-[13px] font-medium text-[#00FF84]">
          Password reset successfully. You can now log in.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-[14px] font-medium text-[#D0D0D0]">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-[54px] rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#121212] px-4 text-white outline-none transition-all placeholder:text-[#666] focus:border-[#D8FF5A] focus:shadow-[0_0_0_4px_rgba(216,255,90,0.12)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-[14px] font-medium text-[#D0D0D0]">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-[54px] rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#121212] px-4 text-white outline-none transition-all placeholder:text-[#666] focus:border-[#D8FF5A] focus:shadow-[0_0_0_4px_rgba(216,255,90,0.12)]"
          />
        </div>

        {error && (
          <p className="text-[13px] font-medium text-[#FF4D4D]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-[52px] items-center justify-center rounded-[14px] bg-[#D8FF5A] px-5 font-semibold text-[#050505] transition-all hover:translate-y-[-1px] hover:shadow-[0_0_24px_rgba(216,255,90,0.25)] disabled:opacity-70 disabled:pointer-events-none disabled:cursor-wait"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-3 text-[14px] text-[#A0A0A0]">
        <Link href="/forgot-password" className="text-[#D8FF5A] hover:underline">
          Forgot password?
        </Link>
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#D8FF5A] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div
        className="w-full"
        style={{
          maxWidth: "460px",
          padding: "32px",
          background: "rgba(16,16,16,0.92)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          borderRadius: "24px",
        }}
      >
        <h1 className="mb-8 text-[32px] font-semibold leading-[1.2]">Sign In</h1>
        <div className="flex flex-col gap-5">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
