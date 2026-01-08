"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  GripVertical,
  Loader2,
  Zap,
  Eye,
  Command,
  Lightbulb,
  Edit2,
} from "lucide-react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash } from "@/components/animate-ui/icons/trash";
import { X } from "@/components/animate-ui/icons/x";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { ChevronUp } from "@/components/animate-ui/icons/chevron-up";
import { MessageSquareMore } from "@/components/animate-ui/icons/message-square-more";
import { cn } from "@/lib/utils";
import { MobileHeader } from "@/components/dashboard/mobile-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  displayOrder: number;
  isActive: boolean;
}

// Sortable Quick Reply Item component
function SortableQuickReplyItem({
  item,
  isEditing,
  formData,
  setFormData,
  onEdit,
  onUpdate,
  onDelete,
  onToggleActive,
  onCancelEdit,
  isExpanded,
  onToggleExpand,
}: {
  item: QuickReply;
  isEditing: boolean;
  formData: { title: string; content: string; shortcut: string; isActive: boolean };
  setFormData: (data: { title: string; content: string; shortcut: string; isActive: boolean }) => void;
  onEdit: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onCancelEdit: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item rounded-xl border-0 bg-card shadow-md hover:shadow-lg transition-all duration-300",
        isDragging && "shadow-xl ring-2 ring-amber-500/30 z-50 scale-[1.02]",
        !item.isActive && "opacity-60"
      )}
    >
      {isEditing ? (
        <CardContent className="pt-6 space-y-4 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="space-y-2">
            <Label>כותרת</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>קיצור (אופציונלי)</Label>
            <Input
              value={formData.shortcut}
              onChange={(e) =>
                setFormData({ ...formData, shortcut: e.target.value })
              }
              placeholder="/pricing"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>תוכן</Label>
            <Textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              rows={4}
            />
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
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <button
              className="mt-1 cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-muted/80 transition-colors opacity-50 group-hover/item:opacity-100"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <button
                onClick={onToggleExpand}
                className="w-full text-right"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover/item:text-amber-600 dark:group-hover/item:text-amber-500 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.shortcut && (
                        <Badge variant="outline" className="font-mono text-[10px] gap-1 bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400">
                          <Command className="w-2.5 h-2.5" />
                          {item.shortcut}
                        </Badge>
                      )}
                      <Badge
                        variant={item.isActive ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {item.isActive ? "פעיל" : "לא פעיל"}
                      </Badge>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expandable Content */}
              {isExpanded && (
                <Fade inView>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg">
                      {item.content}
                    </p>
                  </div>
                </Fade>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity">
              <Switch
                checked={item.isActive}
                onCheckedChange={onToggleActive}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AnimateIcon animateOnHover asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </AnimateIcon>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuickRepliesPage() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    isActive: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch("/api/admin/quick-replies");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch quick replies:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          shortcut: formData.shortcut || null,
          displayOrder: items.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems([...items, data.quickReply]);
        setIsCreating(false);
        setFormData({ title: "", content: "", shortcut: "", isActive: true });
      }
    } catch (error) {
      console.error("Failed to create quick reply:", error);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/admin/quick-replies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          shortcut: formData.shortcut || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems(items.map((item) => (item.id === id ? data.quickReply : item)));
        setEditingId(null);
        setFormData({ title: "", content: "", shortcut: "", isActive: true });
      }
    } catch (error) {
      console.error("Failed to update quick reply:", error);
    }
  }

  function handleDelete(id: string) {
    setDeleteConfirmId(id);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmId) return;

    try {
      const res = await fetch(`/api/admin/quick-replies/${deleteConfirmId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems(items.filter((item) => item.id !== deleteConfirmId));
      }
    } catch (error) {
      console.error("Failed to delete quick reply:", error);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const res = await fetch(`/api/admin/quick-replies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          content: item.content,
          shortcut: item.shortcut,
          isActive,
        }),
      });

      if (res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, isActive } : i)));
      }
    } catch (error) {
      console.error("Failed to toggle quick reply:", error);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);

      // TODO: Save new order to backend
    }
  }

  function startEdit(item: QuickReply) {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      shortcut: item.shortcut || "",
      isActive: item.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ title: "", content: "", shortcut: "", isActive: true });
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 w-12 h-12 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">טוען תשובות מהירות...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <MobileHeader
        title="תשובות מהירות"
        subtitle="תבניות תשובה"
        icon={<MessageSquareMore className="w-5 h-5 text-amber-500" />}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header - hidden on mobile */}
          <Fade inView className="hidden md:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 w-12 h-12 bg-amber-500/30 rounded-xl blur-lg" />
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">תשובות מהירות</h1>
                  <p className="text-muted-foreground text-sm">
                    תשובות מוכנות מראש לשימוש מהיר בצ'אט
                  </p>
                </div>
              </div>
              {!isCreating && (
                <AnimateIcon animateOnHover asChild>
                  <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4" />
                    הוסף תשובה מהירה
                  </Button>
                </AnimateIcon>
              )}
            </div>
          </Fade>

          {/* Mobile add button */}
          {!isCreating && (
            <div className="md:hidden">
              <AnimateIcon animateOnHover asChild>
                <Button onClick={() => setIsCreating(true)} className="gap-2 w-full">
                  <Plus className="w-4 h-4" />
                  הוסף תשובה מהירה
                </Button>
              </AnimateIcon>
            </div>
          )}

        {/* Usage Tip */}
        <Fade inView delay={50}>
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10 overflow-hidden">
            <CardContent className="py-4 relative">
              <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
              <div className="flex items-start gap-3 relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center shrink-0 shadow-sm">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    איך להשתמש?
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-500">
                    הקלד את הקיצור בתיבת ההודעה (למשל <code className="bg-amber-200/70 dark:bg-amber-900/50 px-2 py-0.5 rounded-md font-mono text-xs font-medium">/pricing</code>) והתשובה תוכנס אוטומטית.
                    ניתן גם לבחור תשובה מהירה מהתפריט.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Fade>

        {/* Stats */}
        {items.length > 0 && (
          <Fade inView delay={100}>
            <div className="grid grid-cols-3 gap-4">
              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="relative">
                    <p className="text-2xl font-bold">{items.length}</p>
                    <p className="text-xs text-muted-foreground">סה"כ תשובות</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Eye className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="relative">
                    <p className="text-2xl font-bold">
                      {items.filter((i) => i.isActive).length}
                    </p>
                    <p className="text-xs text-muted-foreground">תשובות פעילות</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Command className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="relative">
                    <p className="text-2xl font-bold">
                      {items.filter((i) => i.shortcut).length}
                    </p>
                    <p className="text-xs text-muted-foreground">עם קיצורים</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Fade>
        )}

        {/* Create Form */}
        {isCreating && (
          <Fade inView>
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-l from-amber-500/5 to-transparent">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-amber-500" />
                  </div>
                  תשובה מהירה חדשה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="למשל: מחירים"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shortcut">קיצור (אופציונלי)</Label>
                  <Input
                    id="shortcut"
                    value={formData.shortcut}
                    onChange={(e) =>
                      setFormData({ ...formData, shortcut: e.target.value })
                    }
                    placeholder="/pricing"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    התחל עם / לקיצור קל יותר
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">תוכן</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="תוכן התשובה המהירה..."
                    rows={4}
                  />
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

        {/* Quick Replies List with Drag & Drop */}
        <Fade inView delay={150}>
          {items.length === 0 && !isCreating ? (
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardContent className="py-16 text-center relative">
                <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-amber-500/5 blur-2xl" />
                <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-blue-500/5 blur-2xl" />
                <div className="relative mb-6 mx-auto w-fit">
                  <div className="absolute inset-0 w-20 h-20 bg-amber-500/15 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 flex items-center justify-center border border-amber-500/10 shadow-lg shadow-amber-500/10">
                    <Zap className="w-9 h-9 text-amber-500/60" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg relative">אין תשובות מהירות עדיין</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-[250px] mx-auto relative">
                  צור תשובות מוכנות מראש כדי לענות ללקוחות מהר יותר
                </p>
                <AnimateIcon animateOnHover asChild>
                  <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-lg shadow-primary/20 relative">
                    <Plus className="w-4 h-4" />
                    הוסף תשובה ראשונה
                  </Button>
                </AnimateIcon>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {items.map((item) => (
                    <SortableQuickReplyItem
                      key={item.id}
                      item={item}
                      isEditing={editingId === item.id}
                      formData={formData}
                      setFormData={setFormData}
                      onEdit={() => startEdit(item)}
                      onUpdate={() => handleUpdate(item.id)}
                      onDelete={() => handleDelete(item.id)}
                      onToggleActive={(active) => handleToggleActive(item.id, active)}
                      onCancelEdit={cancelEdit}
                      isExpanded={expandedIds.has(item.id)}
                      onToggleExpand={() => toggleExpand(item.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </Fade>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="מחיקת תשובה מהירה"
        description="האם אתה בטוח שברצונך למחוק תשובה מהירה זו?"
        confirmText="מחק"
        cancelText="ביטול"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
