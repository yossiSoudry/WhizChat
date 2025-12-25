"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  Shield,
  ShieldCheck,
  Mail,
  Calendar,
  Eye,
  Clock,
  Edit2,
} from "lucide-react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Users } from "@/components/animate-ui/icons/users";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash } from "@/components/animate-ui/icons/trash";
import { X } from "@/components/animate-ui/icons/x";
import { cn } from "@/lib/utils";
import { RelativeTimeCard } from "@/components/ui/relative-time-card";

interface Agent {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: "admin" | "agent";
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AgentCard({
  agent,
  isEditing,
  formData,
  setFormData,
  onEdit,
  onUpdate,
  onDelete,
  onToggleActive,
  onCancelEdit,
}: {
  agent: Agent;
  isEditing: boolean;
  formData: { name: string; role: "admin" | "agent"; isActive: boolean };
  setFormData: (data: { name: string; role: "admin" | "agent"; isActive: boolean }) => void;
  onEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onCancelEdit: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition-all",
        !agent.isActive && "opacity-60"
      )}
    >
      {isEditing ? (
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>שם</Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>תפקיד</Label>
            <Select
              value={formData.role}
              onValueChange={(value: "admin" | "agent") =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">נציג</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label>פעיל</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={onUpdate} className="gap-2">
              <Save className="w-4 h-4" />
              שמור
            </Button>
            <AnimateIcon animateOnHover asChild>
              <Button variant="outline" onClick={onCancelEdit} className="gap-2">
                <X className="w-4 h-4" />
                ביטול
              </Button>
            </AnimateIcon>
          </div>
        </CardContent>
      ) : (
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="size-14 border-2 border-border">
                <AvatarFallback className="bg-brand-gradient text-white text-lg font-medium">
                  {getInitials(agent.name)}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span
                className={cn(
                  "absolute bottom-0 right-0 size-4 rounded-full border-2 border-background",
                  agent.isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                )}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {agent.name}
                </h3>
                <Badge
                  variant={agent.role === "admin" ? "default" : "secondary"}
                  className="text-[10px] gap-1"
                >
                  {agent.role === "admin" ? (
                    <>
                      <ShieldCheck className="w-3 h-3" />
                      מנהל
                    </>
                  ) : (
                    <>
                      <Shield className="w-3 h-3" />
                      נציג
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate" dir="ltr">{agent.email}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  הצטרף{" "}
                  <RelativeTimeCard date={new Date(agent.createdAt)} />
                </span>
                {agent.lastSeenAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    נראה לאחרונה{" "}
                    <RelativeTimeCard date={new Date(agent.lastSeenAt)} />
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={agent.isActive}
                onCheckedChange={onToggleActive}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AnimateIcon animateOnHover asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </AnimateIcon>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    role: "admin" | "agent";
    isActive: boolean;
  }>({
    name: "",
    role: "agent",
    isActive: true,
  });
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as "admin" | "agent",
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/admin/agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    if (!createFormData.name || !createFormData.email || !createFormData.password) {
      return;
    }

    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFormData),
      });

      if (res.ok) {
        const data = await res.json();
        setAgents([data.agent, ...agents]);
        setIsCreating(false);
        setCreateFormData({ name: "", email: "", password: "", role: "agent" });
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setAgents(agents.map((agent) => (agent.id === id ? data.agent : agent)));
        setEditingId(null);
        setFormData({ name: "", role: "agent", isActive: true });
      }
    } catch (error) {
      console.error("Failed to update agent:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק נציג זה?")) return;

    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAgents(agents.filter((agent) => agent.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const agent = agents.find((a) => a.id === id);
      if (!agent) return;

      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.name,
          role: agent.role,
          isActive,
        }),
      });

      if (res.ok) {
        setAgents(agents.map((a) => (a.id === id ? { ...a, isActive } : a)));
      }
    } catch (error) {
      console.error("Failed to toggle agent:", error);
    }
  }

  function startEdit(agent: Agent) {
    setEditingId(agent.id);
    setFormData({
      name: agent.name,
      role: agent.role,
      isActive: agent.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ name: "", role: "agent", isActive: true });
    setCreateFormData({ name: "", email: "", password: "", role: "agent" });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">טוען נציגים...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Fade inView>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">נציגים</h1>
                <p className="text-muted-foreground text-sm">
                  נהל את הנציגים וההרשאות שלהם
                </p>
              </div>
            </div>
            {!isCreating && (
              <AnimateIcon animateOnHover asChild>
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  הוסף נציג
                </Button>
              </AnimateIcon>
            )}
          </div>
        </Fade>

        {/* Stats */}
        {agents.length > 0 && (
          <Fade inView delay={50}>
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{agents.length}</p>
                    <p className="text-xs text-muted-foreground">סה"כ נציגים</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {agents.filter((a) => a.isOnline).length}
                    </p>
                    <p className="text-xs text-muted-foreground">מחוברים כעת</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {agents.filter((a) => a.role === "admin").length}
                    </p>
                    <p className="text-xs text-muted-foreground">מנהלים</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Fade>
        )}

        {/* Create Form */}
        {isCreating && (
          <Fade inView>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">נציג חדש</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">שם</Label>
                    <Input
                      id="name"
                      value={createFormData.name}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, name: e.target.value })
                      }
                      placeholder="ישראל ישראלי"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">אימייל</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createFormData.email}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, email: e.target.value })
                      }
                      placeholder="agent@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">סיסמה</Label>
                    <Input
                      id="password"
                      type="password"
                      value={createFormData.password}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">תפקיד</Label>
                    <Select
                      value={createFormData.role}
                      onValueChange={(value: "admin" | "agent") =>
                        setCreateFormData({ ...createFormData, role: value })
                      }
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">נציג</SelectItem>
                        <SelectItem value="admin">מנהל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreate} className="gap-2">
                    <Save className="w-4 h-4" />
                    שמור
                  </Button>
                  <AnimateIcon animateOnHover asChild>
                    <Button variant="outline" onClick={cancelEdit} className="gap-2">
                      <X className="w-4 h-4" />
                      ביטול
                    </Button>
                  </AnimateIcon>
                </div>
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* Agents List */}
        <Fade inView delay={100}>
          {agents.length === 0 && !isCreating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">אין נציגים עדיין</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  הוסף נציגים כדי שיוכלו לנהל את השיחות
                </p>
                <AnimateIcon animateOnHover asChild>
                  <Button onClick={() => setIsCreating(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף נציג ראשון
                  </Button>
                </AnimateIcon>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isEditing={editingId === agent.id}
                  formData={formData}
                  setFormData={setFormData}
                  onEdit={() => startEdit(agent)}
                  onUpdate={() => handleUpdate(agent.id)}
                  onDelete={() => handleDelete(agent.id)}
                  onToggleActive={(active) => handleToggleActive(agent.id, active)}
                  onCancelEdit={cancelEdit}
                />
              ))}
            </div>
          )}
        </Fade>
      </div>
    </div>
  );
}
