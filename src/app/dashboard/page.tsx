import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-[460px]">
        <div
          className="flex flex-col gap-6"
          style={{
            background: "linear-gradient(180deg, #161616 0%, #101010 100%)",
            borderRadius: "24px",
            padding: "32px",
          }}
        >
          <div className="flex items-center justify-between">
            <h1
              className="text-[32px] font-semibold leading-[1.2]"
              style={{ color: "#D8FF5A" }}
            >
              Dashboard
            </h1>
            <Link
              href="/api/auth/signout"
              className="flex h-[44px] items-center justify-center rounded-[14px] border border-[rgba(255,77,77,0.18)] bg-[rgba(255,77,77,0.12)] px-5 text-[14px] font-medium text-[#FF4D4D] transition-all hover:bg-[rgba(255,77,77,0.2)]"
            >
              Sign Out
            </Link>
          </div>
          <div className="space-y-3 text-[15px] leading-[1.6] text-[#A0A0A0]">
            <p>
              Welcome,{" "}
              <span className="text-white">{user.name || user.email}</span>
            </p>
            <p>
              Email:{" "}
              <span className="text-white">{user.email}</span>
            </p>
            <p>
              Status:{" "}
              <span style={{ color: "#00FF84" }}>Authenticated</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
