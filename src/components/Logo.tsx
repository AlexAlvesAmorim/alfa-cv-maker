import { memo } from 'react';

interface LogoProps {
  size?: number;
}

export const Logo = memo(function Logo({ size = 44 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Logo Alfa Curriculum Maker"
    >
      <defs>
        <linearGradient id="alfa-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#45454c" />
          <stop offset="0.45" stopColor="#242428" />
          <stop offset="1" stopColor="#0e0e11" />
        </linearGradient>
        <radialGradient id="alfa-logo-glow" cx="0.32" cy="0.22" r="0.95">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="alfa-logo-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff4d5e" />
          <stop offset="0.5" stopColor="#c1121f" />
          <stop offset="1" stopColor="#7c0d19" />
        </linearGradient>
        <linearGradient id="alfa-logo-red-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a3162a" />
          <stop offset="1" stopColor="#5f0a12" />
        </linearGradient>
        <linearGradient id="alfa-logo-doc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2c31" />
          <stop offset="1" stopColor="#151518" />
        </linearGradient>
      </defs>

      <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#alfa-logo-bg)" />
      <rect x="32" y="32" width="448" height="448" rx="112" fill="url(#alfa-logo-glow)" />
      <circle cx="256" cy="256" r="172" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="2" />
      <circle cx="256" cy="256" r="208" fill="none" stroke="#000000" strokeOpacity="0.35" strokeWidth="2" />

      <path
        d="M186 146 H300 L352 198 V368 Q352 386 334 386 H182 Q164 386 164 368 V164 Q164 146 182 146 Z"
        fill="none"
        stroke="#4f080f"
        strokeWidth="22"
        strokeLinejoin="round"
        transform="translate(0 6)"
      />
      <path
        d="M186 146 H300 L352 198 V368 Q352 386 334 386 H182 Q164 386 164 368 V164 Q164 146 182 146 Z"
        fill="url(#alfa-logo-doc)"
        stroke="url(#alfa-logo-red)"
        strokeWidth="22"
        strokeLinejoin="round"
      />
      <path d="M300 146 L352 198 H314 Q300 198 300 184 Z" fill="url(#alfa-logo-red)" />
      <path
        d="M300 146 L352 198 H314 Q300 198 300 184 Z"
        fill="none"
        stroke="#4f080f"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      <path
        d="M256 208 L318 350 H288 L276 318 H236 L224 350 H194 Z M256 256 L269 294 H243 Z"
        fill="#4f080f"
        fillRule="evenodd"
        transform="translate(0 7)"
      />
      <path
        d="M256 208 L318 350 H288 L276 318 H236 L224 350 H194 Z M256 256 L269 294 H243 Z"
        fill="url(#alfa-logo-red)"
        fillRule="evenodd"
        stroke="#5f0a12"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <rect x="216" y="360" width="84" height="7" rx="3.5" fill="url(#alfa-logo-red-deep)" />
      <rect x="216" y="371" width="56" height="6" rx="3" fill="url(#alfa-logo-red-deep)" opacity="0.75" />

      <rect x="32" y="32" width="448" height="448" rx="112" fill="none" stroke="#000000" strokeOpacity="0.55" strokeWidth="6" />
      <rect x="40" y="40" width="432" height="432" rx="104" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="3" />
    </svg>
  );
});
