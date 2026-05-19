"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/login?reset=true");
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
          Reset Password
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-[14px] font-medium text-[#D0D0D0]">
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
