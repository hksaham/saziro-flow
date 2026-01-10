import { 
  HelpCircle, 
  FileText, 
  BookX, 
  Lightbulb, 
  Trophy, 
  User,
  Lock
} from 'lucide-react';

type FeatureType = 'mcqs' | 'cq-explainer' | 'mistake-notebook' | 'suggestions' | 'leaderboard' | 'profile';

interface FeatureCardProps {
  type: FeatureType;
  label: string;
  isActive: boolean;
  comingSoonLabel?: string;
  onClick?: () => void;
}

const iconMap: Record<FeatureType, React.ComponentType<{ className?: string }>> = {
  'mcqs': HelpCircle,
  'cq-explainer': FileText,
  'mistake-notebook': BookX,
  'suggestions': Lightbulb,
  'leaderboard': Trophy,
  'profile': User,
};

/**
 * FeatureCard Component
 * Grid cards for app features with active/coming soon states
 * 
 * Future Hook Notes:
 * - onClick will navigate to respective feature pages
 */
const FeatureCard = ({ type, label, isActive, comingSoonLabel, onClick }: FeatureCardProps) => {
  const Icon = iconMap[type];
  
  return (
    <div
      onClick={isActive ? onClick : undefined}
      className={`
        relative overflow-hidden rounded-xl border p-6
        transition-all duration-300 ease-out
        ${isActive 
          ? 'bg-card border-border cursor-pointer hover:border-primary/40 hover:shadow-emerald hover:-translate-y-1 group' 
          : 'bg-card/50 border-border/50 cursor-not-allowed opacity-60'
        }
      `}
    >
      {/* Coming Soon Badge */}
      {!isActive && comingSoonLabel && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 border border-warning/30">
          <Lock className="w-3 h-3 text-warning" />
          <span className="text-xs font-medium text-warning">{comingSoonLabel}</span>
        </div>
      )}
      
      {/* Hover glow for active cards */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {/* Icon */}
      <div className={`
        relative w-14 h-14 rounded-xl flex items-center justify-center mb-4
        transition-colors duration-300
        ${isActive 
          ? 'bg-primary/10 group-hover:bg-primary/20' 
          : 'bg-muted/50'
        }
      `}>
        <Icon className={`w-7 h-7 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      
      {/* Label */}
      <h3 className={`
        font-display font-semibold text-lg
        ${isActive ? 'text-foreground' : 'text-muted-foreground'}
      `}>
        {label}
      </h3>
      
      {/* Accent line on hover */}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      )}
    </div>
  );
};

export default FeatureCard;
