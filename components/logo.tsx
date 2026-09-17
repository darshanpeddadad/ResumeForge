import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const px = size === "sm" ? 28 : size === "lg" ? 40 : 33;
  const textCls =
    size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-[15px]";

  return (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* ── Wordmark emblem: RF monogram ── */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Outer square with cut corner */}
        <path
          d="M4 6C4 4.89543 4.89543 4 6 4H26L32 10V30C32 31.1046 31.1046 32 30 32H6C4.89543 32 4 31.1046 4 30V6Z"
          fill="#c9a96e"
          fillOpacity="0.12"
          stroke="#c9a96e"
          strokeWidth="1.5"
        />
        {/* Corner fold */}
        <path
          d="M26 4L32 10H28C26.8954 10 26 9.10457 26 8V4Z"
          fill="#c9a96e"
          fillOpacity="0.35"
        />
        {/* R letter */}
        <path
          d="M11 13H15.5C17.157 13 18.5 14.343 18.5 16C18.5 17.5 17.4 18.75 15.95 18.97L18.5 23H16.5L14.1 19H13V23H11V13Z"
          fill="#c9a96e"
        />
        <rect x="13" y="15" width="2.5" height="2.5" rx="0.5" fill="#c9a96e" opacity="0" />
        {/* F letter */}
        <path
          d="M20 13H25V15H22V17.5H24.5V19.5H22V23H20V13Z"
          fill="#fff"
          fillOpacity="0.85"
        />
        {/* Gold dot accent */}
        <circle cx="28.5" cy="27.5" r="2" fill="#c9a96e" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${textCls} font-black tracking-tight`} style={{ color: "#f5f5f0" }}>
            Resume<span style={{ color: "#c9a96e" }}>Forge</span>
          </span>
          <span
            className="text-[8px] font-semibold uppercase tracking-widest pt-0.5"
            style={{ color: "rgba(201,169,110,0.55)" }}
          >
            AI Career Suite
          </span>
        </div>
      )}
    </div>
  );
}
