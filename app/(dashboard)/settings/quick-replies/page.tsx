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
  Zap,
} from "lucide-react";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function QuickRepliesPage() {
  const [items, setItems] = useState<QuickReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    shortcut: "",
    isActive: true,
  });

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

  async function handleDelete(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק תשובה מהירה זו?")) return;

    try {
      const res = await fetch(`/api/admin/quick-replies/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setItems(items.filter((item) => item.id !== id));
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">תשובות מהירות</h1>
              <p className="text-muted-foreground">
                תשובות מוכנות מראש לשימוש הנציגים
              </p>
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף תשובה מהירה
              </Button>
            )}
          </div>

          {/* Usage Tip */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                <p className="text-sm">
                  <strong>טיפ:</strong> הקלד את הקיצור בתיבת ההודעה (למשל /pricing)
                  כדי להשתמש בתשובה המהירה
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Create Form */}
          {isCreating && (
            <Card>
              <CardHeader>
                <CardTitle>תשובה מהירה חדשה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">כותרת</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="למשל: מחירים"
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
                    הקלד את הקיצור בתיבת ההודעה כדי להכניס את התשובה
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

          {/* Quick Replies List */}
          <div className="space-y-4">
            {items.length === 0 && !isCreating ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  אין תשובות מהירות עדיין. לחץ על &quot;הוסף תשובה מהירה&quot; כדי
                  ליצור את הראשונה.
                </CardContent>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id}>
                  {editingId === item.id ? (
                    <CardContent className="pt-6 space-y-4">
                      <div className="space-y-2">
                        <Label>כותרת</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>קיצור</Label>
                        <Input
                          value={formData.shortcut}
                          onChange={(e) =>
                            setFormData({ ...formData, shortcut: e.target.value })
                          }
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
                                {item.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {item.shortcut && (
                                  <Badge variant="outline" className="font-mono">
                                    {item.shortcut}
                                  </Badge>
                                )}
                                <Badge
                                  variant={item.isActive ? "success" : "secondary"}
                                >
                                  {item.isActive ? "פעיל" : "לא פעיל"}
                                </Badge>
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
                          {item.content}
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
  );
}
