"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, Download, Play, Pause, Image as ImageIcon, File, Music, Video, ImageOff, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileMessageProps {
  messageType: "text" | "image" | "file" | "audio" | "video";
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  isAgent?: boolean;
  isUploading?: boolean;
  localPreviewUrl?: string;
  caption?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

export function FileMessage({
  messageType,
  fileUrl,
  fileName,
  fileSize,
  fileMimeType,
  isAgent = false,
  isUploading = false,
  localPreviewUrl,
  caption,
}: FileMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Check if file was deleted (fileUrl is empty but has a messageType that requires a file)
  const isDeleted = !fileUrl && !isUploading && messageType !== "text";

  // Deleted image placeholder
  const isDeletedImage = messageType === "image" && isDeleted;

  if (isDeletedImage) {
    const hasCaption = caption && caption !== fileName;

    return (
      <div className="max-w-[280px]">
        <div className={cn(
          "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed",
          isAgent
            ? "border-white/30 bg-white/5"
            : "border-muted-foreground/30 bg-muted/30"
        )}>
          <ImageOff className={cn(
            "w-8 h-8",
            isAgent ? "text-white/50" : "text-muted-foreground/50"
          )} />
          <span className={cn(
            "text-xs",
            isAgent ? "text-white/50" : "text-muted-foreground/50"
          )}>
            תמונה נמחקה
          </span>
        </div>

        {/* Caption below deleted image */}
        {hasCaption && (
          <p className={cn(
            "mt-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            isAgent ? "text-white" : "text-foreground"
          )}>
            {caption}
          </p>
        )}
      </div>
    );
  }

  // Image message
  if (messageType === "image" && !imageError) {
    const displayUrl = localPreviewUrl || fileUrl;
    // Caption is different from fileName - show it if provided
    const hasCaption = caption && caption !== fileName;

    return (
      <div className="max-w-[280px]">
        <div className="relative rounded-lg overflow-hidden">
          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-xs font-medium">מעלה...</span>
              </div>
            </div>
          )}

          {/* Image loading skeleton (only when no local preview) */}
          {isImageLoading && !localPreviewUrl && (
            <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center min-h-[120px] min-w-[180px]">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {isUploading ? (
            <img
              src={displayUrl}
              alt={fileName}
              className="max-w-full h-auto rounded-lg opacity-70"
              draggable={false}
            />
          ) : (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={displayUrl}
                alt={fileName}
                className={cn(
                  "max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity",
                  isImageLoading && !localPreviewUrl && "opacity-0"
                )}
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setIsImageLoading(false);
                }}
              />
            </a>
          )}
        </div>

        {/* Caption below image */}
        {hasCaption && (
          <p className={cn(
            "mt-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
            isAgent ? "text-white" : "text-foreground"
          )}>
            {caption}
          </p>
        )}
      </div>
    );
  }

  // Audio message
  if (messageType === "audio") {
    return (
      <div className="flex items-center gap-3 min-w-[200px]">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-full shrink-0",
            isAgent
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-primary/10 hover:bg-primary/20 text-primary"
          )}
          onClick={() => {
            const audio = document.getElementById(`audio-${fileUrl}`) as HTMLAudioElement;
            if (audio) {
              if (isPlaying) {
                audio.pause();
              } else {
                audio.play();
              }
              setIsPlaying(!isPlaying);
            }
          }}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-[-2px]" />}
        </Button>
        <div className="flex-1">
          <audio
            id={`audio-${fileUrl}`}
            src={fileUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className={cn(
            "h-1 rounded-full",
            isAgent ? "bg-white/30" : "bg-muted"
          )}>
            <div className="h-full w-0 rounded-full bg-current transition-all" />
          </div>
          <span className={cn(
            "text-xs mt-1 block",
            isAgent ? "text-white/70" : "text-muted-foreground"
          )}>
            {formatFileSize(fileSize)}
          </span>
        </div>
        <a href={fileUrl} download={fileName} className="shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full",
              isAgent
                ? "text-white/70 hover:text-white hover:bg-white/20"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Download className="w-4 h-4" />
          </Button>
        </a>
      </div>
    );
  }

  // Video message
  if (messageType === "video") {
    return (
      <div className="max-w-[300px] rounded-lg overflow-hidden">
        <video
          src={fileUrl}
          controls
          className="w-full h-auto rounded-lg"
          preload="metadata"
        />
        <div className={cn(
          "flex items-center justify-between px-2 py-1.5 text-xs",
          isAgent ? "text-white/70" : "text-muted-foreground"
        )}>
          <span className="truncate">{fileName}</span>
          <span>{formatFileSize(fileSize)}</span>
        </div>
      </div>
    );
  }

  // Deleted file placeholder (fileUrl is empty but messageType is file/audio/video)
  if (isDeleted) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[220px] max-w-[300px] border-2 border-dashed",
          isAgent
            ? "border-white/30 bg-white/5"
            : "border-muted-foreground/30 bg-muted/30"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          isAgent ? "bg-white/10" : "bg-muted/50"
        )}>
          <FileX className={cn(
            "w-5 h-5",
            isAgent ? "text-white/50" : "text-muted-foreground/50"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isAgent ? "text-white/50" : "text-muted-foreground/50"
          )}>
            {fileName}
          </p>
          <p className={cn(
            "text-xs",
            isAgent ? "text-white/40" : "text-muted-foreground/40"
          )}>
            קובץ נמחק
          </p>
        </div>
      </div>
    );
  }

  // Generic file message (PDF, documents, etc.)
  const FileIcon = getFileIcon(fileMimeType);

  const content = (
    <>
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 relative",
        isAgent ? "bg-white/20" : "bg-primary/10"
      )}>
        {isUploading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
        ) : (
          <FileIcon className={cn(
            "w-5 h-5",
            isAgent ? "text-white" : "text-primary"
          )} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isAgent ? "text-white" : "text-foreground"
        )}>
          {fileName}
        </p>
        <p className={cn(
          "text-xs",
          isAgent ? "text-white/70" : "text-muted-foreground"
        )}>
          {isUploading ? "מעלה..." : formatFileSize(fileSize)}
        </p>
      </div>
      {!isUploading && (
        <Download className={cn(
          "w-4 h-4 shrink-0",
          isAgent ? "text-white/70" : "text-muted-foreground"
        )} />
      )}
    </>
  );

  if (isUploading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[220px] max-w-[300px] opacity-70",
          isAgent
            ? "bg-white/10"
            : "bg-muted/50"
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[220px] max-w-[300px] transition-colors",
        isAgent
          ? "bg-white/10 hover:bg-white/20"
          : "bg-muted/50 hover:bg-muted"
      )}
    >
      {content}
    </a>
  );
}
