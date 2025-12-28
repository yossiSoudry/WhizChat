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
  HelpCircle,
  Eye,
  MousePointerClick,
  Edit2,
} from "lucide-react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Plus } from "@/components/animate-ui/icons/plus";
import { Trash } from "@/components/animate-ui/icons/trash";
import { X } from "@/components/animate-ui/icons/x";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { ChevronUp } from "@/components/animate-ui/icons/chevron-up";
import { MessageCircleQuestion } from "@/components/animate-ui/icons/message-circle-question";
import { cn } from "@/lib/utils";
import { MobileHeader } from "@/components/dashboard/mobile-header";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  clickCount: number;
}

// Sortable FAQ Item component
function SortableFAQItem({
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
  item: FAQItem;
  isEditing: boolean;
  formData: { question: string; answer: string; isActive: boolean };
  setFormData: (data: { question: string; answer: string; isActive: boolean }) => void;
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
        "rounded-xl border bg-card transition-all",
        isDragging && "shadow-lg ring-2 ring-primary/20 z-50",
        !item.isActive && "opacity-60"
      )}
    >
      {isEditing ? (
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>שאלה</Label>
            <Input
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>תשובה</Label>
            <Textarea
              value={formData.answer}
              onChange={(e) =>
                setFormData({ ...formData, answer: e.target.value })
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
              className="mt-1 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
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
                    <h3 className="font-medium text-foreground">
                      {item.question}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant={item.isActive ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {item.isActive ? "פעיל" : "לא פעיל"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" />
                        {item.clickCount}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>

              {/* Expandable Answer */}
              {isExpanded && (
                <Fade inView>
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.answer}
                    </p>
                  </div>
                </Fade>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={item.isActive}
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
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
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
      const res = await fetch("/api/admin/faq");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch FAQ items:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          displayOrder: items.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems([...items, data.item]);
        setIsCreating(false);
        setFormData({ question: "", answer: "", isActive: true });
      }
    } catch (error) {
      console.error("Failed to create FAQ item:", error);
    }
  }

  async function handleUpdate(id: string) {
    try {
      const res = await fetch(`/api/admin/faq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setItems(items.map((item) => (item.id === id ? data.item : item)));
        setEditingId(null);
        setFormData({ question: "", answer: "", isActive: true });
      }
    } catch (error) {
      console.error("Failed to update FAQ item:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק שאלה זו?")) return;

    try {
      const res = await fetch(`/api/admin/faq/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems(items.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete FAQ item:", error);
    }
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const res = await fetch(`/api/admin/faq/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: item.question,
          answer: item.answer,
          isActive,
        }),
      });

      if (res.ok) {
        setItems(items.map((i) => (i.id === id ? { ...i, isActive } : i)));
      }
    } catch (error) {
      console.error("Failed to toggle FAQ item:", error);
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
      // Could batch update displayOrder for all items
    }
  }

  function startEdit(item: FAQItem) {
    setEditingId(item.id);
    setFormData({
      question: item.question,
      answer: item.answer,
      isActive: item.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setFormData({ question: "", answer: "", isActive: true });
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">טוען שאלות נפוצות...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      <MobileHeader
        title="שאלות נפוצות"
        subtitle="ניהול FAQ"
        icon={<MessageCircleQuestion className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header - hidden on mobile */}
          <Fade inView className="hidden md:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">שאלות נפוצות</h1>
                  <p className="text-muted-foreground text-sm">
                    נהל את השאלות הנפוצות שמוצגות ללקוחות בצ'אט
                  </p>
                </div>
              </div>
              {!isCreating && (
                <AnimateIcon animateOnHover asChild>
                  <Button onClick={() => setIsCreating(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף שאלה
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
                  הוסף שאלה
                </Button>
              </AnimateIcon>
            </div>
          )}

        {/* Stats */}
        {items.length > 0 && (
          <Fade inView delay={50}>
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{items.length}</p>
                    <p className="text-xs text-muted-foreground">סה"כ שאלות</p>
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
                      {items.filter((i) => i.isActive).length}
                    </p>
                    <p className="text-xs text-muted-foreground">שאלות פעילות</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MousePointerClick className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {items.reduce((acc, i) => acc + i.clickCount, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">סה"כ קליקים</p>
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
                <CardTitle className="text-lg">שאלה חדשה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question">שאלה</Label>
                  <Input
                    id="question"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                    placeholder="למשל: איך אני מתחיל?"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="answer">תשובה</Label>
                  <Textarea
                    id="answer"
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData({ ...formData, answer: e.target.value })
                    }
                    placeholder="התשובה לשאלה..."
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

        {/* FAQ Items List with Drag & Drop */}
        <Fade inView delay={100}>
          {items.length === 0 && !isCreating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">אין שאלות נפוצות עדיין</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  הוסף שאלות נפוצות כדי לעזור ללקוחות למצוא תשובות מהר יותר
                </p>
                <AnimateIcon animateOnHover asChild>
                  <Button onClick={() => setIsCreating(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף שאלה ראשונה
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
                    <SortableFAQItem
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
    </div>
  );
}
