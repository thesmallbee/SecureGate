import { getPrisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenRecord = await getPrisma().verificationToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div
          className="w-full max-w-[460px] p-8 text-center"
          style={{
            background: "rgba(16,16,16,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            borderRadius: "24px",
          }}
        >
          <p className="text-[15px] leading-[1.6] text-[#FFD54A]">
            Invalid or expired verification link. Please request a new one.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block text-[14px] text-[#D8FF5A] hover:underline"
          >
            Back to sign up
          </Link>
        </div>
      </div>
    );
  }

  if (tokenRecord.expires < new Date()) {
    await getPrisma().verificationToken.delete({ where: { token } });

    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div
          className="w-full max-w-[460px] p-8 text-center"
          style={{
            background: "rgba(16,16,16,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            borderRadius: "24px",
          }}
        >
          <p className="text-[15px] leading-[1.6] text-[#FF4D4D]">
            This link has expired. Please sign up again or request a new
            verification email.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block text-[14px] text-[#D8FF5A] hover:underline"
          >
            Back to sign up
          </Link>
        </div>
      </div>
    );
  }

  await getPrisma().user.update({
    where: { email: tokenRecord.identifier },
    data: { emailVerified: new Date() },
  });

  await getPrisma().verificationToken.delete({ where: { token } });

  redirect("/login?verified=true");
}
