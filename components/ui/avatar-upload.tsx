"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  Cropper,
  CropperImage,
  CropperArea,
  type CropperAreaData,
} from "@/components/ui/cropper";
import { Camera, Loader2, Trash2, ZoomIn, ZoomOut, Check, X } from "lucide-react";
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

// Create cropped image from original
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropperAreaData
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas is empty"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

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
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropperAreaData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropAreaChange = useCallback(
    (_croppedArea: CropperAreaData, croppedAreaPixels: CropperAreaData) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  // Set initial crop when media loads
  const onMediaLoaded = useCallback(() => {
    // Trigger initial crop area calculation by slightly adjusting zoom
    setTimeout(() => {
      setZoom((prev) => prev + 0.001);
      setTimeout(() => setZoom((prev) => prev - 0.001), 50);
    }, 100);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

    const maxSize = 5 * 1024 * 1024; // 5MB for original (will be cropped)
    if (file.size > maxSize) {
      alert("גודל הקובץ חייב להיות עד 5MB");
      return;
    }

    // Read file and open crop dialog
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setIsCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleCropConfirm() {
    if (!imageSrc) return;

    // Use default crop if no area selected yet
    const cropData = croppedAreaPixels || { x: 0, y: 0, width: 200, height: 200 };

    setIsUploading(true);
    setIsCropDialogOpen(false);

    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, cropData);

      // Create form data
      const formData = new FormData();
      formData.append("file", croppedBlob, "avatar.jpg");

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
      setImageSrc(null);
    }
  }

  function handleCropCancel() {
    setIsCropDialogOpen(false);
    setImageSrc(null);
    setZoom(1);
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
    <>
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

      {/* Crop Dialog */}
      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>חיתוך תמונה</DialogTitle>
          </DialogHeader>

          <div className="relative h-64 bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                aspectRatio={1}
                zoom={zoom}
                onZoomChange={setZoom}
                onCropAreaChange={onCropAreaChange}
                onMediaLoaded={onMediaLoaded}
                minZoom={1}
                maxZoom={3}
                shape="circle"
              >
                <CropperImage src={imageSrc} alt="Crop" />
                <CropperArea />
              </Cropper>
            )}
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={(values: number[]) => setZoom(values[0])}
              min={1}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCropCancel}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>
            <Button onClick={handleCropConfirm}>
              <Check className="w-4 h-4 ml-2" />
              אישור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
