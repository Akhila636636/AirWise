
interface LoadingSkeletonProps {
  height?: string;
  width?: string;
  borderRadius?: string;
  className?: string;
}

export function LoadingSkeleton({
  height = '1rem',
  width = '100%',
  borderRadius = 'var(--border-radius)',
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        height,
        width,
        borderRadius,
        background: 'linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-secondary) 50%, var(--color-bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-anim 1.5s infinite',
      }}
      aria-busy="true"
    />
  );
}
