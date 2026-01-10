interface ActionButtonProps {
  variant: 'primary' | 'outline';
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

/**
 * ActionButton Component
 * Primary and outline button variants with hover animations
 * 
 * Future Hook Notes:
 * - onClick will trigger navigation to test/practice screens
 */
const ActionButton = ({ variant, children, disabled = false, onClick }: ActionButtonProps) => {
  const baseClasses = `
    relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-lg
    transition-all duration-300 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `;
  
  const primaryClasses = `
    bg-gradient-to-r from-primary to-primary-glow text-primary-foreground
    shadow-lg shadow-primary/25
    hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-1
    active:translate-y-0 active:shadow-md
  `;
  
  const outlineClasses = `
    bg-transparent border-2 border-primary text-primary
    hover:bg-primary/10 hover:shadow-emerald hover:-translate-y-1
    active:translate-y-0
  `;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variant === 'primary' ? primaryClasses : outlineClasses}`}
    >
      {/* Hover glow effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative">{children}</span>
    </button>
  );
};

export default ActionButton;
