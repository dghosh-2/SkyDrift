'use client';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  color?: string;
}

export function Toggle({ enabled, onChange, label, color = '#3b82f6' }: ToggleProps) {
  const handleClick = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8ae83d41-f86b-428d-9d07-0128f8355eba',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Toggle.tsx:handleClick',message:'Toggle clicked',data:{label,currentEnabled:enabled,willBe:!enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    onChange(!enabled);
  };

  return (
    <div 
      className="flex items-center justify-between cursor-pointer group py-2 px-1 rounded-lg hover:bg-gray-50 transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium select-none pointer-events-none">
        {label}
      </span>
      <div
        role="switch"
        aria-checked={enabled}
        className={`
          relative w-12 h-6 rounded-full transition-all duration-200 shadow-inner flex-shrink-0 pointer-events-none
          ${enabled ? 'shadow-md' : 'bg-gray-200'}
        `}
        style={{ backgroundColor: enabled ? color : undefined }}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md
            transition-transform duration-200 flex items-center justify-center pointer-events-none
            ${enabled ? 'translate-x-6' : 'translate-x-0'}
          `}
        >
          {enabled && (
            <svg className="w-3 h-3 pointer-events-none" style={{ color }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}
