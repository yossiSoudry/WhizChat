import { getAuthenticatedAgent, isAdmin } from "@/lib/auth/get-agent";
import { redirect } from "next/navigation";

export default async function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authResult = await getAuthenticatedAgent();

  if (!authResult.success || !isAdmin(authResult.agent)) {
    redirect("/");
  }

  return <>{children}</>;
}
