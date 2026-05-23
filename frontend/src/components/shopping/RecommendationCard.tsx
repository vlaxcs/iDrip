import { X, Sparkles } from "lucide-react";
import type { ShoppingRecommendation } from "@/types/shopping";

interface RecommendationCardProps {
  recommendation: ShoppingRecommendation;
  onDismiss: (id: string) => void;
}

export function RecommendationCard({ recommendation, onDismiss }: RecommendationCardProps) {
  return (
    <div className="kit-card p-3 group transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
      <div className="relative kit-thumb aspect-[4/5] mb-3">
        <img
          src={recommendation.imageUrl}
          alt={recommendation.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <span className="kit-badge-ai absolute top-2 left-2">
          <Sparkles className="w-3 h-3" />
          {recommendation.matchScore}%
        </span>

        <button
          onClick={() => onDismiss(recommendation.id)}
          aria-label="Dismiss"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-display text-sm font-semibold truncate kit-strong">
          {recommendation.name}
        </h3>
        <span className="font-sans text-sm font-bold kit-strong flex-shrink-0">
          ${recommendation.estimatedPrice}
        </span>
      </div>
      <p className="text-xs kit-muted">{recommendation.brand}</p>
      <p className="text-xs kit-muted mt-2 leading-relaxed line-clamp-2">
        {recommendation.reason}
      </p>
    </div>
  );
}
