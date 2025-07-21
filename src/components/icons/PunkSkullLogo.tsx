
import Image from 'next/image';
import type { SVGProps } from 'react'; // Keep for prop consistency if any other props were expected by Logo.tsx

// It's better to pass width and height directly to next/image
// than trying to use the `size` prop for it.
interface PunkSkullLogoProps {
  width: number; // Made required as Logo.tsx should always pass it
  height: number; // Made required
  className?: string;
  alt?: string;
}

export function PunkSkullLogo({
  width,
  height,
  className,
  alt = "MeatHead App Logo",
  ...props // Collect any other props that might be passed (though Image component has specific ones)
}: PunkSkullLogoProps) {
  // The user should place their 'meathead_logoblack.jpg' in the 'public' folder.
  // The src path will then be '/meathead_logoblack.jpg'.
  const placeholderSrc = `https://placehold.co/${width}x${height}/000000/4CAF50/png?text=MH`;

  return (
    <Image
      src="/meathead_logoblack.jpg" // Updated to the new JPG file
      // Fallback to placeholder if the above src fails, or for initial setup:
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.srcset = ""; // Clear srcset to prevent conflicts with new src
        target.src = placeholderSrc;
      }}
      width={width}
      height={height}
      alt={alt}
      className={className}
      data-ai-hint="app logo"
      priority // If it's often above the fold, like in a navbar
      {...props} // Spread remaining props, though Image has a specific set it accepts
    />
  );
}
