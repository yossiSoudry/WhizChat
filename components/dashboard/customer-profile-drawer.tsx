"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Mail,
  Phone,
  User,
  Image as ImageIcon,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
} from "lucide-react";

interface CustomerNote {
  id: string;
  content: string;
  agentId: string;
  agentName: string;
  createdAt: string;
  updatedAt: string;
}

interface MediaItem {
  id: string;
  type: "image" | "file" | "audio" | "video";
  url: string;
  name: string;
  createdAt: string;
}

interface CustomerProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAvatar: string | null;
  customerType: "wordpress" | "guest";
  createdAt: string;
  notes: CustomerNote[];
  media: MediaItem[];
  onNotesChange: (notes: CustomerNote[]) => void;
}

export function CustomerProfileDrawer({
  open,
  onOpenChange,
  conversationId,
  customerName,
  customerEmail,
  customerPhone,
  customerAvatar,
  customerType,
  createdAt,
  notes,
  media,
  onNotesChange,
}: CustomerProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/conversations/${conversationId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNote.trim() }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        onNotesChange([note, ...notes]);
        setNewNote("");
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/conversations/${conversationId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editingContent.trim() }),
        }
      );

      if (response.ok) {
        const { note } = await response.json();
        onNotesChange(notes.map((n) => (n.id === noteId ? note : n)));
        setEditingNoteId(null);
        setEditingContent("");
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/conversations/${conversationId}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        onNotesChange(notes.filter((n) => n.id !== noteId));
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (note: CustomerNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingContent("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              {customerAvatar && (
                <AvatarImage src={customerAvatar} alt={customerName} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {customerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-xl">{customerName}</SheetTitle>
              <Badge variant={customerType === "wordpress" ? "default" : "secondary"} className="mt-1">
                {customerType === "wordpress" ? "משתמש רשום" : "אורח"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b px-6 h-12">
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              פרטים
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <FileText className="w-4 h-4" />
              הערות ({notes.length})
            </TabsTrigger>
            <TabsTrigger value="media" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              מדיה ({media.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-220px)]">
            {/* Info Tab */}
            <TabsContent value="info" className="p-6 space-y-4 mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">תאריך הצטרפות</p>
                    <p className="font-medium">{formatDate(createdAt)}</p>
                  </div>
                </div>

                {customerEmail && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">אימייל</p>
                      <p className="font-medium" dir="ltr">{customerEmail}</p>
                    </div>
                  </div>
                )}

                {customerPhone && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">טלפון</p>
                      <p className="font-medium" dir="ltr">{customerPhone}</p>
                    </div>
                  </div>
                )}

                {!customerEmail && !customerPhone && (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>אין פרטי קשר זמינים</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-6 space-y-4 mt-0">
              {/* Add new note */}
              <div className="space-y-2">
                <Textarea
                  placeholder="הוסף הערה חדשה..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSubmitting}
                  size="sm"
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  הוסף הערה
                </Button>
              </div>

              {/* Notes list */}
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border bg-card space-y-2"
                  >
                    {editingNoteId === note.id ? (
                      <>
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[80px] resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={!editingContent.trim() || isSubmitting}
                            className="gap-1"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="gap-1"
                          >
                            <X className="w-3 h-3" />
                            ביטול
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {note.agentName} • {formatDate(note.updatedAt)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => startEditing(note)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>אין הערות עדיין</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-6 mt-0">
              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {media.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : item.type === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <svg className="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>אין קבצי מדיה</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
