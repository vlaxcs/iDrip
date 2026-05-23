import { DollarSign } from "lucide-react";

interface BudgetSliderProps {
  budget: number;
  spent: number;
  currency: string;
  onChange: (value: number) => void;
}

export function BudgetSlider({ budget, spent, onChange }: BudgetSliderProps) {
  const remaining = budget - spent;
  const percentage = (spent / budget) * 100;

  return (
    <div className="kit-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="kit-icon-box" style={{ width: 32, height: 32 }}>
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="kit-overline">Monthly Budget</span>
        </div>
        <span className="font-sans kit-display text-2xl">${remaining}</span>
      </div>

      <div className="flex items-center justify-between text-xs kit-muted mb-2">
        <span>${spent} spent</span>
        <span>${budget} budget</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-[hsl(var(--sidebar-surface))] mb-4 overflow-hidden border border-[hsl(var(--sidebar-border))]">
        <div
          className="h-full rounded-full bg-[hsl(var(--sidebar-accent))] transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div>
        <label className="kit-overline block mb-2">Adjust budget</label>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={budget}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-[hsl(var(--sidebar-border))] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--sidebar-accent))] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[hsl(var(--sidebar-accent))] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
