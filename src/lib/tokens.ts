import crypto from "crypto";
import { getPrisma } from "./prisma";

export async function generateVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  await getPrisma().verificationToken.deleteMany({ where: { identifier: email } });

  return getPrisma().verificationToken.create({
    data: { identifier: email, token, expires },
  });
}

export async function generatePasswordResetToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await getPrisma().passwordResetToken.deleteMany({ where: { email } });

  return getPrisma().passwordResetToken.create({
    data: { email, token, expires },
  });
}
