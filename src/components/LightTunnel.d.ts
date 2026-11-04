import type { FC, CSSProperties, HTMLAttributes } from 'react';

export interface LightTunnelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  cableColor?: string;
  pulseColor?: string;
  tunnelColor?: string;
  tunnelOpacity?: number;
  speed?: number;
  flowDirection?: 'inward' | 'outward';
  pulseSpeed?: number;
  pulseLength?: number;
  pulseBlend?: number;
  pulseWidth?: number;
  pulseDensity?: number;
  cableCount?: number;
  thickness?: number;
  rimWidth?: number;
  waviness?: number;
  sway?: number;
  bend?: number;
  size?: number;
  centerX?: number;
  centerY?: number;
  glow?: number;
  fadeNear?: number;
  fadeFar?: number;
  brightness?: number;
  colorVariance?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  opacity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  clickSurge?: boolean;
  intro?: boolean;
  variation?: number;
  lightMode?: boolean;
  dpr?: number;
  className?: string;
  style?: CSSProperties;
}

declare const LightTunnel: FC<LightTunnelProps>;
export default LightTunnel;
