"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl: string | null;
  name: string;
  agentId: string;
  onUpdate: (avatarUrl: string | null) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: "size-12",
  md: "size-16",
  lg: "size-20",
};

const buttonSizeClasses = {
  sm: "size-6",
  md: "size-7",
  lg: "size-8",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

export function AvatarUpload({
  avatarUrl,
  name,
  agentId,
  onUpdate,
  disabled = false,
  size = "md",
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = "";

    // Validate on client side
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("סוג קובץ לא נתמך. נא להעלות תמונה (JPEG, PNG, WebP, GIF)");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert("גודל הקובץ חייב להיות עד 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/admin/agents/${agentId}/avatar`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        onUpdate(data.avatarUrl);
      } else {
        alert(data.error || "שגיאה בהעלאת התמונה");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("שגיאה בהעלאת התמונה");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete() {
    if (!avatarUrl) return;
    if (!confirm("האם להסיר את התמונה?")) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/agents/${agentId}/avatar`, {
        method: "DELETE",
      });

      if (res.ok) {
        onUpdate(null);
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה במחיקת התמונה");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("שגיאה במחיקת התמונה");
    } finally {
      setIsDeleting(false);
    }
  }

  const isLoading = isUploading || isDeleting;

  return (
    <div className="relative inline-block group">
      <Avatar className={cn(sizeClasses[size], "border-2 border-border")}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-brand-gradient text-white font-medium">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
          <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
        </div>
      )}

      {/* Action buttons */}
      {!disabled && !isLoading && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className={cn(
              buttonSizeClasses[size],
              "rounded-full shadow-md border border-border"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className={iconSizeClasses[size]} />
          </Button>

          {avatarUrl && (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className={cn(
                buttonSizeClasses[size],
                "rounded-full shadow-md"
              )}
              onClick={handleDelete}
            >
              <Trash2 className={iconSizeClasses[size]} />
            </Button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isLoading}
      />
    </div>
  );
}
