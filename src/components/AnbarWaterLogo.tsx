import React from "react";

interface AnbarWaterLogoProps {
  className?: string;
  size?: number;
}

export const AnbarWaterLogo: React.FC<AnbarWaterLogoProps> = ({
  className = "",
  size = 64,
}) => {
  return (
    <img
      src="/anbar-water-logo.jpg"
      alt="شعار مديرية ماء الأنبار"
      width={size}
      height={size}
      className={`object-contain rounded-full inline-block ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

