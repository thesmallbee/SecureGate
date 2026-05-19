import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const resetToken = await getPrisma().passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json(
      { error: "Reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await getPrisma().user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await getPrisma().passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ message: "Password updated. You can now log in." });
}
