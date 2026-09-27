import React, { useEffect, useState } from "react";
import { AnbarWaterLogo } from "./AnbarWaterLogo";

interface SplashScreenProps {
  onFinished?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  const [step, setStep] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setStep(3);
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsFinished(true);
          onFinished?.();
        }, 300);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Step Timeline (~3.0 seconds total active animation)
    // 0ms: Logo fade in
    // 400ms: Pipe & initial stream extend
    // 1100ms: Valve rotates (opens) & water surges
    // 1700ms: Title & subtitle fade in
    // 2700ms: Begin smooth fade out
    // 3100ms: Hide completely

    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1100);
    const t3 = setTimeout(() => setStep(3), 1700);
    const t4 = setTimeout(() => setIsFadingOut(true), 2750);
    const t5 = setTimeout(() => {
      setIsFinished(true);
      onFinished?.();
    }, 3150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinished]);

  if (isFinished) return null;

  return (
    <div
      dir="rtl"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#061527] via-[#0b223a] to-[#040e1a] text-white px-4 py-8 select-none transition-all duration-500 ease-out ${
        isFadingOut ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Luminous Ambient Water Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute top-1/2 -left-20 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-teal-500/10 blur-[100px]" />

        {/* Blueprint dots grid background pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "radial-gradient(#38bdf8 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Spacer / Header Badge */}
      <div
        className={`relative z-10 pt-4 text-center transition-all duration-700 ${
          step >= 0 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/15 text-xs font-medium text-cyan-200 shadow-lg shadow-cyan-900/20">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>جمهورية العراق • مديرية ماء الأنبار</span>
        </div>
      </div>

      {/* Center Main Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md my-auto">
        
        {/* 1. Official Logo with Glowing Ring */}
        <div
          className={`relative mb-6 flex items-center justify-center transition-all duration-700 ease-out ${
            step >= 0 ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4"
          }`}
        >
          {/* Luminous Pulsing Aura Ring */}
          <div className="absolute h-28 w-28 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-600 via-sky-500 to-teal-400 p-1 shadow-2xl shadow-cyan-500/30 ring-2 ring-cyan-300/40">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white p-1">
              <AnbarWaterLogo size={80} className="shadow-xs" />
            </div>
          </div>
        </div>

        {/* 2. Professional SVG Water Pipe + Valve Animation */}
        <div
          className={`w-full max-w-[380px] my-2 transition-all duration-700 ${
            step >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          <svg
            viewBox="0 0 400 130"
            className="w-full drop-shadow-[0_10px_25px_rgba(6,182,212,0.25)] overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Pipe Chrome Metal Gradient */}
              <linearGradient id="splashPipeMetal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="35%" stopColor="#f8fafc" />
                <stop offset="70%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Water Stream Gradient */}
              <linearGradient id="splashWaterFlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
              </linearGradient>

              {/* Valve Gold Accent Gradient */}
              <linearGradient id="splashValveGold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#92400e" />
              </linearGradient>

              {/* Glow Filter */}
              <filter id="splashGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Pipe Tube */}
            <path
              d="M 20 65 L 380 65"
              stroke="url(#splashPipeMetal)"
              strokeWidth="28"
              strokeLinecap="round"
            />

            {/* Pipe Wall Flanges / Brackets */}
            <rect x="40" y="46" width="10" height="38" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1" />
            <rect x="350" y="46" width="10" height="38" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="1" />

            {/* Glass Inner Channel */}
            <path
              d="M 30 65 L 370 65"
              stroke="#0f172a"
              strokeWidth="16"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Animated Flowing Water Liquid inside Pipe */}
            {step >= 1 && (
              <path
                d="M 30 65 L 370 65"
                stroke="url(#splashWaterFlow)"
                strokeWidth="12"
                strokeLinecap="round"
                filter="url(#splashGlow)"
                className="transition-all duration-1000 ease-out"
                style={{
                  strokeDasharray: 340,
                  strokeDashoffset: step >= 2 ? 0 : 170,
                }}
              />
            )}

            {/* Shimmering Animated Water Streams when Valve is open */}
            {step >= 2 && (
              <>
                <path
                  d="M 30 65 L 370 65"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray="14 10"
                  strokeLinecap="round"
                  className="animate-pipe-flow"
                  opacity="0.9"
                />
                <path
                  d="M 30 67 L 370 67"
                  stroke="#cffafe"
                  strokeWidth="2"
                  strokeDasharray="18 12"
                  strokeLinecap="round"
                  className="animate-pipe-flow-fast"
                  opacity="0.8"
                />
              </>
            )}

            {/* 3. ELEGANT WATER VALVE ASSEMBLY (في منتصف الأنبوب) */}
            <g transform="translate(200, 65)">
              {/* Valve Outer Housing / Connector Ring */}
              <circle cx="0" cy="0" r="22" fill="url(#splashPipeMetal)" stroke="#1e293b" strokeWidth="2" />
              <circle cx="0" cy="0" r="16" fill="#1e293b" />
              <circle cx="0" cy="0" r="12" fill="#0284c7" filter="url(#splashGlow)" opacity="0.8" />

              {/* Valve Stem Connector */}
              <rect x="-5" y="-32" width="10" height="14" rx="2" fill="url(#splashPipeMetal)" stroke="#334155" strokeWidth="1" />

              {/* Rotating Valve Wheel / Lock Handle (قفل/صمام المياه) */}
              <g
                className="transition-transform duration-700 ease-in-out"
                style={{
                  transformOrigin: "0px -32px",
                  transform: step >= 2 ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                {/* Outer Wheel Rim */}
                <circle cx="0" cy="-32" r="18" fill="none" stroke="url(#splashValveGold)" strokeWidth="4" filter="url(#splashGlow)" />
                {/* Inner Spokes */}
                <line x1="-15" y1="-32" x2="15" y2="-32" stroke="#d97706" strokeWidth="3" />
                <line x1="0" y1="-47" x2="0" y2="-17" stroke="#d97706" strokeWidth="3" />
                {/* Center Hub Nut */}
                <circle cx="0" cy="-32" r="5" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
              </g>

              {/* Water Pressure Waves / Ripples Emitting from Valve when Open */}
              {step >= 2 && (
                <>
                  <circle cx="0" cy="0" r="26" stroke="#38bdf8" strokeWidth="1.5" fill="none" className="animate-ping" style={{ animationDuration: "1.4s" }} />
                  <circle cx="0" cy="0" r="32" stroke="#a5f3fc" strokeWidth="1" fill="none" className="animate-ping" style={{ animationDuration: "1.8s", animationDelay: "0.4s" }} />
                </>
              )}
            </g>
          </svg>
        </div>

        {/* 4. App Name & Subtitle Text */}
        <div className="mt-4 text-center space-y-2">
          {/* Main Title */}
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-sky-200 transition-all duration-700 ${
              step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            متابعة المشاريع
          </h1>

          {/* Subtitle */}
          <p
            className={`text-xs sm:text-sm font-semibold text-cyan-200/90 transition-all duration-700 delay-100 ${
              step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            نحو متابعة أفضل للمشاريع وخدمات المياه
          </p>
        </div>
      </div>

      {/* Bottom Footer / Government Branding */}
      <div
        className={`relative z-10 text-center pb-2 text-[11px] font-medium text-slate-400 transition-all duration-700 ${
          step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <span>نظام إدارة ومتابعة المشاريع الهندسي • الإكتمال والإنجاز</span>
      </div>
    </div>
  );
};
