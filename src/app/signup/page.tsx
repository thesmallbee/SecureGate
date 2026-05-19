"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getPasswordStrength(password: string): "weak" | "fair" | "strong" {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const longEnough = password.length >= 12;

  const score = [hasUpper, hasLower, hasNumber, hasSymbol, longEnough].filter(Boolean).length;

  if (score <= 2) return "weak";
  if (score <= 3) return "fair";
  return "strong";
}

const strengthColor = {
  weak: "#FF4D4D",
  fair: "#FFD54A",
  strong: "#00FF84",
};

const strengthWidth = {
  weak: "33%",
  fair: "66%",
  strong: "100%",
};

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = password ? getPasswordStrength(password) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          Array.isArray(data.error)
            ? data.error.map((e: { message: string }) => e.message).join(", ")
            : data.error
        );
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

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
        <h1 className="mb-8 text-[32px] font-semibold leading-[1.2]">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-[14px] font-medium text-[#D0D0D0]">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-[54px] rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#121212] px-4 text-white outline-none transition-all placeholder:text-[#666] focus:border-[#D8FF5A] focus:shadow-[0_0_0_4px_rgba(216,255,90,0.12)]"
            />
          </div>
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-[54px] w-full rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#121212] px-4 pr-12 text-white outline-none transition-all placeholder:text-[#666] focus:border-[#D8FF5A] focus:shadow-[0_0_0_4px_rgba(216,255,90,0.12)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {strength && (
              <div className="mt-1 flex flex-col gap-1.5">
                <div
                  className="h-[6px] w-full overflow-hidden rounded-[999px] bg-[rgba(255,255,255,0.06)]"
                >
                  <div
                    className="h-full rounded-[999px] transition-all duration-250"
                    style={{
                      width: strengthWidth[strength],
                      background: strengthColor[strength],
                    }}
                  />
                </div>
                <span
                  className="text-[13px] font-medium"
                  style={{ color: strengthColor[strength] }}
                >
                  {strength === "weak" && "Weak — add uppercase, numbers, or symbols"}
                  {strength === "fair" && "Fair — add more variety"}
                  {strength === "strong" && "Strong password"}
                </span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[13px] font-medium text-[#FF4D4D]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-[#D8FF5A] px-5 font-semibold text-[#050505] transition-all hover:translate-y-[-1px] hover:shadow-[0_0_24px_rgba(216,255,90,0.25)] disabled:opacity-70 disabled:pointer-events-none disabled:cursor-wait"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-[#A0A0A0]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#D8FF5A] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
