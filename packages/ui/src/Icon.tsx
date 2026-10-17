/**
 * The single entry point for functional icons in the React chrome (webapp and VS Code webview).
 * Every Lucide icon goes through this wrapper, so size and stroke weight are set once (guide §11:
 * 16px chrome icons, stroke 2.5, no absoluteStrokeWidth). Icons are decorative: the surrounding
 * control carries the accessible name.
 */

import type { LucideIcon } from "lucide-react";

export type IconComponent = LucideIcon;

interface IconProps {
  icon: IconComponent;
  className?: string;
}

export function Icon({ icon: LucideGlyph, className }: IconProps) {
  return (
    <LucideGlyph
      className={className ? `tt-icon ${className}` : "tt-icon"}
      size={16}
      strokeWidth={2.5}
      aria-hidden="true"
      focusable="false"
    />
  );
}
