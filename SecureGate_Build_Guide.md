# SecureGate — Complete Build Guide

**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL · NextAuth · Resend · Vercel  
**Time Limit:** 3 Hours · Solo Submission · GitHub + Vercel + REFLECTION.md

---

## What You're Building

SecureGate is a standalone, production-ready authentication system. It is not a full product — it is the auth layer of one, studied under a microscope. One job: identity and access management done right.

**Features to build:**
- Sign Up with form validation, password strength indicator, and email confirmation
- Login with NextAuth session handling and secure error messaging
- Email Verification via tokenised link (expires in 15 minutes)
- Protected Dashboard — only for verified, authenticated users
- Forgot Password flow — request, receive email, reset, token expires in 1 hour
- Rate Limiting on login and forgot-password endpoints
- Logout with clean session destruction
- Password hashing with bcrypt (salt rounds: 12)

---

## Environment Setup

Create `.env.local` at the project root. **Never commit this file.** Add it to `.gitignore` before your first push.

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Set all of these in the **Vercel dashboard** under Settings → Environment Variables for your deployment.

---

## Phase 1 — Scaffold & Database Schema

**Goal:** Working project structure with database connected and migrated.

### 1.1 Bootstrap the Project

```bash
npx create-next-app@latest securegate --typescript --tailwind --app
cd securegate
npm install prisma @prisma/client bcryptjs @types/bcryptjs zod
npx prisma init
```

### 1.2 Prisma Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  password      String
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  email   String
  token   String   @unique
  expires DateTime

  @@unique([email, token])
}
```

### 1.3 Apply the Migration

```bash
npx prisma migrate dev --name init
```

Open your DB client and confirm all three tables exist. Then push your scaffold to GitHub before writing any feature code.

---

## Phase 2 — Authentication Core with NextAuth

**Goal:** Working sign-up and sign-in with hashed passwords and session management.

### 2.1 Install NextAuth

```bash
npm install next-auth
```

### 2.2 NextAuth Configuration

Create `src/lib/auth.ts`:

```typescript
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" }, // JWT chosen: stateless, no extra DB table needed
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null; // Do not reveal whether the email exists
        if (!user.emailVerified) return null; // Block unverified accounts

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
};
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 2.3 Prisma Client Singleton

Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["query"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 2.4 Sign Up API Route

Create `src/app/api/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12); // 12 salt rounds

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Trigger email verification (Phase 3)
    await sendVerificationEmail(user.email);

    return NextResponse.json({ message: "Account created. Check your email." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
```

### 2.5 Middleware — Protect the Dashboard

Create `middleware.ts` at the project root:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

**Test checklist for Phase 2:**
- Sign up creates a user in the DB
- Password column starts with `$2b$` (bcrypt hash)
- Visiting `/dashboard` without a session redirects to `/login`

---

## Phase 3 — Email Verification Flow

**Goal:** Users receive a confirmation email and cannot access the dashboard until verified.

### 3.1 Install Resend

```bash
npm install resend
```

### 3.2 Token Generation Utility

Create `src/lib/tokens.ts`:

```typescript
import crypto from "crypto";
import { prisma } from "./prisma";

export async function generateVerificationToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Delete any existing token for this email
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  return prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });
}

export async function generatePasswordResetToken(email: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.deleteMany({ where: { email } });

  return prisma.passwordResetToken.create({
    data: { email, token, expires },
  });
}
```

### 3.3 Send Verification Email

Create `src/lib/mail.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify-email/${token}`;

  await resend.emails.send({
    from: "SecureGate <no-reply@yourdomain.com>",
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
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

  await resend.emails.send({
    from: "SecureGate <no-reply@yourdomain.com>",
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
```

### 3.4 Verification Route

Create `src/app/verify-email/[token]/page.tsx`:

```typescript
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  params,
}: {
  params: { token: string };
}) {
  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  if (!tokenRecord) {
    return <p>Invalid or expired verification link. Please request a new one.</p>;
  }

  if (tokenRecord.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: params.token } });
    return <p>This link has expired. Please sign up again or request a new verification email.</p>;
  }

  await prisma.user.update({
    where: { email: tokenRecord.identifier },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token: params.token } });

  redirect("/login?verified=true");
}
```

---

## Phase 4 — Forgot Password Flow

**Goal:** Secure password reset via tokenised email link.

### 4.1 Forgot Password API

Create `src/app/api/forgot-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — never confirm whether the email exists
  if (user) {
    const tokenRecord = await generatePasswordResetToken(email);
    await sendPasswordResetEmail(email, tokenRecord.token);
  }

  return NextResponse.json({
    message: "If that email is registered, a reset link has been sent.",
  });
}
```

### 4.2 Reset Password API

Create `src/app/api/reset-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken || resetToken.expires < new Date()) {
    return NextResponse.json(
      { error: "Reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ message: "Password updated. You can now log in." });
}
```

---

## Phase 5 — Rate Limiting & Security Hardening

**Goal:** Brute-force protection, secure error handling, and hardened HTTP headers.

### 5.1 Install Upstash Rate Limiter

```bash
npm install @upstash/ratelimit @upstash/redis
```

### 5.2 Rate Limiting Middleware

Create `src/lib/ratelimit.ts`:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const loginRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"), // 5 attempts per 10 minutes
  analytics: true,
});

export const forgotPasswordRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
});
```

Apply in your login handler or NextAuth's `authorize()`:

```typescript
import { loginRatelimit } from "@/lib/ratelimit";
import { headers } from "next/headers";

const ip = headers().get("x-forwarded-for") ?? "127.0.0.1";
const { success } = await loginRatelimit.limit(ip);

if (!success) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429 }
  );
}
```

### 5.3 HTTP Security Headers

In `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 5.4 Security Checklist

Review every API route before submission:

- Error messages must **not** reveal whether an email exists
- Error messages must **not** include stack traces
- No API keys or secrets are hardcoded anywhere in the codebase
- All sensitive data comes exclusively from `process.env`

---

## Phase 6 — UI Polish & Deployment

**Goal:** Accessible, usable UI. Live Vercel deployment.

### 6.1 Password Strength Indicator

```typescript
export function getPasswordStrength(password: string): "weak" | "fair" | "strong" {
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
```

### 6.2 Form Requirements

Every form must include:

- Accessible `<label>` elements linked to inputs via `htmlFor`/`id`
- Specific validation messages — not "Something went wrong"
- A loading/disabled state on the submit button during async operations
- The password field must display the strength indicator (weak / fair / strong)

### 6.3 Deploy to Vercel

```bash
# Push final code
git add .
git commit -m "feat: complete SecureGate auth system"
git push origin main
```

Then in Vercel:
1. Import the GitHub repository
2. Add all environment variables under **Settings → Environment Variables**
3. Deploy
4. Open in incognito and test the full flow end to end

---

## Folder Structure Reference

```
securegate/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── forgot-password/route.ts
│   │   │   └── reset-password/route.ts
│   │   ├── dashboard/page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/[token]/page.tsx
│   │   └── verify-email/[token]/page.tsx
│   └── lib/
│       ├── auth.ts
│       ├── prisma.ts
│       ├── tokens.ts
│       ├── mail.ts
│       └── ratelimit.ts
├── middleware.ts
├── next.config.js
├── .env.local          ← NEVER commit this
├── .gitignore          ← Must include .env.local
└── REFLECTION.md       ← Required for submission
```

---

## REFLECTION.md — Required Structure

Your `REFLECTION.md` is **40% of your score**. It must be in the root of your repo and follow this structure exactly. Every answer must reference your actual code — generic answers do not earn marks.

```markdown
# SecureGate — Reflection & Engineering Analysis

**Name:** [Your full name]
**Cohort:** Design to MVP Bootcamp
**Live URL:** [Your Vercel URL]
**GitHub Repo:** [Your repo URL]

---

## Part 1 — What I Built
[2–3 sentences describing SecureGate and what you implemented]

## Part 2 — What Surprised Me
[The one hardest thing and what you learned from it]

## Part 3 — Engineering Laws Quiz

### Q1 — Murphy's Law
**Code reference:** `src/app/api/auth/[...nextauth]/route.ts` lines X–Y
**My Answer:** [Your answer]
**What goes wrong if ignored:** [Your answer]

### Q2 — Law of Leaky Abstractions
...

[Repeat for all 15 questions]

## Part 4 — One Thing I Would Refactor
[Describe the technical debt and paste the refactored version]

## Part 5 — How This Changes How I Build
[What you now understand about auth, security, and engineering that you didn't before]
```

### 15 Engineering Law Questions (summary)

| # | Law | Question Focus |
|---|-----|---------------|
| 1 | Murphy's Law | Where did you add protection you wouldn't have thought of otherwise? |
| 2 | Leaky Abstractions | Where did NextAuth/Prisma/Resend force you to understand the layer beneath? |
| 3 | YAGNI | Why does SecureGate NOT have social login or MFA right now? |
| 4 | Kerckhoffs's Principle | What is a salt, and why is bcrypt better than SHA-256? |
| 5 | Security by Design | Why does forgot-password always return success regardless of email existence? |
| 6 | Boy Scout Rule | Where did you clean up code that wasn't part of the original plan? |
| 7 | Gall's Law | How does building phase-by-phase reflect how complex systems should grow? |
| 8 | Leaky Abstractions (ORM) | Where does Prisma's schema NOT match the actual database table? |
| 9 | Zawinski's Law | Why is rate limiting not in Next.js by default, and what does that mean for discipline? |
| 10 | Principle of Least Surprise | What exact error message do you show on wrong credentials, and why? |
| 11 | Defensive Programming | What happens if a user deletes their session cookie? Trace the code path. |
| 12 | Kerckhoffs's + Technical Debt | What happens step-by-step if `NEXTAUTH_SECRET` is committed to GitHub? |
| 13 | Conway's Law | How does your folder structure reflect how you think about the system? |
| 14 | Technical Debt | Identify one thing that works now but will cause problems at scale. |
| 15 | Synthesis | If you added Flutterwave payments, which principles become most critical? |

---

## Final Submission Checklist

Go through every item in an incognito window before submitting.

- [ ] App is live on Vercel — sign up works cold
- [ ] `emailVerified` is set in DB after clicking the email link
- [ ] Password in DB starts with `$2b$` (bcrypt hash)
- [ ] Verification email arrives and the link works
- [ ] Forgot password flow works end to end
- [ ] 6th wrong login attempt is blocked (rate limiting active)
- [ ] `/dashboard` redirects to `/login` when logged out
- [ ] `.env.local` is **not** in the GitHub repo
- [ ] `REFLECTION.md` is in the repo root with all 15 answers
- [ ] No API keys or secrets hardcoded anywhere in the codebase
- [ ] All environment variables are set in Vercel dashboard
- [ ] Empty form submission and wrong credentials show real error messages

---

## Scoring Reference

| Score | Grade | Meaning |
|-------|-------|---------|
| 27–30 | Distinction | Principles internalised. Code could go to production. |
| 21–26 | Merit | Strong execution. Minor gaps in depth or documentation. |
| 15–20 | Pass | Built it. Reflection shallow. Security gaps present. |
| Below 15 | Resubmit | Critical features missing or principles not understood. |

**Distinction standard:** You can open `REFLECTION.md` in front of a senior engineer and explain every choice line by line — why 12 salt rounds, what happens when a reset token expires, which law told you not to confirm whether an email exists.
```
