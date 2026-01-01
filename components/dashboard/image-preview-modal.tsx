"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Send, RotateCcw, ZoomIn, ZoomOut, Crop, Type } from "lucide-react";

interface ImagePreviewModalProps {
  file: File;
  onSend: (file: File, caption: string) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImagePreviewModal({ file, onSend, onCancel }: ImagePreviewModalProps) {
  const [imageUrl, setImageUrl] = useState<string>(() => URL.createObjectURL(file));
  const [caption, setCaption] = useState("");
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processedFile, setProcessedFile] = useState<File>(file);
  const [isProcessing, setIsProcessing] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionInputRef = useRef<HTMLInputElement>(null);

  // Cleanup image URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCropping) {
          setIsCropping(false);
          setCropArea(null);
        } else {
          onCancel();
        }
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCropping, onCancel]);

  // Focus caption input on mount
  useEffect(() => {
    setTimeout(() => captionInputRef.current?.focus(), 100);
  }, []);

  // Crop selection handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isCropping || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  }, [isCropping]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current || !cropArea) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const y = Math.min(Math.max(0, e.clientY - rect.top), rect.height);

    setCropArea({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      width: Math.abs(x - dragStart.x),
      height: Math.abs(y - dragStart.y),
    });
  }, [isDragging, dragStart, cropArea]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Apply crop
  const applyCrop = async () => {
    if (!cropArea || !imageRef.current || !canvasRef.current || cropArea.width < 10 || cropArea.height < 10) {
      setIsCropping(false);
      setCropArea(null);
      return;
    }

    setIsProcessing(true);

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate scale between displayed image and natural size
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    // Get the image position within the container
    const containerRect = containerRef.current?.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    const offsetX = imgRect.left - (containerRect?.left || 0);
    const offsetY = imgRect.top - (containerRect?.top || 0);

    // Adjust crop area relative to image position
    const adjustedCrop = {
      x: (cropArea.x - offsetX) * scaleX,
      y: (cropArea.y - offsetY) * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY,
    };

    // Set canvas size to crop dimensions
    canvas.width = adjustedCrop.width;
    canvas.height = adjustedCrop.height;

    // Draw cropped image
    ctx.drawImage(
      img,
      adjustedCrop.x,
      adjustedCrop.y,
      adjustedCrop.width,
      adjustedCrop.height,
      0,
      0,
      adjustedCrop.width,
      adjustedCrop.height
    );

    // Convert to blob and create new file
    canvas.toBlob((blob) => {
      if (blob) {
        const newFile = new File([blob], file.name, { type: file.type });
        setProcessedFile(newFile);
        const newUrl = URL.createObjectURL(newFile);
        setImageUrl(newUrl);
      }
      setIsCropping(false);
      setCropArea(null);
      setIsProcessing(false);
    }, file.type);
  };

  // Apply rotation
  const applyRotation = async (degrees: number) => {
    if (!imageRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const newRotation = (rotation + degrees) % 360;
    setRotation(newRotation);

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // For 90/270 degrees, swap width and height
    const isVertical = Math.abs(newRotation) === 90 || Math.abs(newRotation) === 270;
    canvas.width = isVertical ? img.naturalHeight : img.naturalWidth;
    canvas.height = isVertical ? img.naturalWidth : img.naturalHeight;

    // Move to center, rotate, and draw
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((newRotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    canvas.toBlob((blob) => {
      if (blob) {
        const newFile = new File([blob], file.name, { type: file.type });
        setProcessedFile(newFile);
        const newUrl = URL.createObjectURL(newFile);
        setImageUrl(newUrl);
        setRotation(0); // Reset rotation since it's now baked in
      }
      setIsProcessing(false);
    }, file.type);
  };

  // Handle send
  const handleSend = () => {
    onSend(processedFile, caption.trim());
  };

  // Reset to original
  const resetImage = () => {
    setProcessedFile(file);
    setImageUrl(URL.createObjectURL(file));
    setZoom(1);
    setRotation(0);
    setCropArea(null);
    setIsCropping(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">תצוגה מקדימה</h3>
            <span className="text-sm text-muted-foreground">{file.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Button
            variant={isCropping ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              if (isCropping && cropArea) {
                applyCrop();
              } else {
                setIsCropping(!isCropping);
                setCropArea(null);
              }
            }}
            disabled={isProcessing}
            className="gap-1.5"
          >
            <Crop className="w-4 h-4" />
            {isCropping ? (cropArea && cropArea.width > 10 ? "אשר חיתוך" : "בחר אזור") : "חיתוך"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyRotation(90)}
            disabled={isProcessing || isCropping}
            className="gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            סובב
          </Button>

          <div className="flex items-center gap-1 border rounded-lg px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5 || isProcessing || isCropping}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              disabled={zoom >= 3 || isProcessing || isCropping}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetImage}
            disabled={isProcessing}
            className="gap-1.5 text-muted-foreground"
          >
            איפוס
          </Button>
        </div>

        {/* Image Preview */}
        <div
          ref={containerRef}
          className={cn(
            "flex-1 flex items-center justify-center p-4 bg-muted/20 overflow-hidden relative min-h-[300px]",
            isCropping && "cursor-crosshair"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isProcessing && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <img
            ref={imageRef}
            src={imageUrl}
            alt="Preview"
            className="max-w-full max-h-[400px] object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              pointerEvents: isCropping ? "none" : "auto",
            }}
            draggable={false}
          />

          {/* Crop overlay */}
          {isCropping && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Darkened area outside crop */}
              <div className="absolute inset-0 bg-black/50" />

              {/* Crop selection box */}
              {cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                <div
                  className="absolute border-2 border-white bg-transparent shadow-lg"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full" />

                  {/* Size indicator */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white bg-black/70 px-2 py-0.5 rounded">
                    {Math.round(cropArea.width)} x {Math.round(cropArea.height)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Caption Input */}
        <div className="px-4 py-3 border-t bg-background">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Type className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={captionInputRef}
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="הוסף כיתוב לתמונה (אופציונלי)..."
                className="w-full h-10 pr-10 pl-4 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isProcessing}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isProcessing}
              className="h-10 px-6 bg-brand-gradient hover:opacity-90 gap-2"
            >
              <Send className="w-4 h-4" />
              שלח
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            לחץ Enter לשליחה • Esc לביטול
          </p>
        </div>
      </div>
    </div>
  );
}
