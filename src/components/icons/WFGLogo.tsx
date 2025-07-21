
import type { SVGProps } from 'react';

export function WFGLogo({ size = 48, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100" // Adjusted viewBox
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="WorkFlowGuys Logo"
      {...props}
    >
      {/* Outer Circle Background (optional, if needed) */}
      <circle cx="50" cy="50" r="46" fill="hsl(var(--card))" />
      {/* Outer Circle Border - Use a theme color */}
      <circle cx="50" cy="50" r="46" stroke="hsl(var(--secondary))" strokeWidth="5" />

      {/* WFG Text - White/Primary Foreground */}
      <text
        x="50%"
        y="52%" // Slightly adjusted for better vertical centering
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif" // Generic sans-serif
        fontSize="30" // Adjusted size
        fontWeight="bold"
        fill="hsl(var(--primary-foreground))"
      >
        WFG
      </text>

      {/* Circuit Lines - Yellow (accent) and Blue (chart-3 or similar) */}
      {/* Top Yellow Circuit */}
      <path
        d="M25 35 C 35 25, 45 28, 50 30 S 65 35, 75 30"
        stroke="hsl(var(--accent))"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Bottom Blue Circuit */}
      <path
        d="M25 65 C 35 75, 45 72, 50 70 S 65 65, 75 70"
        stroke="hsl(var(--chart-3))"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Dots - Blue and Yellow */}
      <circle cx="23" cy="35" r="5" fill="hsl(var(--chart-3))" />
      <circle cx="77" cy="30" r="5" fill="hsl(var(--accent))" />
      <circle cx="23" cy="65" r="5" fill="hsl(var(--accent))" />
      <circle cx="77" cy="70" r="5" fill="hsl(var(--chart-3))" />
    </svg>
  );
}
