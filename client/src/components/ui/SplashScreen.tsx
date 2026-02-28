import React from 'react';
import BrandLogo from '@/components/BrandLogo';

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black overflow-hidden animate-in fade-in duration-500">
      {/* Background with deep blur - uses the same app background but more blurred */}
      <div 
        className="absolute inset-0 z-[-1] bg-cover bg-center bg-no-repeat blur-[60px] scale-110 opacity-60"
        style={{
          backgroundImage: "url('/fondoappinstadetox.jpg')",
        }}
      />
      
      {/* Overlay to ensure dark theme consistency */}
      <div className="absolute inset-0 z-[-1] bg-slate-950/80" />

      {/* Main Content: Logo */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative group">
          {/* Subtle glow effect behind logo */}
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
          
          <div className="relative transform hover:scale-105 transition-transform duration-500">
            <BrandLogo 
              variant="icon" 
              className="h-[100px] w-auto animate-in zoom-in-95 fade-in duration-1000" 
              alt="InstaDetox" 
            />
          </div>
        </div>
      </div>

      {/* Footer Identity (Instagram style) */}
      <div className="pb-12 animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-300">
        <p className="text-[#8e8e8e] text-xs font-semibold tracking-widest uppercase opacity-70">
          from
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-white">TuWeb</span>
            <span className="text-emerald-400">.ai</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
