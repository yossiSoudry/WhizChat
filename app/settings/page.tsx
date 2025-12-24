"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";

interface Settings {
  business_hours: {
    timezone: string;
    schedule: {
      [key: string]: { start: string; end: string } | null;
    };
  };
  messages: {
    welcome: string;
    offline: string;
    ask_contact: string;
    transferred_to_whatsapp: string;
    going_offline: string;
    agent_joined: string;
  };
  widget: {
    position: "left" | "right";
    primaryColor: string;
    secondaryColor: string;
  };
  whatsapp: {
    businessPhone: string;
    instanceId: string;
    apiToken: string;
  };
  archive: {
    daysUntilArchive: number;
    autoArchiveEnabled: boolean;
  };
}

const DAYS = [
  { key: "sunday", label: "ראשון" },
  { key: "monday", label: "שני" },
  { key: "tuesday", label: "שלישי" },
  { key: "wednesday", label: "רביעי" },
  { key: "thursday", label: "חמישי" },
  { key: "friday", label: "שישי" },
  { key: "saturday", label: "שבת" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    setIsSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function updateMessage(key: keyof Settings["messages"], value: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      messages: { ...settings.messages, [key]: value },
    });
  }

  function updateSchedule(
    day: string,
    enabled: boolean,
    start?: string,
    end?: string
  ) {
    if (!settings) return;
    setSettings({
      ...settings,
      business_hours: {
        ...settings.business_hours,
        schedule: {
          ...settings.business_hours.schedule,
          [day]: enabled ? { start: start || "09:00", end: end || "18:00" } : null,
        },
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex h-screen bg-background" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          לא ניתן לטעון את ההגדרות
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">הגדרות</h1>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור שינויים
            </Button>
          </div>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle>שעות פעילות</CardTitle>
              <CardDescription>
                הגדר מתי הצוות זמין לשיחות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {DAYS.map((day) => {
                const schedule = settings.business_hours.schedule[day.key];
                const isEnabled = schedule !== null;

                return (
                  <div
                    key={day.key}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-20">
                      <span className="font-medium">{day.label}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) =>
                        updateSchedule(
                          day.key,
                          checked,
                          schedule?.start,
                          schedule?.end
                        )
                      }
                    />
                    {isEnabled && (
                      <>
                        <Input
                          type="time"
                          value={schedule?.start || "09:00"}
                          onChange={(e) =>
                            updateSchedule(
                              day.key,
                              true,
                              e.target.value,
                              schedule?.end
                            )
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">עד</span>
                        <Input
                          type="time"
                          value={schedule?.end || "18:00"}
                          onChange={(e) =>
                            updateSchedule(
                              day.key,
                              true,
                              schedule?.start,
                              e.target.value
                            )
                          }
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle>הודעות מערכת</CardTitle>
              <CardDescription>
                התאם את ההודעות האוטומטיות
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome">הודעת פתיחה</Label>
                <Textarea
                  id="welcome"
                  value={settings.messages.welcome}
                  onChange={(e) => updateMessage("welcome", e.target.value)}
                  placeholder="היי! 👋 איך אפשר לעזור?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offline">הודעת אופליין</Label>
                <Textarea
                  id="offline"
                  value={settings.messages.offline}
                  onChange={(e) => updateMessage("offline", e.target.value)}
                  placeholder="אנחנו כרגע לא זמינים..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ask_contact">בקשת פרטי התקשרות</Label>
                <Textarea
                  id="ask_contact"
                  value={settings.messages.ask_contact}
                  onChange={(e) => updateMessage("ask_contact", e.target.value)}
                  placeholder="האם תרצה שנחזור אליך באימייל או בוואטסאפ?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transferred_to_whatsapp">העברה לוואטסאפ</Label>
                <Textarea
                  id="transferred_to_whatsapp"
                  value={settings.messages.transferred_to_whatsapp}
                  onChange={(e) =>
                    updateMessage("transferred_to_whatsapp", e.target.value)
                  }
                  placeholder="מעולה! ממשיכים את השיחה בוואטסאפ..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Widget Settings */}
          <Card>
            <CardHeader>
              <CardTitle>הגדרות Widget</CardTitle>
              <CardDescription>
                התאם את מראה הצ'אט באתר
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">צבע ראשי</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="primaryColor"
                      value={settings.widget.primaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          widget: { ...settings.widget, primaryColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={settings.widget.primaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          widget: { ...settings.widget, primaryColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">צבע משני</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      id="secondaryColor"
                      value={settings.widget.secondaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          widget: { ...settings.widget, secondaryColor: e.target.value },
                        })
                      }
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      type="text"
                      value={settings.widget.secondaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          widget: { ...settings.widget, secondaryColor: e.target.value },
                        })
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>מיקום Widget</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={settings.widget.position === "right" ? "default" : "outline"}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        widget: { ...settings.widget, position: "right" },
                      })
                    }
                  >
                    ימין
                  </Button>
                  <Button
                    type="button"
                    variant={settings.widget.position === "left" ? "default" : "outline"}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        widget: { ...settings.widget, position: "left" },
                      })
                    }
                  >
                    שמאל
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Settings */}
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp</CardTitle>
              <CardDescription>
                הגדרות אינטגרציה עם Green API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessPhone">מספר טלפון עסקי</Label>
                <Input
                  id="businessPhone"
                  value={settings.whatsapp.businessPhone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, businessPhone: e.target.value },
                    })
                  }
                  placeholder="+972..."
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instanceId">Instance ID</Label>
                <Input
                  id="instanceId"
                  value={settings.whatsapp.instanceId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, instanceId: e.target.value },
                    })
                  }
                  placeholder="Green API Instance ID"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={settings.whatsapp.apiToken}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, apiToken: e.target.value },
                    })
                  }
                  placeholder="Green API Token"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Archive Settings */}
          <Card>
            <CardHeader>
              <CardTitle>ארכיון</CardTitle>
              <CardDescription>
                הגדרות ארכיון שיחות אוטומטי
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={settings.archive.autoArchiveEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      archive: { ...settings.archive, autoArchiveEnabled: checked },
                    })
                  }
                />
                <Label>ארכיון אוטומטי של שיחות סגורות</Label>
              </div>
              {settings.archive.autoArchiveEnabled && (
                <div className="flex items-center gap-2">
                  <Label>העבר לארכיון אחרי</Label>
                  <Input
                    type="number"
                    value={settings.archive.daysUntilArchive}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        archive: {
                          ...settings.archive,
                          daysUntilArchive: parseInt(e.target.value) || 30,
                        },
                      })
                    }
                    className="w-20"
                    min={1}
                  />
                  <span>ימים</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
