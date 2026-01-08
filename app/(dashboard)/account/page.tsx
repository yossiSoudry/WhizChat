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
    penName: "",
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
        penName: agent.penName || "",
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
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 w-12 h-12 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">טוען חשבון...</span>
        </div>
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
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 w-12 h-12 bg-primary/30 rounded-xl blur-lg" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
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
                className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 shadow-sm ${
                  message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.type === "success" ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-red-100 dark:bg-red-900/50"
                }`}>
                  {message.type === "success" ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>
                {message.text}
              </div>
            </Fade>
          )}

          {/* Profile Card */}
          <Fade inView delay={50}>
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-primary/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  פרטים אישיים
                </CardTitle>
                <CardDescription>עדכן את השם והתמונה שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
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

                {/* Pen Name */}
                <div className="space-y-2">
                  <Label htmlFor="penName">שם תצוגה (שם עט)</Label>
                  <Input
                    id="penName"
                    value={formData.penName}
                    onChange={(e) =>
                      setFormData({ ...formData, penName: e.target.value })
                    }
                    placeholder="השם שיוצג ללקוחות"
                  />
                  <p className="text-xs text-muted-foreground">
                    השם הזה יוצג ללקוחות בווידג'ט במקום השם האמיתי שלך
                  </p>
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
                  className="w-full gap-2 shadow-lg shadow-primary/20"
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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-emerald-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-emerald-500" />
                  </div>
                  התראות
                </CardTitle>
                <CardDescription>הגדר את העדפות ההתראות שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="space-y-0.5">
                    <Label className="font-medium">התראות WhatsApp</Label>
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
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      יש להזין מספר טלפון כדי לקבל התראות WhatsApp
                    </p>
                  </div>
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
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-amber-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-amber-500" />
                  </div>
                  שינוי סיסמה
                </CardTitle>
                <CardDescription>עדכן את הסיסמה שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
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
