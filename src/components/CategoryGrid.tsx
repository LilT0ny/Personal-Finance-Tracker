import { 
  UtensilsCrossed, 
  Car, 
  Heart, 
  Gamepad2, 
  ShoppingBag, 
  Zap, 
  PiggyBank, 
  MoreHorizontal,
  Circle
} from 'lucide-react';
import { CategoryConfig } from '../types';
import { cn } from '../lib/utils';

interface CategoryGridProps {
  categories: CategoryConfig[];
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UtensilsCrossed,
  Car,
  Heart,
  Gamepad2,
  ShoppingBag,
  Zap,
  PiggyBank,
  MoreHorizontal,
  Circle,
};

export function CategoryGrid({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {categories.map((category) => {
        const Icon = ICON_MAP[category.icon] || Circle;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl transition-all tap-target",
              isSelected 
                ? "bg-card border-2" 
                : "bg-card/50 border border-border hover:bg-card"
            )}
            style={isSelected ? { borderColor: category.color } : {}}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <span style={{ color: category.color }}>
                <Icon className="w-5 h-5" />
              </span>
            </div>
            <span className="text-xs text-center text-foreground-muted">
              {category.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
