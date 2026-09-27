import React, { useState } from "react";

interface WaterPipeAnimationProps {
  className?: string;
}

export const WaterPipeAnimation: React.FC<WaterPipeAnimationProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [handleAngle, setHandleAngle] = useState(0);

  const toggleFaucet = () => {
    setHandleAngle((prev) => prev + 90);
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      className={`relative flex items-center justify-center select-none overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-b from-white/90 via-cyan-50/80 to-sky-100/90 p-6 sm:p-10 shadow-[0_20px_50px_-12px_rgba(6,182,212,0.22)] backdrop-blur-2xl ${className}`}
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl" />

      {/* Main Animated Water Pipe + Water Tap (Faucet) SVG */}
      <div className="relative z-10 flex w-full items-center justify-center py-2">
        <svg
          viewBox="0 0 460 210"
          className="w-full max-w-[460px] drop-shadow-xl overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Chrome Steel Gradients */}
            <linearGradient id="pipeMetalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="35%" stopColor="#f8fafc" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>

            <linearGradient id="faucetChromeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="30%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <linearGradient id="waterFlowGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
            </linearGradient>

            <linearGradient id="waterGushStream" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.95" />
            </linearGradient>

            <radialGradient id="poolRipplesGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Glowing filter */}
            <filter id="luminousGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Main Horizontal Supply Pipe */}
          <path
            d="M 15 65 L 245 65"
            stroke="url(#pipeMetalGrad)"
            strokeWidth="32"
            strokeLinecap="round"
          />

          {/* Pipe Wall Mounting Brackets */}
          <rect x="35" y="44" width="12" height="42" rx="3" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
          <rect x="135" y="44" width="12" height="42" rx="3" fill="#64748b" stroke="#475569" strokeWidth="1.5" />

          {/* 2. Glass Inspection Window inside Pipe */}
          <path
            d="M 25 65 L 235 65"
            stroke="#0f172a"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 25 65 L 235 65"
            stroke="url(#waterFlowGlass)"
            strokeWidth="16"
            strokeLinecap="round"
            filter="url(#luminousGlow)"
          />

          {/* 3. Animated Flowing Liquid Stream inside pipe */}
          {isOpen && (
            <>
              <path
                d="M 25 65 L 235 65"
                stroke="#ffffff"
                strokeWidth="5"
                strokeDasharray="16 10"
                strokeLinecap="round"
                className="animate-pipe-flow"
                opacity="0.9"
              />
              <path
                d="M 25 67 L 235 67"
                stroke="#a5f3fc"
                strokeWidth="3"
                strokeDasharray="20 14"
                strokeLinecap="round"
                className="animate-pipe-flow"
                opacity="0.8"
              />
            </>
          )}

          {/* 4. Pressure Gauge on the Pipe */}
          <g transform="translate(85, 18)">
            <rect x="18" y="24" width="8" height="18" fill="#64748b" stroke="#334155" strokeWidth="1" />
            <circle cx="22" cy="14" r="17" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" filter="url(#luminousGlow)" />
            <circle cx="22" cy="14" r="14" fill="#f0f9ff" />
            {/* Tick marks */}
            <line x1="22" y1="3" x2="22" y2="6" stroke="#0284c7" strokeWidth="1.5" />
            <line x1="10" y1="14" x2="13" y2="14" stroke="#0284c7" strokeWidth="1.5" />
            <line x1="34" y1="14" x2="31" y2="14" stroke="#0284c7" strokeWidth="1.5" />
            {/* Needle */}
            <line
              x1="22"
              y1="14"
              x2={isOpen ? "30" : "12"}
              y2={isOpen ? "9" : "14"}
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            <circle cx="22" cy="14" r="3" fill="#0f172a" />
          </g>

          {/* 5. ELEGANT REALISTIC WATER TAP (FAUCET / صنبور ماء) AT PIPE END */}
          <g transform="translate(235, 20)">
            {/* Pipe Coupling / Connector Collar */}
            <rect x="0" y="32" width="14" height="26" rx="3" fill="url(#faucetChromeGrad)" stroke="#475569" strokeWidth="1.5" />

            {/* Faucet Main Valve Body */}
            <rect x="14" y="28" width="34" height="34" rx="6" fill="url(#faucetChromeGrad)" stroke="#334155" strokeWidth="1.5" filter="url(#luminousGlow)" />
            
            {/* Valve Bonnet & Stem */}
            <rect x="25" y="14" width="12" height="15" rx="2" fill="url(#faucetChromeGrad)" stroke="#475569" strokeWidth="1.2" />

            {/* Interactive Faucet Cross/Star Handle (مقبض الحنفية) */}
            <g
              onClick={toggleFaucet}
              title="انقر لتدوير المحبس والتحكم بالماء"
              className="cursor-pointer transition-transform duration-500 ease-out"
              style={{
                transformOrigin: "31px 11px",
                transform: `rotate(${handleAngle}deg)`,
              }}
            >
              {/* Star / Cross Handle Wings */}
              <rect x="13" y="8" width="36" height="6" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
              <rect x="28" y="-7" width="6" height="36" rx="3" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
              <circle cx="31" cy="11" r="5" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.5" />
              <circle cx="31" cy="11" r="2.5" fill="#ef4444" />
            </g>

            {/* Curved Faucet Gooseneck Spout (عنق وفوهة الحنفية) */}
            <path
              d="M 44 45 Q 85 45 85 80 L 85 102"
              stroke="url(#faucetChromeGrad)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Inner highlight for 3D metallic feel */}
            <path
              d="M 44 42 Q 81 42 81 80 L 81 100"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />

            {/* Faucet Aerator / Nozzle Mouth (فوهة الصنبور) */}
            <rect x="71" y="98" width="28" height="12" rx="3" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
            <ellipse cx="85" cy="110" rx="12" ry="4" fill="#0f172a" />

            {/* 6. REALISTIC FLOWING WATER POURING FROM FAUCET */}
            {isOpen ? (
              <g>
                {/* Continuous Waterfall Stream from Faucet Spout to Pool */}
                <path
                  d="M 76 110 C 76 130, 74 150, 76 175 L 94 175 C 96 150, 94 130, 94 110 Z"
                  fill="url(#waterGushStream)"
                  filter="url(#luminousGlow)"
                  opacity="0.92"
                />
                {/* Shimmering rapid water streams */}
                <path
                  d="M 81 110 C 81 130, 79 150, 81 175"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray="10 8"
                  className="animate-pipe-flow-fast"
                />
                <path
                  d="M 89 110 C 89 130, 91 150, 89 175"
                  stroke="#cffafe"
                  strokeWidth="2.5"
                  strokeDasharray="14 10"
                  className="animate-pipe-flow-fast"
                />

                {/* Animated Water Droplets */}
                <circle cx="85" cy="120" r="3" fill="#ffffff" className="animate-water-drip" />
                <circle cx="80" cy="135" r="2.5" fill="#a5f3fc" className="animate-water-drip" style={{ animationDelay: "0.4s" }} />
                <circle cx="90" cy="145" r="2" fill="#e0f2fe" className="animate-water-drip" style={{ animationDelay: "0.8s" }} />

                {/* Crystal Water Pool Basin at bottom with Glow */}
                <ellipse cx="85" cy="175" rx="65" ry="14" fill="url(#poolRipplesGlow)" />
                <ellipse cx="85" cy="175" rx="45" ry="10" fill="#0891b2" opacity="0.4" />
                <ellipse cx="85" cy="175" rx="30" ry="7" fill="#06b6d4" opacity="0.6" />

                {/* Concentric Expanding Water Ripples */}
                <ellipse
                  cx="85"
                  cy="175"
                  rx="16"
                  ry="5"
                  stroke="#ffffff"
                  strokeWidth="2"
                  fill="none"
                  className="animate-ripple"
                />
                <ellipse
                  cx="85"
                  cy="175"
                  rx="30"
                  ry="8"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  fill="none"
                  className="animate-ripple-delayed"
                />
                <ellipse
                  cx="85"
                  cy="175"
                  rx="48"
                  ry="11"
                  stroke="#a5f3fc"
                  strokeWidth="1"
                  fill="none"
                  className="animate-ripple"
                  style={{ animationDelay: "0.9s" }}
                />

                {/* Water Splash Particles bouncing up */}
                <circle cx="70" cy="170" r="2.5" fill="#ffffff" className="animate-ping" style={{ animationDuration: "1.2s" }} />
                <circle cx="100" cy="172" r="2" fill="#a5f3fc" className="animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
                <circle cx="85" cy="166" r="3" fill="#ffffff" className="animate-ping" style={{ animationDuration: "0.9s", animationDelay: "0.6s" }} />
              </g>
            ) : (
              /* When faucet is closed: gentle single drop */
              <g>
                <circle cx="85" cy="112" r="3" fill="#38bdf8" className="animate-pulse" />
                <ellipse cx="85" cy="175" rx="20" ry="6" fill="#0284c7" opacity="0.2" />
              </g>
            )}
          </g>
        </svg>
      </div>
    </div>
  );
};
