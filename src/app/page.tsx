import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center max-w-md">
        <h1 className="text-[56px] font-bold leading-[1.05] tracking-[-2px]">
          SecureGate
        </h1>
        <p className="text-[15px] leading-[1.6] text-[#A0A0A0]">
          Production-ready authentication system
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/login"
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-[#D8FF5A] px-5 font-semibold text-[#050505] transition-all hover:translate-y-[-1px] hover:shadow-[0_0_24px_rgba(216,255,90,0.25)]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="flex h-[52px] items-center justify-center rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#161616] px-5 font-semibold text-white transition-all hover:translate-y-[-1px]"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
