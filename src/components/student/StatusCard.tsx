import { Zap, Flame } from 'lucide-react';

interface StatusCardProps {
  type: 'xp' | 'streak';
  label: string;
  value: string | number;
}

/**
 * StatusCard Component
 * Displays XP or Streak stats with pulse animation
 * 
 * Future Hook Notes:
 * - XP → /users/{id}/xp
 * - Streak → /users/{id}/streak
 */
const StatusCard = ({ type, label, value }: StatusCardProps) => {
  const Icon = type === 'xp' ? Zap : Flame;
  
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card border border-border p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-emerald">
      {/* Pulse animation background */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Slow subtle pulse */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse-emerald opacity-50" />
      
      <div className="relative flex items-center gap-4">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-display font-bold text-foreground mt-1">
            {value}
            {type === 'streak' && <span className="text-lg text-muted-foreground ml-1">days</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
