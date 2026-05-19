# SecureGate — Reflection & Engineering Analysis

**Name:** Daniel Kwasi Fosu
**Cohort:** Design to MVP Bootcamp
**Live URL:** secure-gate-one.vercel.app
**GitHub Repo:** [SecureGate](https://github.com/thesmallbee/SecureGate.git)

---

## Part 1 — What I Built

SecureGate is a production-ready authentication system built with Next.js 16, TypeScript, and Prisma 7 on PostgreSQL (Neon). It implements the full auth lifecycle: signup with password strength validation, login with JWT sessions via NextAuth, email verification via Resend, secure password reset with expiring tokens, rate limiting on sensitive endpoints via Upstash Redis, and a protected dashboard — all styled with a dark security-first design system.

## Part 2 — What Surprised Me

The hardest part was adapting the build guide (written for Next.js 14, Prisma 5, Zod 3) to work with the bleeding-edge versions installed by create-next-app — Next.js 16 with async params and proxy.ts conventions, Prisma 7 with its new adapter-based client, and Zod 4 with its changed error API. Each version bump introduced breaking changes that required reading library source code to understand the new abstractions, which is exactly the Law of Leaky Abstractions in practice.

## Part 3 — Engineering Laws Quiz

### Q1 — Murphy's Law
**Code reference:** `src/app/api/register/route.ts` lines 33–38
**My Answer:** I wrapped the email-sending logic in a try-catch block so that if Resend's API is down, the API key is invalid, or the network fails, the user's account is still created and they can proceed. Without this, a transient email outage would permanently block registration.
**What goes wrong if ignored:** A user submits valid registration data, the account is created in the database, but `sendVerificationEmail` throws. The API returns a 500 error. The user thinks they failed to register, tries again, gets "An account with this email already exists" — they're stuck in a dead end with no way forward.

### Q2 — Law of Leaky Abstractions
**Code reference:** `src/lib/mail.ts` lines 3–9
**My Answer:** Resend's `send()` method presents a simple async interface, but I had to understand that instantiating `new Resend()` at module level throws if `RESEND_API_KEY` is undefined. This forced me to wrap the initialization in a lazy `getResend()` function that only constructs the client when an email is actually sent. Similarly, NextAuth's `authorize` callback abstracts session management, but I had to understand JWT callback flow — the `user.id` from `authorize` doesn't automatically flow to `session.user.id` without explicit `jwt` and `session` callbacks (`src/lib/auth.ts` lines 37–48).
**What goes wrong if ignored:** At module evaluation time (during build or cold start), `new Resend(undefined)` throws immediately, crashing the entire server — not just the email route.

### Q3 — YAGNI
**Code reference:** `package.json` lines 13–25 (dependencies)
**My Answer:** SecureGate has exactly one auth provider: credentials (email + password). Social login (Google, GitHub, etc.) and MFA (TOTP, SMS) are not implemented because the project's scope is a focused authentication core. Adding them now would introduce OAuth state management, provider-specific callbacks, TOTP secret storage, and recovery code flows — complexity that isn't needed until users actually request it. The YAGNI principle says build what you need now, not what you might need later.
**What goes wrong if ignored:** Prematurely adding social login would balloon the auth config, increase the attack surface (more callback endpoints, more token handling), and delay the core credential flow without delivering user value.

### Q4 — Kerckhoffs's Principle
**Code reference:** `src/app/api/register/route.ts` line 27 (`bcrypt.hash(password, 12)`)
**My Answer:** A salt is a random value concatenated with a password before hashing, ensuring that identical passwords produce different hashes. bcrypt is better than SHA-256 because bcrypt is deliberately slow (adaptive cost factor) and includes the salt automatically in its output. SHA-256 is designed for speed — it can compute billions of hashes per second on consumer GPUs, making brute-force feasible. bcrypt with 12 salt rounds takes ~250ms per hash, which is negligible for a legitimate login but prohibitively expensive for mass cracking. This follows Kerckhoffs's principle because the algorithm is public; security relies entirely on the secret (password) and the salt, not on hiding how they're combined.
**What goes wrong if ignored:** Using SHA-256 without salting means the same password always produces the same hash. A database breach exposes which users share passwords, and attackers can precompute rainbow tables to reverse them instantly.

### Q5 — Security by Design
**Code reference:** `src/app/api/forgot-password/route.ts` lines 32–39
**My Answer:** The forgot-password endpoint always returns `"If that email is registered, a reset link has been sent."` regardless of whether the email exists in the database. The only difference in the code path is whether `generatePasswordResetToken` and `sendPasswordResetEmail` are called (inside the `if (user)` block on line 32). This prevents an attacker from using the forgot-password flow to enumerate valid email addresses.
**What goes wrong if ignored:** If the endpoint returned "Email not found" for unknown addresses and "Reset link sent" for known ones, an attacker could iterate through email lists, confirm which users have accounts, and target them with phishing or credential-stuffing attacks.

### Q6 — Boy Scout Rule
**Code reference:** `src/lib/mail.ts` lines 3–9, `src/lib/prisma.ts` lines 6–9
**My Answer:** Two things: (1) I refactored `mail.ts` to lazy-initialize the Resend client inside a `getResend()` function instead of at module level, preventing crashes during build when env vars aren't set. (2) I switched the Prisma adapter from `@prisma/adapter-pg` to `@prisma/adapter-neon` when deploying to Vercel revealed that the `pg` package's native modules don't work in serverless. The original plan used a simple datasource URL, but Prisma 7 required an adapter, so I cleaned up the implementation to be both correct and deployable.
**What goes wrong if ignored:** Building the app with the pg adapter would succeed locally but crash on Vercel during any database call, forcing a frantic hotfix at deployment time.

### Q7 — Gall's Law
**Code reference:** `prisma/schema.prisma` models (User, VerificationToken, PasswordResetToken) → `src/lib/tokens.ts` → `src/app/verify-email/[token]/page.tsx` → dashboard
**My Answer:** The system grew from simple to complex: Phase 1 was just the database schema (3 tables, no business logic). Phase 2 added NextAuth with credential login. Phase 3 layered email verification on top. Phase 4 added password reset. Each phase depended on the previous one working correctly. This is Gall's Law in action — complex systems evolve from simple working systems, not from comprehensive upfront design. The verification flow, for example, relies on the User model having an `emailVerified` field, which was added in Phase 1 before any verification logic existed.
**What goes wrong if ignored:** Attempting to build the entire auth system (signup + OAuth + MFA + email verification + password reset + rate limiting) in a single phase would produce tightly coupled code where a bug in one feature blocks all the others, making debugging impossible within a 3-hour time limit.

### Q8 — Leaky Abstractions (ORM)
**Code reference:** `prisma/schema.prisma` lines 10–17 (User model), `src/lib/prisma.ts` lines 1–11
**My Answer:** Prisma's schema declares `User` with fields like `emailVerified DateTime?`, but in the actual PostgreSQL database, Prisma creates a column named `emailVerified` with the native PostgreSQL `timestamp(3)` type. The abstraction leaks when you realize Prisma 7 no longer supports a simple `datasource db { url = env("DATABASE_URL") }` in the schema — the URL is now configured in `prisma.config.ts` and the client requires a driver adapter (`PrismaNeon`), exposing the underlying database driver directly. The ORM hides queries but not connection management.
**What goes wrong if ignored:** Trying to follow older Prisma 5 tutorials where `new PrismaClient()` takes no arguments — in Prisma 7, the constructor requires an adapter or accelerateUrl, and failing to provide one causes a TypeScript compile error with a completely unhelpful message about missing arguments.

### Q9 — Zawinski's Law
**Code reference:** `src/lib/ratelimit.ts` lines 4–8, `middleware.ts` lines 1–5
**My Answer:** Every operating system and platform ships with basic file I/O, but none ships with rate limiting — because rate limiting is application-specific policy, not infrastructure. Next.js intentionally doesn't include it; it's up to the developer to integrate something like Upstash (or write a simple in-memory counter). Zawinski's law (software expands until it includes email) applies here as a metaphor: platforms that try to do everything become bloated. Next.js stays lean by leaving security policy to the developer, which means discipline is required — you must remember to add rate limiting yourself.
**What goes wrong if ignored:** Without explicit rate limiting, an attacker can automate thousands of login attempts per second against the `/api/auth/[...nextauth]` and `/api/forgot-password` endpoints, performing credential-stuffing attacks with no friction.

### Q10 — Principle of Least Surprise
**Code reference:** `src/app/login/page.tsx` line 32 (`"Invalid email or password"`), `src/lib/auth.ts` lines 18–30
**My Answer:** The error message is **"Invalid email or password"** regardless of whether the email doesn't exist, the email is unverified, or the password doesn't match. All three failure paths in `authorize` (`src/lib/auth.ts` lines 22, 23, 30) return `null`, which NextAuth surfaces as a generic credential error. This doesn't surprise the user because: (1) it's the standard message every auth system uses, (2) it doesn't reveal whether the email exists, and (3) it gives no hint about which field is wrong, preventing targeted attacks.
**What goes wrong if ignored:** Distinct messages like "Email not found" vs "Wrong password" would let attackers verify email existence and focus brute-force efforts on the password alone, dramatically reducing the search space for credential theft.

### Q11 — Defensive Programming
**Code reference:** `middleware.ts` lines 1–5, `src/app/dashboard/page.tsx` lines 7–10
**My Answer:** Two layers of defense: First, `middleware.ts` (the NextAuth middleware) intercepts ALL requests to `/dashboard/:path*` and checks for a valid session cookie. If absent, it redirects to `/login`. Second, the dashboard page itself calls `getServerSession(authOptions)` and redirects if `!session` — this covers the edge case where the middleware is somehow bypassed (e.g., directly hitting the server component via server-side render). If a user deletes their `next-auth.session-token` cookie: (1) the middleware runs on next request, (2) `withAuth` calls `getToken({ req, secret })` which reads the cookie, (3) no cookie = no token = `withAuth` redirects to `/login`, (4) before the page even renders, the user is at the sign-in page.
**What goes wrong if ignored:** Relying solely on middleware means a bug or misconfiguration in the middleware matcher could expose the dashboard to unauthenticated users. The dual-layer defense (middleware + server-side check) is a defensive programming pattern.

### Q12 — Kerckhoffs's + Technical Debt
**Code reference:** `src/lib/auth.ts` line 6 (`session: { strategy: "jwt" }`), `.env.local` template
**My Answer:** Step-by-step if `NEXTAUTH_SECRET` is committed to GitHub: (1) The secret is visible in the public repo. (2) Anyone can fork the repo, read the secret, and forge valid JWT tokens for any user ID. (3) They craft a JWT with `{ id: "admin-id", email: "admin@example.com" }` signed with the exposed secret. (4) They set the `next-auth.session-token` cookie in their browser. (5) NextAuth's `jwt.decode()` uses the same secret to verify the token — it validates as authentic. (6) They access `/dashboard` and the middleware/session check treats them as a verified user. This is Kerckhoffs's principle violated: the secret isn't secret anymore.
**What goes wrong if ignored:** Full account takeover of any user — the attacker can forge tokens at will. The only fix is to rotate `NEXTAUTH_SECRET`, which invalidates ALL existing sessions, forcing every user to re-login.

### Q13 — Conway's Law
**Code reference:** `src/app/` directory structure, `src/lib/` directory structure
**My Answer:** The folder structure mirrors how I think about the system: `src/app/api/` contains route handlers (the "network boundary"), `src/app/[page]/` contains page components (the "UI layer"), and `src/lib/` contains shared business logic (auth, tokens, mail, rate limiting). API routes, pages, and libraries are separate because they serve different concerns and are maintained by different mental models. This is Conway's Law: the system architecture reflects the communication structure of the organization (in this case, a solo developer organizing by concern).
**What goes wrong if ignored:** Mixing business logic into page components would make it impossible to reuse the auth logic across API routes and pages, leading to duplication and inconsistent behavior.

### Q14 — Technical Debt
**Code reference:** `src/app/api/register/route.ts` line 30 (`emailVerified: new Date()`)
**My Answer:** Currently, registration auto-verifies users by setting `emailVerified: new Date()` in the create call. This works for development but is a security gap at scale — users can access the dashboard without ever confirming their email, which means: (1) users who mistype their email address won't know until they try to reset a password, (2) the system collects invalid email addresses that can't receive critical security notifications, (3) if the system later adds paid features, unverified accounts create billing and support issues. The proper fix is to remove the auto-verify and make the email verification flow reliable with proper Resend domain configuration and a resend-verification endpoint.
**What goes wrong if ignored:** As the user base grows, a significant percentage of accounts will have unverified or invalid emails. Password reset becomes impossible for those users, creating support overhead and potential account lockout.

### Q15 — Synthesis
**Code reference:** All of the above
**My Answer:** If I added Flutterwave payments to SecureGate, the most critical principles would be: (1) **Security by Design** — payment flows must never reveal whether an email has an account, and transaction error messages must not leak payment processor details. (2) **Murphy's Law** — the payment webhook handler needs idempotency keys and retry logic because payment providers will deliver the same webhook multiple times, and network failures will cause missed notifications. (3) **Principle of Least Surprise** — if a payment fails, the error must say "Transaction declined" not "Insufficient funds" or "Card expired", to avoid leaking financial information. (4) **Defensive Programming** — every payment endpoint must re-verify the session and check authorization before processing, not relying solely on the middleware check. (5) **Zawinski's Law** — payments are not part of Next.js, so I'd need to research and integrate a payment library, and the discipline to handle idempotency, webhook signatures, and refund logic falls entirely on the developer.

## Part 4 — One Thing I Would Refactor

The current signup page (`src/app/signup/page.tsx`) has the password strength logic duplicated inline instead of being a reusable component. This is technical debt because the same strength calculation is needed on the reset-password page for consistency, and duplicating it violates DRY.

**Refactored version:**

```tsx
// src/lib/password.ts
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

export const strengthColor = { weak: "#FF4D4D", fair: "#FFD54A", strong: "#00FF84" };
export const strengthWidth = { weak: "33%", fair: "66%", strong: "100%" };
export const strengthLabel = {
  weak: "Weak — add uppercase, numbers, or symbols",
  fair: "Fair — add more variety",
  strong: "Strong password",
};
```

This would be imported in both `signup/page.tsx` and `reset-password/[token]/page.tsx`, keeping strength logic in one place and ensuring consistent UX across all forms.

## Part 5 — How This Changes How I Build

Before SecureGate, I thought auth was just "hash the password and compare." Now I understand it's a web of interconnected principles: every error message is a security decision (Principle of Least Surprise), every null check is a defense against an attack path (Murphy's Law), every missing rate limiter is an invitation for abuse (Zawinski's Law). I now reach for bcrypt by instinct, never SHA-256. I write vague error messages on purpose. I add try-catch around every external API call. And I structure my code in layers (schema → lib → API → UI) because I've seen how Conway's Law makes that structure inevitable anyway — better to design for it than fight it.
