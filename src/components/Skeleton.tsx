import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
  className?: string;
}

export const Skeleton = ({ width = '100%', height = '1rem', borderRadius = '4px', style, className }: SkeletonProps) => {
  return (
    <div
      className={`skeleton-loader ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
};

export const LeaderboardSkeleton = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Skeleton width="30px" height="30px" borderRadius="8px" />
          <Skeleton width="60px" height="20px" />
          <Skeleton width="120px" height="20px" />
          <Skeleton width="80px" height="20px" style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
};
