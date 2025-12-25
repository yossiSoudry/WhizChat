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
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2">
            <Badge
              variant={trend.value >= 0 ? "success" : "destructive"}
              className="text-xs"
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
}: {
  data: { date: string; count: number }[];
  color?: string;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end justify-between gap-1 h-16">
      {data.map((item, index) => {
        const height = (item.count / maxCount) * 100;
        const dayName = new Date(item.date).toLocaleDateString("he-IL", {
          weekday: "short",
        });

        return (
          <div
            key={index}
            className="flex flex-col items-center gap-1 flex-1"
          >
            <div className="w-full flex items-end justify-center h-12">
              <div
                className={cn("w-full max-w-6 rounded-t transition-all", color)}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{dayName}</span>
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
      icon: Monitor,
    },
    {
      label: "WhatsApp",
      value: sources.whatsapp,
      color: "bg-emerald-500",
      icon: Smartphone,
    },
    {
      label: "Dashboard",
      value: sources.dashboard,
      color: "bg-blue-500",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        {items.map((item, index) => {
          const percentage = (item.value / total) * 100;
          return (
            <div
              key={index}
              className={cn("transition-all", item.color)}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", item.color)} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-muted-foreground">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </p>
            </div>
          </div>
        ))}
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">טוען סטטיסטיקות...</span>
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
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Fade inView>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ChartLine className="w-5 h-5 text-primary" />
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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircleMore className="w-5 h-5 text-primary" />
                  שיחות ב-7 ימים אחרונים
                </CardTitle>
                <CardDescription>
                  {data.overview.weekConversations} שיחות חדשות השבוע
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={data.charts.dailyConversations} />
              </CardContent>
            </Card>

            {/* Daily Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  הודעות ב-7 ימים אחרונים
                </CardTitle>
                <CardDescription>
                  {data.overview.weekMessages} הודעות השבוע
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MiniBarChart
                  data={data.charts.dailyMessages}
                  color="bg-blue-500"
                />
              </CardContent>
            </Card>
          </div>
        </Fade>

        {/* Sources & FAQ Row */}
        <Fade inView delay={150}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מקורות הודעות</CardTitle>
                <CardDescription>
                  פילוח לפי מקור ההודעה
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SourcesBreakdown sources={data.sources} />
              </CardContent>
            </Card>

            {/* Top FAQ Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-500" />
                  שאלות נפוצות פופולריות
                </CardTitle>
                <CardDescription>
                  {data.faq.totalClicks} קליקים סה״כ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.faq.topItems.length > 0 ? (
                  <div className="space-y-3">
                    {data.faq.topItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="shrink-0">
                            {index + 1}
                          </Badge>
                          <span className="text-sm truncate">{item.question}</span>
                        </div>
                        <span className="text-sm text-muted-foreground shrink-0">
                          {item.clickCount} קליקים
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    אין נתונים עדיין
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </Fade>

        {/* Message Breakdown */}
        <Fade inView delay={200}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">פילוח הודעות</CardTitle>
              <CardDescription>
                התפלגות הודעות לפי סוג שולח
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {data.overview.customerMessages}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">הודעות לקוחות</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-500">
                    {data.overview.agentMessages}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">הודעות נציגים</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-500">
                    {data.overview.todayConversations}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">שיחות היום</p>
                </div>
                <div className="text-center">
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
  );
}
