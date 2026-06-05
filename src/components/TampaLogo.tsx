import React from 'react';

interface TampaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function TampaLogo({ className = '', size = 'md', showText = true }: TampaLogoProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Outer rounded card with drop shadow & border */}
      <div className={`relative ${sizeClasses[size]} bg-white p-3 rounded-3xl border border-teal-200 shadow-lg shadow-teal-500/10 flex items-center justify-center overflow-hidden`}>
        {/* Subtle geometric dot grid in the background */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#00A79D_1px,transparent_1px)] [background-size:12px_12px]" />
        
        {/* Abstract futuristic curved circuits */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <path d="M10,20 Q40,30 20,60" fill="none" stroke="#00A79D" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M90,30 Q60,50 80,80" fill="none" stroke="#FF6B53" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="20" cy="60" r="1.5" fill="#00A79D" />
            <circle cx="80" cy="80" r="1.5" fill="#FF6B53" />
          </svg>
        </div>

        {/* Central Logo Symbol */}
        <div className="relative w-full h-full flex items-center justify-center">
          <svg className="w-[85%] h-[85%]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Core Gradients */}
              <linearGradient id="coralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFA07A" />
                <stop offset="100%" stopColor="#FF6B53" />
              </linearGradient>
              <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#43C6AC" />
                <stop offset="100%" stopColor="#00A79D" />
              </linearGradient>
              <linearGradient id="logoMixGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00A79D" />
                <stop offset="50%" stopColor="#3CCF4E" />
                <stop offset="100%" stopColor="#FF6B53" />
              </linearGradient>
              <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Glowing connecting waves */}
            <path d="M25,55 Q50,40 75,55" stroke="url(#tealGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
            <path d="M15,62 Q50,45 85,62" stroke="url(#coralGradient)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />

            {/* Outside Network loop matching screenshot */}
            <path 
              d="M50,15 C68,15 82,29 82,47 C82,65 50,85 50,85 C50,85 18,65 18,47 C18,29 32,15 50,15 Z" 
              stroke="url(#tealGradient)" 
              strokeWidth="5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Inner loop mapping a T and connecting bridges */}
            {/* The Antenna transmitter head */}
            <circle cx="50" cy="30" r="6" fill="url(#coralGradient)" />
            <path d="M42,30 A8,8 0 0,1 58,30" stroke="url(#tealGradient)" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M36,30 A14,14 0 0,1 64,30" stroke="url(#coralGradient)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 1" fill="none" />
            
            {/* Stem representing the T-Letter and bridge architecture */}
            <path d="M50,36 L50,68" stroke="url(#logoMixGradient)" strokeWidth="6" strokeLinecap="round" />
            
            {/* Horizontal T-bar and curvy bridge elements */}
            <path d="M35,46 L65,46" stroke="url(#coralGradient)" strokeWidth="5" strokeLinecap="round" />
            <path d="M35,46 C35,62 45,64 50,68" stroke="url(#tealGradient)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M65,46 C65,62 55,64 50,68" stroke="url(#tealGradient)" strokeWidth="4.5" strokeLinecap="round" fill="none" />

            {/* Floating connecting nodes (network points) */}
            <circle cx="35" cy="46" r="3" fill="#FF6B53" />
            <circle cx="65" cy="46" r="3" fill="#FF6B53" />
            <circle cx="50" cy="68" r="4.5" fill="#00A79D" />
          </svg>
        </div>
      </div>

      {showText && (
        <div className="mt-3 text-center">
          <h1 className="text-2xl font-black tracking-[0.18em] text-[#FF6B53] font-sans drop-shadow-sm select-none">
            TAMPA
          </h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#00A79D] font-mono font-bold mt-1 select-none whitespace-nowrap">
            Connecting the Bay
          </p>
        </div>
      )}
    </div>
  );
}
