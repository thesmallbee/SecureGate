import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { forgotPasswordRatelimit } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await forgotPasswordRatelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const tokenRecord = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, tokenRecord.token);
  }

  return NextResponse.json({
    message: "If that email is registered, a reset link has been sent.",
  });
}
