
import { PunkSkullLogo } from './PunkSkullLogo';
import type { SVGProps } from 'react';

// Adjusted to pass width/height for the Image component in PunkSkullLogo
export function Logo({ size = 32, className, ...props }: Omit<SVGProps<SVGSVGElement>, 'width' | 'height'> & { size?: number }) {
  // Determine width and height based on size, maintaining a rough aspect ratio similar to original SVG viewBox
  const aspectRatio = 85 / 95; // from original viewBox="0 0 85 95"
  const width = size;
  const height = Math.round(size / aspectRatio);

  return <PunkSkullLogo width={width} height={height} className={className} {...props} />;
}
