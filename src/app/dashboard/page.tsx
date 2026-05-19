import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

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
          <h1
            className="text-[32px] font-semibold leading-[1.2]"
            style={{ color: "#D8FF5A" }}
          >
            Dashboard
          </h1>
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
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
