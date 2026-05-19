import crypto from "crypto";
import { prisma } from "./prisma";

export async function generateVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  return prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });
}

export async function generatePasswordResetToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { email } });

  return prisma.passwordResetToken.create({
    data: { email, token, expires },
  });
}
