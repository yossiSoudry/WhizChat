"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MessageSquare,
  TrendingUp,
  Clock,
  HelpCircle,
  Smartphone,
  Monitor,
  MessageCircle,
} from "lucide-react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { ChartLine } from "@/components/animate-ui/icons/chart-line";
import { Users } from "@/components/animate-ui/icons/users";
import { MessageCircleMore } from "@/components/animate-ui/icons/message-circle-more";
import { cn } from "@/lib/utils";
import { MobileHeader } from "@/components/dashboard/mobile-header";

interface AnalyticsData {
  overview: {
    totalConversations: number;
    activeConversations: number;
    closedConversations: number;
    todayConversations: number;
    weekConversations: number;
    totalMessages: number;
    todayMessages: number;
    weekMessages: number;
    customerMessages: number;
    agentMessages: number;
    avgMessagesPerConversation: number;
  };
  agents: {
    total: number;
    online: number;
    active: number;
  };
  faq: {
    totalClicks: number;
    topItems: { question: string; clickCount: number }[];
  };
  charts: {
    dailyConversations: { date: string; count: number }[];
    dailyMessages: { date: string; count: number }[];
  };
  sources: {
    widget: number;
    whatsapp: number;
    dashboard: number;
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  glowColor = "shadow-primary/20",
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  iconColor?: string;
  iconBg?: string;
  glowColor?: string;
}) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground/80">{description}</p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", iconBg, glowColor)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant={trend.value >= 0 ? "success" : "destructive"}
              className="text-xs shadow-sm"
            >
              <TrendingUp
                className={cn(
                  "w-3 h-3 mr-1",
                  trend.value < 0 && "rotate-180"
                )}
              />
              {trend.value >= 0 ? "+" : ""}{trend.value}%
            </Badge>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({
  data,
  color = "bg-primary",
  gradientFrom = "from-primary",
  gradientTo = "to-primary/60",
}: {
  data: { date: string; count: number }[];
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-24 px-2">
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 100;
        const dayName = new Date(item.date).toLocaleDateString("he-IL", {
          weekday: "short",
        });
        const isToday = index === data.length - 1;

        return (
          <div
            key={index}
            className="flex flex-col items-center gap-2 flex-1 group"
          >
            <div className="w-full flex items-end justify-center h-16 relative">
              <div
                className={cn(
                  "w-full max-w-8 rounded-t-lg transition-all duration-300 bg-gradient-to-t",
                  gradientFrom,
                  gradientTo,
                  isToday && "ring-2 ring-offset-2 ring-offset-background",
                  isToday && color === "bg-primary" ? "ring-primary/50" : "ring-blue-500/50",
                  "group-hover:opacity-80"
                )}
                style={{ height: `${Math.max(height, 8)}%` }}
              />
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                {item.count}
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-medium transition-colors",
              isToday ? "text-foreground" : "text-muted-foreground"
            )}>{dayName}</span>
          </div>
        );
      })}
    </div>
  );
}

function SourcesBreakdown({
  sources,
}: {
  sources: { widget: number; whatsapp: number; dashboard: number };
}) {
  const total = sources.widget + sources.whatsapp + sources.dashboard;
  if (total === 0) return null;

  const items = [
    {
      label: "Widget",
      value: sources.widget,
      color: "bg-primary",
      bgColor: "bg-primary/10",
      icon: Monitor,
    },
    {
      label: "WhatsApp",
      value: sources.whatsapp,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-500/10",
      icon: Smartphone,
    },
    {
      label: "Dashboard",
      value: sources.dashboard,
      color: "bg-blue-500",
      bgColor: "bg-blue-500/10",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-muted/50 shadow-inner">
        {items.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div
              key={index}
              className={cn("transition-all duration-500 first:rounded-r-full last:rounded-l-full", item.color)}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors", item.bgColor)}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.color)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 w-12 h-12 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">טוען סטטיסטיקות...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        לא ניתן לטעון את הסטטיסטיקות
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <MobileHeader
        title="סטטיסטיקות"
        subtitle="סקירה כללית"
        icon={<ChartLine className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Header - hidden on mobile */}
          <Fade inView className="hidden md:block">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 w-12 h-12 bg-primary/30 rounded-xl blur-lg" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                  <ChartLine className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">סטטיסטיקות</h1>
                <p className="text-muted-foreground text-sm">
                  סקירה כללית של פעילות המערכת
                </p>
              </div>
            </div>
          </Fade>

        {/* Overview Stats */}
        <Fade inView delay={50}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="סה״כ שיחות"
              value={data.overview.totalConversations}
              description={`${data.overview.activeConversations} פעילות`}
              icon={MessageCircleMore}
              trend={{
                value: data.overview.weekConversations > 0 ? 12 : 0,
                label: "מהשבוע שעבר",
              }}
            />
            <StatCard
              title="הודעות היום"
              value={data.overview.todayMessages}
              description={`מתוך ${data.overview.totalMessages} סה״כ`}
              icon={MessageSquare}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <StatCard
              title="נציגים מחוברים"
              value={data.agents.online}
              description={`מתוך ${data.agents.total} נציגים`}
              icon={Users}
              iconColor="text-emerald-500"
              iconBg="bg-emerald-500/10"
            />
            <StatCard
              title="ממוצע הודעות לשיחה"
              value={data.overview.avgMessagesPerConversation}
              description="הודעות לכל שיחה"
              icon={Clock}
              iconColor="text-amber-500"
              iconBg="bg-amber-500/10"
            />
          </div>
        </Fade>

        {/* Charts Row */}
        <Fade inView delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Conversations */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-primary/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageCircleMore className="w-4 h-4 text-primary" />
                  </div>
                  שיחות ב-7 ימים אחרונים
                </CardTitle>
                <CardDescription>
                  {data.overview.weekConversations} שיחות חדשות השבוע
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <MiniBarChart data={data.charts.dailyConversations} />
              </CardContent>
            </Card>

            {/* Daily Messages */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-blue-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                  </div>
                  הודעות ב-7 ימים אחרונים
                </CardTitle>
                <CardDescription>
                  {data.overview.weekMessages} הודעות השבוע
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <MiniBarChart
                  data={data.charts.dailyMessages}
                  color="bg-blue-500"
                  gradientFrom="from-blue-500"
                  gradientTo="to-blue-500/60"
                />
              </CardContent>
            </Card>
          </div>
        </Fade>

        {/* Sources & FAQ Row */}
        <Fade inView delay={150}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Sources */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-muted/30 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-emerald-500/20 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-primary" />
                  </div>
                  מקורות הודעות
                </CardTitle>
                <CardDescription>
                  פילוח לפי מקור ההודעה
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <SourcesBreakdown sources={data.sources} />
              </CardContent>
            </Card>

            {/* Top FAQ Items */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-amber-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  שאלות נפוצות פופולריות
                </CardTitle>
                <CardDescription>
                  {data.faq.totalClicks} קליקים סה״כ
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {data.faq.topItems.length > 0 ? (
                  <div className="space-y-3">
                    {data.faq.topItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className={cn(
                            "shrink-0 w-7 h-7 rounded-full flex items-center justify-center p-0 font-bold",
                            index === 0 && "bg-amber-500/10 text-amber-500 border-amber-500/30",
                            index === 1 && "bg-slate-400/10 text-slate-500 border-slate-400/30",
                            index === 2 && "bg-orange-600/10 text-orange-600 border-orange-600/30"
                          )}>
                            {index + 1}
                          </Badge>
                          <span className="text-sm font-medium truncate">{item.question}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {item.clickCount} קליקים
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <HelpCircle className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      אין נתונים עדיין
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Fade>

        {/* Message Breakdown */}
        <Fade inView delay={200}>
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-l from-muted/30 to-transparent">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 via-blue-500/10 to-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                פילוח הודעות
              </CardTitle>
              <CardDescription>
                התפלגות הודעות לפי סוג שולח
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">
                    {data.overview.customerMessages}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">הודעות לקוחות</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-blue-500">
                    {data.overview.agentMessages}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">הודעות נציגים</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <MessageCircleMore className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-500">
                    {data.overview.todayConversations}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">שיחות היום</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold text-amber-500">
                    {data.overview.closedConversations}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">שיחות סגורות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Fade>
        </div>
      </div>
    </div>
  );
}
