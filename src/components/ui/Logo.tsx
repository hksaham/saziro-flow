import { GraduationCap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center glow-emerald`}>
        <GraduationCap className="w-2/3 h-2/3 text-primary-foreground" />
      </div>
      {showText && (
        <span className={`font-display font-bold ${textClasses[size]} text-foreground`}>
          SAZIRO<span className="text-gradient-emerald">FLOW</span>
        </span>
      )}
    </div>
  );
};

export default Logo;