import { useState, useCallback } from "react";
import { X, Sparkles, Heart, ThumbsDown, CloudRain, Palette, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { useScrollLock } from "@/hooks/useScrollLock";
import { FEEDBACK_OPTIONS } from "@/data/styles";
import type { Outfit } from "@/types/outfit";

interface OutfitPreviewModalProps {
  open: boolean;
  outfit: Outfit | null;
  onConfirm: (outfit: Outfit) => void;
  onRegenerate: (feedback: string) => void;
  onDismiss: () => void;
  isRegenerating: boolean;
}

type ModalState = "preview" | "feedback" | "confirming";

export function OutfitPreviewModal({
  open,
  outfit,
  onConfirm,
  onRegenerate,
  onDismiss,
  isRegenerating,
}: OutfitPreviewModalProps) {
  const { phase, shouldRender } = useAnimatedMount({ open, enterDuration: 300, exitDuration: 250 });
  const [modalState, setModalState] = useState<ModalState>("preview");
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [showCollectionInput, setShowCollectionInput] = useState(false);

  useScrollLock(open);

  const handleClose = useCallback(() => {
    setModalState("preview");
    setSelectedFeedback([]);
    setFeedbackText("");
    setShowCollectionInput(false);
    onDismiss();
  }, [onDismiss]);

  const handleConfirm = useCallback(() => {
    if (!outfit) return;
    setModalState("confirming");
    onConfirm(outfit);
  }, [outfit, onConfirm]);

  const handleRegenerate = useCallback(() => {
    const parts: string[] = [];
    for (const fb of selectedFeedback) {
      const opt = FEEDBACK_OPTIONS.find((o) => o.value === fb);
      if (opt) parts.push(opt.label.toLowerCase());
    }
    if (feedbackText.trim()) parts.push(feedbackText.trim());
    const feedback = parts.join(". ");
    onRegenerate(feedback || "Please try a different combination");
  }, [selectedFeedback, feedbackText, onRegenerate]);

  if (!shouldRender || !outfit) return null;

  const panelTransform =
    phase === "enter"
      ? "translateY(100%)"
      : phase === "visible"
        ? "translateY(0)"
        : phase === "exit"
          ? "translateY(100%)"
          : "translateY(100%)";

  const isProcessing = isRegenerating || modalState === "confirming";

  return (
    <div className="fixed inset-0 z-70 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: phase === "visible" ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[90vh] md:max-h-[92vh] overflow-y-auto",
          "bg-[hsl(var(--frost)/0.95)] backdrop-blur-2xl border border-[hsl(var(--border)/0.4)]",
          "rounded-t-3xl md:rounded-3xl shadow-2xl p-6 pb-24 md:pb-6 safe-area-bottom"
        )}
        style={{
          transform: panelTransform,
          transition:
            phase === "enter" || phase === "exit"
              ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">{outfit.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--glacier)/0.15)] text-[hsl(var(--glacier))]">
                {outfit.occasion}
              </span>
              <span className="text-xs text-muted-foreground">
                Score: {outfit.score}/100
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[hsl(var(--frost))] flex items-center justify-center hover:bg-[hsl(var(--border)/0.3)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Images */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
          {outfit.items.map((item, i) => (
            <div key={item.clothingItemId || i} className="shrink-0 w-24">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[hsl(var(--frost))] border border-[hsl(var(--border)/0.3)]">
                {item.clothingItem.imageUrl ? (
                  <img
                    src={item.clothingItem.imageUrl}
                    alt={item.clothingItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
              <p className="text-xs mt-1 text-center truncate">{item.clothingItem.name}</p>
              <p className="text-[10px] text-muted-foreground text-center">{item.slot}</p>
            </div>
          ))}
        </div>

        {/* Color Scheme */}
        {outfit.colorScheme && outfit.colorScheme.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Palette:</span>
            <div className="flex gap-1.5">
              {outfit.colorScheme.map((hex, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span
                    className="w-5 h-5 rounded-full border border-[hsl(var(--border)/0.4)]"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{hex}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scores */}
        <div className="flex gap-4 mb-4">
          {outfit.weatherScore != null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CloudRain className="w-3.5 h-3.5" />
              <span>Weather: {outfit.weatherScore}/10</span>
            </div>
          )}
          {outfit.styleScore != null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Style: {outfit.styleScore}/10</span>
            </div>
          )}
        </div>

        {/* AI Reasoning */}
        <div className="bg-[hsl(var(--frost)/0.7)] rounded-xl p-4 border border-[hsl(var(--border)/0.3)] mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {outfit.aiReasoning || "A carefully selected outfit from your wardrobe."}
          </p>
        </div>

        {/* Actions */}
        {modalState === "preview" && (
          <div className="space-y-3">
            {!showCollectionInput ? (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-[hsl(var(--sidebar-accent))] text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      Love it! Save to Wardrobe
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowCollectionInput(true)}
                  disabled={isProcessing}
                  className="w-full py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Add to collection
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="Collection name (e.g., Summer Capsule)"
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--glacier)/0.3)]"
                />
                <button
                  onClick={() => {
                    onConfirm({ ...outfit, collectionName });
                    setModalState("confirming");
                  }}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-[hsl(var(--sidebar-accent))] text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4" />
                      Save to {collectionName || "Wardrobe"}
                    </>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => setModalState("feedback")}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl border border-[hsl(var(--border)/0.4)] text-sm font-medium hover:bg-[hsl(var(--frost))] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ThumbsDown className="w-4 h-4" />
              Not quite...
            </button>
          </div>
        )}

        {/* Feedback State */}
        {modalState === "feedback" && (
          <div className="space-y-4">
            <p className="text-sm font-medium">What didn't you like?</p>

            {/* Feedback pills */}
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setSelectedFeedback((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                    selectedFeedback.includes(opt.value)
                      ? "bg-[hsl(var(--glacier))] text-white border-transparent"
                      : "bg-[hsl(var(--frost)/0.5)] text-muted-foreground border-[hsl(var(--border)/0.4)] hover:bg-[hsl(var(--frost))]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Free-text feedback */}
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Anything else? (e.g., I want more color, swap the shoes...)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--glacier)/0.3)] resize-none"
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setModalState("preview")}
                className="flex-1 py-3 rounded-2xl border border-[hsl(var(--border)/0.4)] text-sm font-medium hover:bg-[hsl(var(--frost))] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex-1 py-3 rounded-2xl bg-[hsl(var(--glacier))] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
