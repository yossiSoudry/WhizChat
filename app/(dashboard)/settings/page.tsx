"use client";

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  TimePicker,
  TimePickerInputGroup,
  TimePickerInput,
  TimePickerSeparator,
  TimePickerTrigger,
  TimePickerContent,
  TimePickerHour,
  TimePickerMinute,
} from "@/components/ui/time-picker";
import {
  ColorPicker,
  ColorPickerTrigger,
  ColorPickerContent,
  ColorPickerArea,
  ColorPickerHueSlider,
  ColorPickerSwatch,
  ColorPickerEyeDropper,
  ColorPickerInput,
} from "@/components/ui/color-picker";
import {
  Save,
  Loader2,
  MessageSquare,
  Palette,
  MessageCircle,
  Archive,
  CheckCircle2,
  Download,
  Smartphone,
  Share,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { Clock } from "@/components/animate-ui/icons/clock";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { SlidersHorizontal } from "@/components/animate-ui/icons/sliders-horizontal";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell } from "lucide-react";

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
    language: "en" | "he";
    theme: "light" | "dark" | "auto";
    chatBackground: string;
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

interface NotificationAgent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  receiveWhatsappNotifications: boolean;
}

const DAYS = [
  { key: "sunday", label: "ראשון", short: "א" },
  { key: "monday", label: "שני", short: "ב" },
  { key: "tuesday", label: "שלישי", short: "ג" },
  { key: "wednesday", label: "רביעי", short: "ד" },
  { key: "thursday", label: "חמישי", short: "ה" },
  { key: "friday", label: "שישי", short: "ו" },
  { key: "saturday", label: "שבת", short: "ש" },
];

const DEFAULT_SETTINGS: Settings = {
  business_hours: {
    timezone: "Asia/Jerusalem",
    schedule: {
      sunday: { start: "09:00", end: "18:00" },
      monday: { start: "09:00", end: "18:00" },
      tuesday: { start: "09:00", end: "18:00" },
      wednesday: { start: "09:00", end: "18:00" },
      thursday: { start: "09:00", end: "18:00" },
      friday: null,
      saturday: null,
    },
  },
  messages: {
    welcome: "Hello! How may I assist you today?",
    offline: "We are currently unavailable. Please leave a message and we will respond as soon as possible.",
    ask_contact: "Would you prefer to be contacted via email or WhatsApp?",
    transferred_to_whatsapp: "Excellent! We will continue this conversation on WhatsApp.",
    going_offline: "Our support team has concluded for the day. We will respond to your inquiry shortly.",
    agent_joined: "You are now connected with {agent_name}.",
  },
  widget: {
    position: "right",
    primaryColor: "#A31CAF",
    secondaryColor: "#39C3EF",
    language: "en",
    theme: "light",
    chatBackground: "none",
  },
  whatsapp: {
    businessPhone: "",
    instanceId: "",
    apiToken: "",
  },
  archive: {
    daysUntilArchive: 30,
    autoArchiveEnabled: true,
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [agents, setAgents] = useState<NotificationAgent[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      const res = await fetch("/api/admin/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  }

  async function toggleAgentNotification(agentId: string, enabled: boolean) {
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiveWhatsappNotifications: enabled }),
      });

      if (res.ok) {
        setAgents(agents.map(agent =>
          agent.id === agentId
            ? { ...agent, receiveWhatsappNotifications: enabled }
            : agent
        ));
      }
    } catch (error) {
      console.error("Failed to toggle notification:", error);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      const mergedSettings = {
        business_hours: { ...DEFAULT_SETTINGS.business_hours, ...data.settings?.business_hours },
        messages: { ...DEFAULT_SETTINGS.messages, ...data.settings?.messages },
        widget: { ...DEFAULT_SETTINGS.widget, ...data.settings?.widget },
        whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...data.settings?.whatsapp },
        archive: { ...DEFAULT_SETTINGS.archive, ...data.settings?.archive },
      };
      setSettings(mergedSettings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const savePromises = [
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "business_hours", value: settings.business_hours }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "messages", value: settings.messages }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "widget", value: settings.widget }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "whatsapp", value: settings.whatsapp }),
        }),
        fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "archive", value: settings.archive }),
        }),
      ];
      await Promise.all(savePromises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">טוען הגדרות...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        לא ניתן לטעון את ההגדרות
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <MobileHeader
        title="הגדרות"
        subtitle="הגדרות מערכת"
        icon={<SlidersHorizontal className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header - hidden on mobile */}
          <Fade inView className="hidden md:block">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">הגדרות</h1>
                <p className="text-muted-foreground mt-1">
                  נהל את הגדרות המערכת והעדפות הצ'אט
                </p>
              </div>
              <AnimateIcon animateOnHover asChild>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saveSuccess ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saveSuccess ? "נשמר!" : "שמור שינויים"}
                </Button>
              </AnimateIcon>
            </div>
          </Fade>

          {/* Mobile save button */}
          <div className="md:hidden">
            <AnimateIcon animateOnHover asChild>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveSuccess ? "נשמר!" : "שמור שינויים"}
              </Button>
            </AnimateIcon>
          </div>

        {/* Tabs */}
        <Fade inView delay={100}>
          <Tabs defaultValue="hours" className="w-full">
            <TabsList className="grid w-full grid-cols-6 h-12">
              <TabsTrigger value="hours" className="gap-2">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">שעות פעילות</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">הודעות</span>
              </TabsTrigger>
              <TabsTrigger value="widget" className="gap-2">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">עיצוב</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="archive" className="gap-2">
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">ארכיון</span>
              </TabsTrigger>
              <TabsTrigger value="app" className="gap-2">
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">אפליקציה</span>
              </TabsTrigger>
            </TabsList>

            <TabsContents className="mt-6">
            {/* Business Hours Tab */}
            <TabsContent value="hours">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    שעות פעילות
                  </CardTitle>
                  <CardDescription>
                    הגדר מתי הצוות זמין לשיחות. מחוץ לשעות אלו יוצגו הודעות אופליין.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick preview of schedule */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-6">
                    <span className="text-sm text-muted-foreground">סקירה:</span>
                    <div className="flex items-center gap-1">
                      {DAYS.map((day) => {
                        const isActive = settings.business_hours.schedule[day.key] !== null;
                        return (
                          <Badge
                            key={day.key}
                            variant={isActive ? "default" : "outline"}
                            className="w-7 h-7 p-0 flex items-center justify-center text-xs"
                          >
                            {day.short}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {DAYS.map((day) => {
                    const schedule = settings.business_hours.schedule[day.key];
                    const isEnabled = schedule !== null;

                    return (
                      <div
                        key={day.key}
                        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="w-28 flex items-center gap-3">
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
                          <span className="font-medium">{day.label}</span>
                        </div>
                        {isEnabled ? (
                          <div className="flex items-center gap-3 flex-1" dir="ltr">
                            <TimePicker
                              value={schedule?.start || "09:00"}
                              onValueChange={(value) =>
                                updateSchedule(
                                  day.key,
                                  true,
                                  value,
                                  schedule?.end
                                )
                              }
                              locale="he-IL"
                            >
                              <TimePickerInputGroup className="w-[140px]">
                                <TimePickerInput segment="hour" />
                                <TimePickerSeparator />
                                <TimePickerInput segment="minute" />
                                <TimePickerTrigger />
                              </TimePickerInputGroup>
                              <TimePickerContent>
                                <TimePickerHour format="2-digit" />
                                <TimePickerMinute />
                              </TimePickerContent>
                            </TimePicker>
                            <span className="text-muted-foreground" dir="rtl">עד</span>
                            <TimePicker
                              value={schedule?.end || "18:00"}
                              onValueChange={(value) =>
                                updateSchedule(
                                  day.key,
                                  true,
                                  schedule?.start,
                                  value
                                )
                              }
                              locale="he-IL"
                            >
                              <TimePickerInputGroup className="w-[140px]">
                                <TimePickerInput segment="hour" />
                                <TimePickerSeparator />
                                <TimePickerInput segment="minute" />
                                <TimePickerTrigger />
                              </TimePickerInputGroup>
                              <TimePickerContent>
                                <TimePickerHour format="2-digit" />
                                <TimePickerMinute />
                              </TimePickerContent>
                            </TimePicker>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">סגור</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    הודעות מערכת
                  </CardTitle>
                  <CardDescription>
                    התאם את ההודעות האוטומטיות שהלקוחות רואים
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="welcome" className="flex items-center gap-2">
                      הודעת פתיחה
                      <Badge variant="secondary" className="text-[10px]">חובה</Badge>
                    </Label>
                    <Textarea
                      id="welcome"
                      value={settings.messages.welcome}
                      onChange={(e) => updateMessage("welcome", e.target.value)}
                      placeholder="היי! 👋 איך אפשר לעזור?"
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="offline">הודעת אופליין</Label>
                    <Textarea
                      id="offline"
                      value={settings.messages.offline}
                      onChange={(e) => updateMessage("offline", e.target.value)}
                      placeholder="אנחנו כרגע לא זמינים..."
                      className="resize-none"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      מוצגת כשאין נציגים מחוברים או מחוץ לשעות הפעילות
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="ask_contact">בקשת פרטי התקשרות</Label>
                    <Textarea
                      id="ask_contact"
                      value={settings.messages.ask_contact}
                      onChange={(e) => updateMessage("ask_contact", e.target.value)}
                      placeholder="האם תרצה שנחזור אליך באימייל או בוואטסאפ?"
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="transferred_to_whatsapp">העברה לוואטסאפ</Label>
                    <Textarea
                      id="transferred_to_whatsapp"
                      value={settings.messages.transferred_to_whatsapp}
                      onChange={(e) => updateMessage("transferred_to_whatsapp", e.target.value)}
                      placeholder="מעולה! ממשיכים את השיחה בוואטסאפ..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="going_offline">הודעת סיום משמרת</Label>
                    <Textarea
                      id="going_offline"
                      value={settings.messages.going_offline}
                      onChange={(e) => updateMessage("going_offline", e.target.value)}
                      placeholder="צוות התמיכה סיים את המשמרת..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="agent_joined">הודעת הצטרפות נציג</Label>
                    <Textarea
                      id="agent_joined"
                      value={settings.messages.agent_joined}
                      onChange={(e) => updateMessage("agent_joined", e.target.value)}
                      placeholder="אתה משוחח עכשיו עם {agent_name}"
                      className="resize-none"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      השתמש ב-{"{agent_name}"} להצגת שם הנציג
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Widget Tab */}
            <TabsContent value="widget">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    עיצוב Widget
                  </CardTitle>
                  <CardDescription>
                    התאם את מראה הצ'אט באתר שלך
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color Preview */}
                  <div className="p-6 rounded-xl border border-border bg-muted/30">
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-16 h-16 rounded-xl shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${settings.widget.primaryColor}, ${settings.widget.secondaryColor})`,
                        }}
                      />
                      <div>
                        <p className="font-medium">תצוגה מקדימה</p>
                        <p className="text-sm text-muted-foreground">
                          כך ייראה כפתור הצ'אט באתר
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>צבע ראשי</Label>
                      <ColorPicker
                        value={settings.widget.primaryColor}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, primaryColor: value },
                          })
                        }
                      >
                        <ColorPickerTrigger className="w-full justify-start gap-3">
                          <ColorPickerSwatch className="size-6" />
                          <span className="font-mono text-sm">{settings.widget.primaryColor}</span>
                        </ColorPickerTrigger>
                        <ColorPickerContent>
                          <ColorPickerArea />
                          <ColorPickerHueSlider />
                          <div className="flex items-center gap-2">
                            <ColorPickerSwatch />
                            <ColorPickerInput withoutAlpha />
                            <ColorPickerEyeDropper />
                          </div>
                        </ColorPickerContent>
                      </ColorPicker>
                    </div>

                    <div className="space-y-3">
                      <Label>צבע משני</Label>
                      <ColorPicker
                        value={settings.widget.secondaryColor}
                        onValueChange={(value) =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, secondaryColor: value },
                          })
                        }
                      >
                        <ColorPickerTrigger className="w-full justify-start gap-3">
                          <ColorPickerSwatch className="size-6" />
                          <span className="font-mono text-sm">{settings.widget.secondaryColor}</span>
                        </ColorPickerTrigger>
                        <ColorPickerContent>
                          <ColorPickerArea />
                          <ColorPickerHueSlider />
                          <div className="flex items-center gap-2">
                            <ColorPickerSwatch />
                            <ColorPickerInput withoutAlpha />
                            <ColorPickerEyeDropper />
                          </div>
                        </ColorPickerContent>
                      </ColorPicker>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>מיקום Widget</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={settings.widget.position === "right" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, position: "right" },
                          })
                        }
                        className="flex-1"
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
                        className="flex-1"
                      >
                        שמאל
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>שפה וכיוון</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={settings.widget.language === "en" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, language: "en" },
                          })
                        }
                        className="flex-1"
                      >
                        English (LTR)
                      </Button>
                      <Button
                        type="button"
                        variant={settings.widget.language === "he" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, language: "he" },
                          })
                        }
                        className="flex-1"
                      >
                        עברית (RTL)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>ערכת נושא</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={settings.widget.theme === "light" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, theme: "light" },
                          })
                        }
                        className="flex-1"
                      >
                        בהיר
                      </Button>
                      <Button
                        type="button"
                        variant={settings.widget.theme === "dark" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, theme: "dark" },
                          })
                        }
                        className="flex-1"
                      >
                        כהה
                      </Button>
                      <Button
                        type="button"
                        variant={settings.widget.theme === "auto" ? "default" : "outline"}
                        onClick={() =>
                          setSettings({
                            ...settings,
                            widget: { ...settings.widget, theme: "auto" },
                          })
                        }
                        className="flex-1"
                      >
                        אוטומטי
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      אוטומטי - יתאים את עצמו להגדרות המערכת של המשתמש
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label>רקע צ'אט</Label>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { id: "none", label: "ללא", preview: "bg-white" },
                        { id: "dots", label: "נקודות", preview: "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:16px_16px]" },
                        { id: "grid", label: "רשת", preview: "bg-[linear-gradient(#e5e7eb_1px,transparent_1px),linear-gradient(90deg,#e5e7eb_1px,transparent_1px)] bg-[size:20px_20px]" },
                        { id: "waves", label: "גלים", preview: "bg-gradient-to-br from-blue-50 to-purple-50" },
                        { id: "bubbles", label: "בועות", preview: "bg-gradient-to-br from-pink-50 via-white to-cyan-50" },
                        { id: "doodles", label: "דודלס", preview: "bg-[url('/patterns/doodles.svg')] bg-repeat bg-[length:200px]" },
                        { id: "geometric", label: "גיאומטרי", preview: "bg-[url('/patterns/geometric.svg')] bg-repeat bg-[length:100px]" },
                        { id: "confetti", label: "קונפטי", preview: "bg-[url('/patterns/confetti.svg')] bg-repeat bg-[length:150px]" },
                      ].map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              widget: { ...settings.widget, chatBackground: bg.id },
                            })
                          }
                          className={`relative aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                            settings.widget.chatBackground === bg.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className={`absolute inset-0 ${bg.preview}`} />
                          <span className="absolute bottom-1 left-0 right-0 text-[10px] font-medium text-center bg-white/80 backdrop-blur-sm py-0.5">
                            {bg.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Embed Code - HTML */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center gap-2">
                      <Share className="w-4 h-4" />
                      קוד להטמעה - HTML / WordPress
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      העתק את הקוד הבא והוסף אותו לאתר שלך (לפני סגירת תגית body)
                    </p>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted/50 border text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" dir="ltr">
{`<script>
  window.WHIZCHAT_API_URL = '${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}';
  window.WHIZCHAT_CONFIG = {
    position: '${settings.widget.position}',
    primaryColor: '${settings.widget.primaryColor}',
    secondaryColor: '${settings.widget.secondaryColor}',
    language: '${settings.widget.language}',
    theme: '${settings.widget.theme}',
    chatBackground: '${settings.widget.chatBackground}'
  };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget.js?v=1.6.1" defer></script>`}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 left-2"
                        onClick={() => {
                          const code = `<script>
  window.WHIZCHAT_API_URL = '${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}';
  window.WHIZCHAT_CONFIG = {
    position: '${settings.widget.position}',
    primaryColor: '${settings.widget.primaryColor}',
    secondaryColor: '${settings.widget.secondaryColor}',
    language: '${settings.widget.language}',
    theme: '${settings.widget.theme}',
    chatBackground: '${settings.widget.chatBackground}'
  };
</script>
<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget.js?v=1.6.1" defer></script>`;
                          navigator.clipboard.writeText(code);
                        }}
                      >
                        העתק
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      לוורדפרס: הוסף את הקוד ב-functions.php עם add_action('wp_footer', ...)
                    </p>
                  </div>

                  {/* Embed Code - Next.js */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center gap-2">
                      <Share className="w-4 h-4" />
                      קוד להטמעה - Next.js
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      צור קומפוננטה חדשה והוסף אותה ל-layout.tsx הראשי
                    </p>
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-muted/50 border text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono" dir="ltr">
{`// components/WhizChatWidget.tsx
'use client';

import Script from 'next/script';

export function WhizChatWidget() {
  return (
    <>
      <Script id="whizchat-config" strategy="beforeInteractive">
        {\`
          window.WHIZCHAT_API_URL = '${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}';
          window.WHIZCHAT_CONFIG = {
            position: '${settings.widget.position}',
            primaryColor: '${settings.widget.primaryColor}',
            secondaryColor: '${settings.widget.secondaryColor}',
            language: '${settings.widget.language}',
            theme: '${settings.widget.theme}',
            chatBackground: '${settings.widget.chatBackground}'
          };
        \`}
      </Script>
      <Script
        src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget.js?v=1.6.1"
        strategy="afterInteractive"
      />
    </>
  );
}

// בקובץ app/layout.tsx הוסף:
// import { WhizChatWidget } from '@/components/WhizChatWidget';
// ובתוך ה-body: <WhizChatWidget />`}
                      </pre>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 left-2"
                        onClick={() => {
                          const code = `// components/WhizChatWidget.tsx
'use client';

import Script from 'next/script';

export function WhizChatWidget() {
  return (
    <>
      <Script id="whizchat-config" strategy="beforeInteractive">
        {\`
          window.WHIZCHAT_API_URL = '${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}';
          window.WHIZCHAT_CONFIG = {
            position: '${settings.widget.position}',
            primaryColor: '${settings.widget.primaryColor}',
            secondaryColor: '${settings.widget.secondaryColor}',
            language: '${settings.widget.language}',
            theme: '${settings.widget.theme}',
            chatBackground: '${settings.widget.chatBackground}'
          };
        \`}
      </Script>
      <Script
        src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/widget.js?v=1.6.1"
        strategy="afterInteractive"
      />
    </>
  );
}

// בקובץ app/layout.tsx הוסף:
// import { WhizChatWidget } from '@/components/WhizChatWidget';
// ובתוך ה-body: <WhizChatWidget />`;
                          navigator.clipboard.writeText(code);
                        }}
                      >
                        העתק
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      הקומפוננטה משתמשת ב-next/script לטעינה אופטימלית
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Tab */}
            <TabsContent value="whatsapp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-500" />
                    WhatsApp Business
                  </CardTitle>
                  <CardDescription>
                    הגדרות אינטגרציה עם Green API לשליחת הודעות ב-WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      כדי להשתמש באינטגרציית WhatsApp, יש להירשם ל-
                      <a
                        href="https://green-api.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium"
                      >
                        Green API
                      </a>
                      {" "}ולקבל את פרטי החיבור.
                    </p>
                  </div>

                  <div className="space-y-3">
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
                      placeholder="+972501234567"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-3">
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
                      placeholder="1234567890"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="apiToken">API Token</Label>
                    <PasswordInput
                      id="apiToken"
                      value={settings.whatsapp.apiToken}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, apiToken: e.target.value },
                        })
                      }
                      placeholder="••••••••••••••••"
                      dir="ltr"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Notifications Card */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-emerald-500" />
                    התראות WhatsApp לנציגים
                  </CardTitle>
                  <CardDescription>
                    בחר אילו נציגים יקבלו התראה ב-WhatsApp כאשר מתקבלת הודעה חדשה
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      אין נציגים במערכת
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-brand-gradient text-white text-sm">
                                {agent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{agent.name}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                {agent.phone || "לא הוגדר מספר טלפון"}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={agent.receiveWhatsappNotifications}
                            onCheckedChange={(checked) => toggleAgentNotification(agent.id, checked)}
                            disabled={!agent.phone}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    * נציגים ללא מספר טלפון לא יכולים לקבל התראות. ניתן להוסיף מספר טלפון בעמוד הנציגים.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Archive Tab */}
            <TabsContent value="archive">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-primary" />
                    הגדרות ארכיון
                  </CardTitle>
                  <CardDescription>
                    קבע מתי שיחות סגורות יועברו לארכיון אוטומטית
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
                    <div className="space-y-1">
                      <Label className="text-base">ארכיון אוטומטי</Label>
                      <p className="text-sm text-muted-foreground">
                        העבר שיחות סגורות לארכיון אוטומטית
                      </p>
                    </div>
                    <Switch
                      checked={settings.archive.autoArchiveEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          archive: { ...settings.archive, autoArchiveEnabled: checked },
                        })
                      }
                    />
                  </div>

                  {settings.archive.autoArchiveEnabled && (
                    <Fade inView>
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                        <Label className="shrink-0">העבר לארכיון אחרי</Label>
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
                          className="w-20 text-center"
                          min={1}
                          dir="ltr"
                        />
                        <span className="text-muted-foreground shrink-0">ימים</span>
                      </div>
                    </Fade>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* App Tab */}
            <TabsContent value="app">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    התקנת אפליקציה
                  </CardTitle>
                  <CardDescription>
                    התקן את WhizChat כאפליקציה במכשיר שלך לגישה מהירה
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isInstalled ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">האפליקציה מותקנת!</p>
                        <p className="text-sm text-muted-foreground">
                          WhizChat מותקנת במכשיר שלך
                        </p>
                      </div>
                    </div>
                  ) : isIOS ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                        <Share className="w-6 h-6 text-primary mt-0.5" />
                        <div className="space-y-2">
                          <p className="font-medium">התקנה באייפון/אייפד</p>
                          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                            <li>לחץ על כפתור השיתוף <Share className="w-4 h-4 inline mx-1" /> בסרגל הדפדפן</li>
                            <li>גלול למטה ובחר "הוסף למסך הבית"</li>
                            <li>לחץ "הוסף" בפינה הימנית העליונה</li>
                          </ol>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-dashed border-muted-foreground/30 text-center">
                        <Smartphone className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          לאחר ההתקנה, האפליקציה תופיע במסך הבית שלך
                        </p>
                      </div>
                    </div>
                  ) : isInstallable ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                        <Download className="w-6 h-6 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">התקנה מהירה</p>
                          <p className="text-sm text-muted-foreground">
                            לחץ על הכפתור למטה להתקנת האפליקציה במכשיר שלך
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={install}
                        size="lg"
                        className="w-full gap-2"
                      >
                        <Download className="w-5 h-5" />
                        התקן אפליקציה
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                      <Smartphone className="w-6 h-6 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">התקנה לא זמינה</p>
                        <p className="text-sm text-muted-foreground">
                          פתח את האתר בדפדפן Chrome או Edge כדי להתקין את האפליקציה
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">יתרונות האפליקציה</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        גישה מהירה ישירות ממסך הבית
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        חוויה דומה לאפליקציה מותקנת
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        עובדת במצב מסך מלא
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        התראות על הודעות חדשות
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            </TabsContents>
          </Tabs>
        </Fade>
        </div>
      </div>
    </div>
  );
}
