import { useNavigate } from "react-router-dom";
import { Plus, Wand2, ShoppingBag } from "lucide-react";

interface QuickActionsProps {
  onUploadClick: () => void;
}

export function QuickActions({ onUploadClick }: QuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Wand2,
      label: "Generate Outfit",
      description: "AI-powered styling",
      onClick: () => navigate("/generator"),
    },
    {
      icon: Plus,
      label: "Upload Clothing",
      description: "Add to your wardrobe",
      onClick: onUploadClick,
    },
    {
      icon: ShoppingBag,
      label: "Browse Recs",
      description: "Smart shopping",
      onClick: () => navigate("/shopping"),
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="kit-card p-4 flex items-center gap-4 text-left hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className="kit-icon-box kit-icon-box-accent flex-shrink-0">
              <action.icon className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold kit-strong">
                {action.label}
              </p>
              <p className="text-xs kit-muted mt-0.5">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
