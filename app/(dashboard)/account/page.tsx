"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { Save, Loader2, User, Bell, Lock } from "lucide-react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { useAgent } from "@/contexts/agent-context";

export default function AccountPage() {
  const { agent, refreshAgent } = useAgent();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    receiveWhatsappNotifications: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || "",
        phone: agent.phone || "",
        receiveWhatsappNotifications: agent.receiveWhatsappNotifications || false,
      });
    }
  }, [agent]);

  async function handleSaveProfile() {
    if (!agent) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "הפרטים נשמרו בהצלחה" });
        refreshAgent();
      } else {
        setMessage({ type: "error", text: data.error || "שגיאה בשמירת הפרטים" });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "שגיאה בשמירת הפרטים" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!agent) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "הסיסמאות אינן תואמות" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: "error", text: "הסיסמה חייבת להכיל לפחות 6 תווים" });
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);

    try {
      const res = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "הסיסמה שונתה בהצלחה" });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setMessage({ type: "error", text: data.error || "שגיאה בשינוי הסיסמה" });
      }
    } catch (error) {
      console.error("Password change error:", error);
      setMessage({ type: "error", text: "שגיאה בשינוי הסיסמה" });
    } finally {
      setIsChangingPassword(false);
    }
  }

  function handleAvatarUpdate(avatarUrl: string | null) {
    refreshAgent();
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <MobileHeader
        title="הגדרות חשבון"
        subtitle="עריכת פרטים אישיים"
        icon={<User className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Header - hidden on mobile */}
          <Fade inView className="hidden md:block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">הגדרות חשבון</h1>
                <p className="text-muted-foreground text-sm">
                  ערוך את הפרטים האישיים שלך
                </p>
              </div>
            </div>
          </Fade>

          {/* Message */}
          {message && (
            <Fade inView>
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                }`}
              >
                {message.text}
              </div>
            </Fade>
          )}

          {/* Profile Card */}
          <Fade inView delay={50}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5" />
                  פרטים אישיים
                </CardTitle>
                <CardDescription>עדכן את השם והתמונה שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <AvatarUpload
                    avatarUrl={agent.avatarUrl}
                    name={agent.name}
                    agentId={agent.id}
                    onUpdate={handleAvatarUpdate}
                    size="lg"
                  />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">שם</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="השם שלך"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל</Label>
                  <Input
                    id="email"
                    value={agent.email}
                    disabled
                    dir="ltr"
                    className="text-left bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    לא ניתן לשנות את האימייל
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+972501234567"
                    dir="ltr"
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  שמור שינויים
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Notifications Card */}
          <Fade inView delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  התראות
                </CardTitle>
                <CardDescription>הגדר את העדפות ההתראות שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>התראות WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      קבל התראה בוואטסאפ כשמגיעה הודעה חדשה
                    </p>
                  </div>
                  <Switch
                    checked={formData.receiveWhatsappNotifications}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, receiveWhatsappNotifications: checked })
                    }
                    disabled={!formData.phone}
                  />
                </div>
                {!formData.phone && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    יש להזין מספר טלפון כדי לקבל התראות WhatsApp
                  </p>
                )}

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  שמור העדפות
                </Button>
              </CardContent>
            </Card>
          </Fade>

          {/* Password Card */}
          <Fade inView delay={150}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  שינוי סיסמה
                </CardTitle>
                <CardDescription>עדכן את הסיסמה שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">סיסמה נוכחית</Label>
                  <PasswordInput
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">סיסמה חדשה</Label>
                  <PasswordInput
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">אימות סיסמה חדשה</Label>
                  <PasswordInput
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={
                    isChangingPassword ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword
                  }
                  variant="outline"
                  className="w-full gap-2"
                >
                  {isChangingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  שנה סיסמה
                </Button>
              </CardContent>
            </Card>
          </Fade>
        </div>
      </div>
    </div>
  );
}
