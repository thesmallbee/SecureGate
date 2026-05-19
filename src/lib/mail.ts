import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function fromAddress() {
  const domain = process.env.RESEND_DOMAIN;
  return domain ? `SecureGate <no-reply@${domain}>` : "SecureGate <onboarding@resend.dev>";
}

export async function sendVerificationEmail(email: string, token: string) {
  const resend = getResend();
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Verify your SecureGate account",
    html: `
      <h2>Confirm your email</h2>
      <p>Click the link below to verify your account. This link expires in 15 minutes.</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>If you did not sign up, ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resend = getResend();
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Reset your SecureGate password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
}
