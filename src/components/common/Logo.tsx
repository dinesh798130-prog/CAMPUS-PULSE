import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  linkToHome?: boolean;
  lightMode?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  linkToHome = true,
  lightMode = false,
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20'
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  const logoContent = (
    <div className={`flex items-center gap-3.5 group select-none ${className}`}>
      {/* Official Vignan Logo image */}
      <div className="relative flex items-center justify-center bg-white p-1 rounded-lg border border-slate-200/80 shadow-sm shrink-0">
        {!imgError ? (
          <img
            src="/assets/vignan-logo.png"
            alt="Vignan's Foundation for Science, Technology & Research"
            className={`${sizeClasses[size]} w-auto object-contain transition-transform group-hover:scale-105 duration-200`}
            onError={() => setImgError(true)}
          />
        ) : (
          <img
            src="/assets/vignan-logo.svg"
            alt="Vignan University Emblem"
            className={`${sizeClasses[size]} w-auto object-contain`}
          />
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className={`font-extrabold tracking-tight ${titleSizes[size]} ${lightMode ? 'text-white' : 'text-[#142B4A]'}`}>
            CAMPUS <span className="text-[#2563EB]">PULSE</span>
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 rounded">
            VFSTR
          </span>
        </div>

        {showSubtitle && (
          <span className={`text-[11px] leading-tight font-medium ${lightMode ? 'text-slate-300' : 'text-slate-500'}`}>
            Vignan's Foundation for Science, Technology & Research
          </span>
        )}
      </div>
    </div>
  );

  if (linkToHome) {
    return (
      <Link to="/" className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

