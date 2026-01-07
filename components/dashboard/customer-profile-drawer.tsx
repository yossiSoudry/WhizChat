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
      <SheetContent side="right" className="w-[400px] sm:w-[450px] p-0 border-r-0">
        <SheetHeader className="p-6 pb-5 border-b bg-gradient-to-l from-muted/30 via-background to-background">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-18 h-18 ring-4 ring-offset-2 ring-offset-background ring-primary/20 shadow-lg">
                {customerAvatar && (
                  <AvatarImage src={customerAvatar} alt={customerName} />
                )}
                <AvatarFallback className="bg-brand-gradient text-white text-2xl font-bold">
                  {customerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {customerType === "wordpress" && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold truncate">{customerName}</SheetTitle>
              <Badge
                variant={customerType === "wordpress" ? "default" : "secondary"}
                className={`mt-1.5 ${customerType === "wordpress" ? "bg-gradient-to-r from-primary to-primary/80 shadow-sm" : "bg-muted"}`}
              >
                {customerType === "wordpress" ? "משתמש רשום" : "אורח"}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b px-6 h-13 bg-transparent gap-1">
            <TabsTrigger
              value="info"
              className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <User className="w-4 h-4" />
              פרטים
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <FileText className="w-4 h-4" />
              הערות
              {notes.length > 0 && (
                <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                  {notes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
            >
              <ImageIcon className="w-4 h-4" />
              מדיה
              {media.length > 0 && (
                <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                  {media.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-240px)]">
            {/* Info Tab */}
            <TabsContent value="info" className="p-6 space-y-3 mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-muted/60 to-muted/30 border border-border/50 hover:border-border transition-colors group">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">תאריך הצטרפות</p>
                    <p className="font-semibold mt-0.5 truncate">{formatDate(createdAt)}</p>
                  </div>
                </div>

                {customerEmail && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-muted/60 to-muted/30 border border-border/50 hover:border-border transition-colors group">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/15 transition-colors">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">אימייל</p>
                      <p className="font-semibold mt-0.5 truncate" dir="ltr">{customerEmail}</p>
                    </div>
                  </div>
                )}

                {customerPhone && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-l from-muted/60 to-muted/30 border border-border/50 hover:border-border transition-colors group">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/15 transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">טלפון</p>
                      <p className="font-semibold mt-0.5 truncate" dir="ltr">{customerPhone}</p>
                    </div>
                  </div>
                )}

                {!customerEmail && !customerPhone && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">אין פרטי קשר זמינים</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="p-6 space-y-4 mt-0">
              {/* Add new note */}
              <div className="space-y-3 p-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                <Textarea
                  placeholder="הוסף הערה חדשה..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-20 resize-none border-border/50 bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSubmitting}
                  size="sm"
                  className="gap-2 shadow-sm"
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
                    className="p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {editingNoteId === note.id ? (
                      <>
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-20 resize-none border-primary/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={!editingContent.trim() || isSubmitting}
                            className="gap-1.5 shadow-sm"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            ביטול
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">{note.agentName}</span>
                            <span className="mx-1.5">•</span>
                            {formatDate(note.updatedAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => startEditing(note)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {notes.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">אין הערות עדיין</p>
                    <p className="text-sm mt-1 opacity-70">הוסף הערה ראשונה למעלה</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-6 mt-0">
              {media.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {media.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-xl overflow-hidden bg-muted hover:scale-105 hover:shadow-lg transition-all duration-200 group relative"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:brightness-90 transition-all"
                        />
                      ) : item.type === "video" ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/70">
                          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-primary-foreground mr-[-2px]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/70 p-2">
                          <FileText className="w-8 h-8 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">{item.name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto mb-3">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium">אין קבצי מדיה</p>
                  <p className="text-sm mt-1 opacity-70">תמונות וקבצים ישותפו יופיעו כאן</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
