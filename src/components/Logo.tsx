/**
 * JSON Beautifier Logo — inline SVG.
 * Stylized curly braces with colorful indentation lines representing
 * formatted JSON structure.
 */

export function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="JSON Beautifier"
      role="img"
    >
      {/* Background rounded square */}
      <rect width="32" height="32" rx="6" fill="var(--jb-token-key, #0550ae)" />
      {/* Left curly brace */}
      <path
        d="M10 8c-1.5 0-2 1-2 2v3c0 1-1 2-2 2 1 0 2 1 2 2v3c0 1 .5 2 2 2"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right curly brace */}
      <path
        d="M22 8c1.5 0 2 1 2 2v3c0 1 1 2 2 2-1 0-2 1-2 2v3c0 1-.5 2-2 2"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Indentation lines representing formatted JSON */}
      <rect x="12" y="12" width="8" height="1.5" rx="0.75" fill="#7ee787" />
      <rect x="13" y="15" width="6" height="1.5" rx="0.75" fill="#ffa657" />
      <rect x="12" y="18" width="8" height="1.5" rx="0.75" fill="#d2a8ff" />
    </svg>
  );
}
