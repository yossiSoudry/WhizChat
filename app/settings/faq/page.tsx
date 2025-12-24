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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  GripVertical,
  Loader2,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  clickCount: number;
}

export default function FAQPage() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    isActive: true,
  });

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

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <div>
              <h1 className="text-2xl font-bold">שאלות נפוצות</h1>
              <p className="text-muted-foreground">
                נהל את השאלות הנפוצות שמוצגות ללקוחות
              </p>
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף שאלה
              </Button>
            )}
          </div>

          {/* Create Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>שאלה חדשה</CardTitle>
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
                  <Button onClick={handleCreate}>
                    <Save className="w-4 h-4 ml-2" />
                    שמור
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="w-4 h-4 ml-2" />
                    ביטול
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FAQ Items List */}
          <div className="space-y-4">
            {items.length === 0 && !isCreating ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  אין שאלות נפוצות עדיין. לחץ על &quot;הוסף שאלה&quot; כדי ליצור
                  את הראשונה.
                </CardContent>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id}>
                  {editingId === item.id ? (
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>שאלה</Label>
                        <Input
                          value={formData.question}
                          onChange={(e) =>
                            setFormData({ ...formData, question: e.target.value })
                          }
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
                        <Button onClick={() => handleUpdate(item.id)}>
                          <Save className="w-4 h-4 ml-2" />
                          שמור
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>
                          <X className="w-4 h-4 ml-2" />
                          ביטול
                        </Button>
                      </div>
                    </CardContent>
                  ) : (
                    <>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                            <div>
                              <CardTitle className="text-base">
                                {item.question}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={item.isActive ? "success" : "secondary"}
                                >
                                  {item.isActive ? "פעיל" : "לא פעיל"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {item.clickCount} קליקים
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isActive}
                              onCheckedChange={(checked) =>
                                handleToggleActive(item.id, checked)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(item)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.answer}
                        </p>
                      </CardContent>
                    </>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
