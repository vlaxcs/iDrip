import { useEffect, useRef, useState, useCallback } from "react";
import { X, Sparkles, AlertTriangle, ChevronDown, ChevronUp, Check, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useWardrobeStore } from "@/stores/useWardrobeStore";
import { wardrobeService } from "@/services/wardrobeService";
import { aiAnalysisService, type ClothingAnalysis } from "@/services/aiAnalysisService";
import { useAnimatedMount } from "@/hooks/useAnimatedMount";
import { useScrollLock } from "@/hooks/useScrollLock";
import { CLOTHING_CATEGORIES } from "@/data/categories";
import { CATEGORY_FIELD_GROUPS, FIELD_ENUMS, MULTI_SELECT_FIELDS, TEXT_FIELDS } from "@/lib/fieldConfig";
import type { ClothingCategory, ClothingItemInput } from "@/types/wardrobe";

type DialogState = "collecting" | "analyzing" | "reviewing" | "saving";

type ItemStatus = "queued" | "analyzing" | "analyzed" | "error" | "approved";

interface BatchItem {
  id: string;
  file: File;
  preview: string;
  imageUrl: string | null;
  analysis: ClothingAnalysis | null;
  metadata: Record<string, unknown>;
  category: ClothingCategory;
  error: string | null;
  status: ItemStatus;
  collapsed: boolean;
}

interface ClothingUploadDialogProps {
  open: boolean;
  onClose: () => void;
}

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "—"
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)] hover:bg-[hsl(var(--frost)/0.8)] transition-colors"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.4)] shadow-lg max-h-48 overflow-y-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-[hsl(var(--sidebar-accent)/0.15)] hover:text-[hsl(var(--sidebar-accent))] transition-colors"
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm transition-colors",
                value === opt.value
                  ? "bg-[hsl(var(--sidebar-accent)/0.2)] text-green-700 dark:text-green-400 font-medium"
                  : "hover:bg-[hsl(var(--sidebar-accent)/0.1)] hover:text-green-600 dark:hover:text-green-400"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelectPills({
  values,
  onChange,
  options,
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter((x) => x !== v));
    else onChange([...values, v]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => toggle(opt.value)}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
            values.includes(opt.value)
              ? "bg-[hsl(var(--sidebar-accent))] text-black border-transparent"
              : "bg-[hsl(var(--frost)/0.5)] text-muted-foreground border-[hsl(var(--border)/0.4)]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ClothingUploadDialog({ open, onClose }: ClothingUploadDialogProps) {
  const { phase, shouldRender, startExit } = useAnimatedMount({ open, enterDuration: 350, exitDuration: 300 });
  useScrollLock(open);

  const wrappedClose = useCallback(() => { startExit(); setTimeout(onClose, 300); }, [startExit, onClose]);
  const addItem = useWardrobeStore((s) => s.addItem);
  const { previews, addFiles, removeFile, clearAll, isProcessing } = useImageUpload();

  const [dialogState, setDialogState] = useState<DialogState>("collecting");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState({ done: 0, total: 0 });

  const resetForm = useCallback(() => {
    setDialogState("collecting");
    setError(null);
    setItems([]);
    setSavingProgress({ done: 0, total: 0 });
    clearAll();
  }, [clearAll]);
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);
  // ── Add files to batch ──
  const handleFilesSelected = useCallback(async (files: File[]) => {
    setError(null);
    const dataUrls = await addFiles(files);
    const newItems: BatchItem[] = files.map((file, i) => ({
      id: crypto.randomUUID(),
      file,
      preview: dataUrls[i],
      imageUrl: null,
      analysis: null,
      metadata: {},
      category: "tops" as ClothingCategory,
      error: null,
      status: "queued" as ItemStatus,
      collapsed: true,
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, [addFiles]);

  // ── Remove item from batch ──
  const handleRemoveItem = useCallback((index: number) => {
    removeFile(index);
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, [removeFile]);

  // ── Analyze all queued items ──
  const handleAnalyzeAll = useCallback(async () => {
    setDialogState("analyzing");
    setError(null);

    // Get currently queued items
    const queuedIndices = items
      .map((item, i) => (item.status === "queued" ? i : -1))
      .filter((i) => i >= 0);

    for (const idx of queuedIndices) {
      setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, status: "analyzing" } : it)));

      try {
        const item = items[idx];
        const { imageUrl: url } = await wardrobeService.uploadImage(item.file);
        const analysis = await aiAnalysisService.analyzeClothing(url);

        const metadata: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(analysis)) {
          if (value !== null && value !== undefined) metadata[key] = value;
        }

        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  imageUrl: url,
                  analysis,
                  metadata,
                  category: (analysis.category as ClothingCategory) || "tops",
                  status: "analyzed",
                  collapsed: true,
                }
              : it
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it, i) =>
            i === idx
              ? { ...it, status: "error", error: err instanceof Error ? err.message : "Analysis failed" }
              : it
          )
        );
      }
    }

    setDialogState("reviewing");
  }, [items]);

  // ── Update a field on a specific item ──
  const updateItemField = useCallback((itemId: string, key: string, value: unknown) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, metadata: { ...it.metadata, [key]: value } } : it
      )
    );
  }, []);

  const updateItemCategory = useCallback((itemId: string, newCat: ClothingCategory) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, category: newCat, metadata: { ...it.metadata, category: newCat } }
          : it
      )
    );
  }, []);

  const toggleItemCollapsed = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, collapsed: !it.collapsed } : it))
    );
  }, []);

  const toggleSection = useCallback((itemId: string, group: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const collapsedSections = (it.metadata._collapsedSections as Set<string>) || new Set<string>();
        const next = new Set(collapsedSections);
        if (next.has(group)) next.delete(group);
        else next.add(group);
        return { ...it, metadata: { ...it.metadata, _collapsedSections: next } };
      })
    );
  }, []);

  // ── Approve / skip ──
  const handleApprove = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: "approved", collapsed: true } : it))
    );
  }, []);

  const handleUnapprove = useCallback((itemId: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: "analyzed", collapsed: false } : it))
    );
  }, []);

  const handleSkip = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  }, []);

  // ── Save all approved ──
  const handleSaveApproved = useCallback(async () => {
    const approved = items.filter((it) => it.status === "approved");
    if (approved.length === 0) return;

    setDialogState("saving");
    setSavingProgress({ done: 0, total: approved.length });

    let savedCount = 0;
    for (const item of approved) {
      try {
        const itemData: ClothingItemInput = {
          name: (item.metadata.name as string) || "Untitled Item",
          category: item.category,
          subcategory: "",
          primaryColor: "",
          secondaryColors: [],
          colorTemperature: "",
          colorIntensity: "",
          pattern: "",
          material: "",
          texture: "",
          transparency: "",
          printType: "",
          gender: "",
          formality: null,
          occasion: [],
          style: [],
          season: ["all"],
          aiConfidence: item.analysis?.confidence ?? null,
          aiAnalysis: (item.analysis as unknown as Record<string, unknown>) ?? {},
          fit: "",
          sleeveLength: "",
          sleeveStyle: "",
          neckline: "",
          collarType: "",
          cuffStyle: "",
          length: "",
          hemStyle: "",
          closureType: "",
          backDetail: "",
          strapStyle: "",
          rise: "",
          pleatStyle: "",
          distressing: "",
          waistbandStyle: "",
          legOpening: "",
          warmthLevel: "",
          waterResistance: "",
          hood: "",
          pockets: "",
          silhouette: "",
          heelHeight: "",
          heelStyle: "",
          toeStyle: "",
          soleType: "",
          shaftHeight: "",
          accessoryType: "",
          bandWidth: "",
          sockHeight: "",
          necklaceLength: "",
          hatStyle: "",
          earringStyle: "",
          tieStyle: "",
          watchStyle: "",
          lensColor: "",
          lining: "",
          publicId: "",
          imageUrl: item.imageUrl || "",
          ...item.metadata,
          color: ((item.metadata.primaryColor as string) || "other") as ClothingItemInput["color"],
          brand: (item.metadata.brand as string) || "",
          tags: (item.metadata.tags as string[]) || [],
        };
        await addItem(itemData);
        savedCount++;
        setSavingProgress({ done: savedCount, total: approved.length });
      } catch (err) {
        setError(
          `Failed to save "${item.metadata.name || "Untitled Item"}": ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    resetForm();
    wrappedClose();
  }, [items, addItem, resetForm, wrappedClose]);

  // ── Field rendering for a specific item ──
  const fieldLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

  const renderField = (item: BatchItem, key: string) => {
    const val = item.metadata[key];
    const stringVal = typeof val === "string" ? val : "";
    const arrayVal = Array.isArray(val) ? val : [];
    const numVal = typeof val === "number" ? val : null;
    const isLowConfidence = item.analysis && item.analysis.confidence < 0.6;

    if (TEXT_FIELDS.has(key)) {
      return (
        <input
          value={stringVal}
          onChange={(e) => updateItemField(item.id, key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)]"
        />
      );
    }

    if (key === "formality") {
      return (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-20 text-right">{numVal ?? "—"}/10</span>
          <input
            type="range" min={1} max={10}
            value={numVal ?? 5}
            onChange={(e) => updateItemField(item.id, key, parseInt(e.target.value))}
            className="flex-1 accent-[hsl(var(--sidebar-accent))]"
          />
        </div>
      );
    }

    if (key === "primaryColor") {
      return (
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg border border-[hsl(var(--border)/0.5)] shadow-sm shrink-0"
            style={{ backgroundColor: stringVal || "#808080" }}
          />
          <input
            type="color"
            value={stringVal || "#808080"}
            onChange={(e) => updateItemField(item.id, key, e.target.value)}
            className="w-0 h-0 opacity-0 absolute"
            id={`primaryColor-${item.id}`}
          />
          <label
            htmlFor={`primaryColor-${item.id}`}
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          >
            Pick
          </label>
          <input
            value={stringVal}
            onChange={(e) => updateItemField(item.id, key, e.target.value)}
            placeholder="#1a1a1a"
            className="flex-1 px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)]"
          />
        </div>
      );
    }

    if (key === "secondaryColors") {
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {arrayVal.map((color: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[hsl(var(--frost))] border border-[hsl(var(--border)/0.3)] text-xs">
                <span className="w-4 h-4 rounded-sm border border-[hsl(var(--border)/0.3)]" style={{ backgroundColor: color }} />
                <span className="font-mono">{color}</span>
                <button type="button" onClick={() => updateItemField(item.id, key, arrayVal.filter((_: string, j: number) => j !== i))} className="ml-0.5 text-muted-foreground hover:text-red-400">&times;</button>
              </span>
            ))}
            {arrayVal.length === 0 && <span className="text-xs text-muted-foreground">No additional colors</span>}
          </div>
          <input
            placeholder="Add hex e.g. #c0c0c0 and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val && /^#[0-9a-fA-F]{6}$/.test(val)) {
                  updateItemField(item.id, key, [...arrayVal, val]);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)]"
          />
        </div>
      );
    }

    if (MULTI_SELECT_FIELDS.has(key)) {
      const options = FIELD_ENUMS[key];
      if (!options) {
        return (
          <input
            value={stringVal}
            onChange={(e) => updateItemField(item.id, key, e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)]"
          />
        );
      }
      return <MultiSelectPills values={arrayVal} onChange={(vals) => updateItemField(item.id, key, vals)} options={options} />;
    }

    const options = FIELD_ENUMS[key];
    if (!options) {
      return (
        <input
          value={stringVal}
          onChange={(e) => updateItemField(item.id, key, e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--frost)/0.6)] border border-[hsl(var(--border)/0.4)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--sidebar-accent)/0.3)]"
        />
      );
    }

    return (
      <div className="relative">
        <CustomDropdown
          value={stringVal || ""}
          onChange={(val) => updateItemField(item.id, key, val || null)}
          options={options}
        />
        {isLowConfidence && !stringVal && (
          <AlertTriangle className="absolute right-8 top-2.5 w-3.5 h-3.5 text-amber-400 pointer-events-none" />
        )}
      </div>
    );
  };

  // ── Helpers ──
  const analyzedCount = items.filter((it) => it.status === "analyzed" || it.status === "approved").length;
  const approvedCount = items.filter((it) => it.status === "approved").length;
  const queuedCount = items.filter((it) => it.status === "queued").length;

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: phase === "visible" ? 1 : 0 }}
        onClick={wrappedClose}
      />

      <div
        className={cn(
          "relative w-full max-w-2xl max-h-[85vh] md:max-h-[92vh] overflow-y-auto bg-[hsl(var(--frost)/0.95)] backdrop-blur-2xl border border-[hsl(var(--border)/0.4)] rounded-t-3xl md:rounded-3xl shadow-2xl p-6",
          dialogState === "reviewing" ? "pb-0 md:pb-0" : "pb-24 md:pb-6"
        )}
        style={{
          transform: phase === "visible" ? "translateY(0) scale(1)" : "translateY(24px) scale(0.98)",
          opacity: phase === "visible" ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">
            {dialogState === "collecting" && "Add Clothing Items"}
            {dialogState === "analyzing" && `Analyzing... (${analyzedCount}/${items.length})`}
            {dialogState === "reviewing" && `Review Results (${approvedCount} approved)`}
            {dialogState === "saving" && `Saving... (${savingProgress.done}/${savingProgress.total})`}
          </h2>
          <button onClick={wrappedClose} className="w-8 h-8 rounded-full bg-[hsl(var(--frost))] flex items-center justify-center hover:bg-[hsl(var(--border)/0.3)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STATE: COLLECTING
            ══════════════════════════════════════════════ */}
        {dialogState === "collecting" && (
          <div className="space-y-4">
            <ImageUploader
              multiple
              previews={previews}
              onFilesSelect={handleFilesSelected}
              onRemove={handleRemoveItem}
              isProcessing={isProcessing}
              preview={null}
              onFileSelect={() => {}}
              onClear={() => {}}
            />
            <button
              onClick={handleAnalyzeAll}
              disabled={queuedCount === 0}
              className="w-full py-3 rounded-2xl bg-[hsl(var(--sidebar-accent))] text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze All ({queuedCount} {queuedCount === 1 ? "item" : "items"})
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STATE: ANALYZING
            ══════════════════════════════════════════════ */}
        {dialogState === "analyzing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--sidebar-accent))]" />
              <span className="text-sm text-muted-foreground">
                Analyzing {analyzedCount + 1} of {items.length}...
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {items.map((item, i) => (
                <div key={item.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black/5">
                  <img src={item.preview} alt={`Item ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    {item.status === "analyzing" && (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    )}
                    {item.status === "analyzed" && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STATE: REVIEWING
            ══════════════════════════════════════════════ */}
        {dialogState === "reviewing" && (
          <div className="flex flex-col min-h-0">
            <div className="scrollbar-panel min-h-0 max-h-[calc(85vh-14rem)] md:max-h-[calc(92vh-14rem)] overflow-y-auto overflow-x-hidden px-1 pt-1 pb-8 pr-4 md:pb-9 md:pr-5">
              <div className="space-y-3">
                {items.filter((it) => it.status === "analyzed" || it.status === "approved").length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-4">
                    <p className="text-muted-foreground text-sm">No items were analyzed successfully.</p>
                    <button
                      onClick={resetForm}
                      className="px-5 py-2 rounded-xl bg-[hsl(var(--sidebar-surface))] border border-[hsl(var(--border)/0.5)] text-sm font-semibold hover:bg-[hsl(var(--sidebar-hover))] transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
              items.map((item) => {
                if (item.status !== "analyzed" && item.status !== "approved") return null;
                const fieldGroups = CATEGORY_FIELD_GROUPS[item.category];
                const collapsedSections: Set<string> = (item.metadata._collapsedSections as Set<string>) || new Set();

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border transition-colors",
                      item.status === "approved"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-[hsl(var(--border)/0.4)] bg-[hsl(var(--frost)/0.7)]"
                    )}
                  >
                    {/* Item card header */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/5 shrink-0">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(item.metadata.name as string) || "Untitled Item"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                        {item.analysis && (
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full",
                            item.analysis.confidence >= 0.7 ? "bg-green-500/10 text-green-600" :
                            item.analysis.confidence >= 0.4 ? "bg-amber-500/10 text-amber-600" :
                            "bg-red-500/10 text-red-600"
                          )}>
                            {Math.round(item.analysis.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleItemCollapsed(item.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[hsl(var(--border)/0.2)] transition-colors"
                        >
                          {item.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        {item.status !== "approved" && (
                          <>
                            <button
                              onClick={() => handleApprove(item.id)}
                              className="w-8 h-8 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center hover:bg-green-500/20 transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSkip(item.id)}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                              title="Skip"
                            >
                              <EyeOff className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {item.status === "approved" && (
                          <button
                            onClick={() => handleUnapprove(item.id)}
                            className="group relative cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold overflow-hidden transition-colors w-24 text-center bg-green-500/10 text-green-600 hover:bg-red-500/10 hover:text-red-500"
                            title="Unapprove"
                          >
                            <span className="opacity-100 group-hover:opacity-0 transition-opacity absolute inset-0 flex items-center justify-center">Approved</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">Unapprove</span>
                            {/* invisible spacer to keep width correct if absolute text is wider or narrower */}
                            <span className="invisible">Unapprove</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded form */}
                    {!item.collapsed && (
                      <div className="px-4 pb-4 border-t border-[hsl(var(--border)/0.2)] pt-3 space-y-4">
                        <div>
                          <label className="text-xs font-medium mb-1 block text-muted-foreground">Name *</label>
                          {renderField(item, "name")}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block text-muted-foreground">Category</label>
                            <CustomDropdown
                              value={item.category}
                              onChange={(val) => updateItemCategory(item.id, val as ClothingCategory)}
                              options={CLOTHING_CATEGORIES.filter((c) => c.value !== "all")}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block text-muted-foreground">Brand</label>
                            {renderField(item, "brand")}
                          </div>
                        </div>

                        {fieldGroups.map((group) => {
                          const isCollapsed = collapsedSections.has(group.group);
                          return (
                            <div key={group.group}>
                              <button
                                type="button"
                                onClick={() => toggleSection(item.id, group.group)}
                                className="w-full flex items-center justify-between py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                              >
                                {group.group}
                                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                              </button>
                              {!isCollapsed && (
                                <div className="grid grid-cols-2 gap-3 mt-1">
                                  {group.fields.map((key) => (
                                    <div key={key} className={group.fields.length % 2 === 1 && key === group.fields[group.fields.length - 1] ? "col-span-2" : ""}>
                                      <label className="text-xs font-medium mb-1 block text-muted-foreground">
                                        {fieldLabel(key)}
                                      </label>
                                      {renderField(item, key)}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
              </div>
            </div>

            {/* Bottom action bar */}
            <div
              className="sticky bottom-0 z-10 bg-[hsl(var(--frost))] border-t border-[hsl(var(--border)/0.3)] -mx-6 px-6 pt-4 rounded-b-3xl flex items-center justify-between gap-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            >
              <p className="text-sm text-muted-foreground">
                {approvedCount} of {items.filter((it) => it.status === "analyzed" || it.status === "approved").length} approved
              </p>
              <button
                onClick={handleSaveApproved}
                disabled={approvedCount === 0}
                className="px-6 py-2.5 rounded-xl bg-[hsl(var(--sidebar-accent))] text-black text-sm font-semibold hover:brightness-95 transition-[filter,opacity] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save {approvedCount} {approvedCount === 1 ? "Item" : "Items"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            STATE: SAVING
            ══════════════════════════════════════════════ */}
        {dialogState === "saving" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <style>{`
              @keyframes idrip-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
            <div
              className="w-8 h-8 border-2 border-[hsl(var(--sidebar-accent)/0.3)] border-t-[hsl(var(--sidebar-accent))] rounded-full"
              style={{ animation: "idrip-spin 0.8s linear infinite" }}
            />
            <p className="text-sm text-muted-foreground">
              Saved {savingProgress.done} of {savingProgress.total} items...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
