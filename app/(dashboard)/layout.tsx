import { AppSidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AgentProvider } from "@/contexts/agent-context";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the authenticated agent
  const authResult = await getAuthenticatedAgent();

  // If not authenticated, redirect to login
  if (!authResult.success) {
    redirect("/login");
  }

  const agent = authResult.agent;

  return (
    <AgentProvider initialAgent={agent}>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full overflow-hidden">
          {/* Main content - fills full space */}
          <main className="flex-1 overflow-hidden relative min-h-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative h-full overflow-hidden">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AgentProvider>
  );
}
