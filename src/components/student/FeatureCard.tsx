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
        relative overflow-hidden rounded-xl border p-4 sm:p-6 lg:p-8
        flex flex-col items-center justify-center text-center
        min-h-[120px] sm:min-h-[140px] lg:min-h-[160px]
        transition-all duration-300 ease-out
        ${isActive 
          ? 'border-primary/20 cursor-pointer hover:border-primary/40 hover:shadow-emerald hover:-translate-y-1 group' 
          : 'border-border/50 cursor-not-allowed opacity-60'
        }
      `}
      style={{
        background: isActive 
          ? 'linear-gradient(135deg, hsl(152, 40%, 8%) 0%, hsl(152, 30%, 5%) 50%, hsl(0, 0%, 6%) 100%)'
          : 'linear-gradient(135deg, hsl(0, 0%, 8%) 0%, hsl(0, 0%, 5%) 100%)'
      }}
    >
      {/* Coming Soon Badge */}
      {!isActive && comingSoonLabel && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-warning/20 border border-warning/30">
          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-warning" />
          <span className="text-[10px] sm:text-xs font-medium text-warning">{comingSoonLabel}</span>
        </div>
      )}
      
      {/* Emerald glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-50" />
      
      {/* Hover glow for active cards */}
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      {/* Icon */}
      <div className={`
        relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center mb-3 lg:mb-4
        transition-colors duration-300
        ${isActive 
          ? 'bg-primary/10 group-hover:bg-primary/20' 
          : 'bg-muted/50'
        }
      `}>
        <Icon className={`w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      
      {/* Label */}
      <h3 className={`
        font-display font-semibold text-sm sm:text-base lg:text-lg
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
