import { Target, Medal, TrendingUp } from 'lucide-react';

type PerformanceType = 'mcqs-today' | 'rank' | 'consistency';

interface PerformanceCardProps {
  type: PerformanceType;
  label: string;
  value: string | number;
}

const iconMap: Record<PerformanceType, React.ComponentType<{ className?: string }>> = {
  'mcqs-today': Target,
  'rank': Medal,
  'consistency': TrendingUp,
};

/**
 * PerformanceCard Component
 * Displays performance stats in a card format
 * 
 * Future Hook Notes:
 * - Performance data → /performance/{date}
 */
const PerformanceCard = ({ type, label, value }: PerformanceCardProps) => {
  const Icon = iconMap[type];
  
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card border border-border p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-emerald">
      {/* Subtle pulse animation */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-display font-bold text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCard;
