import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export type AnimatedFilterType = 'none' | 'snow' | 'rain' | 'sparkles' | 'ai';

interface AnimatedFilterOverlayProps {
  type: AnimatedFilterType;
  className?: string;
  particleCount?: number;
  aiTextureUrl?: string;
}

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
  opacity: number;
  scale: number;
}

const createParticles = (count: number, fast = false): ParticleStyle[] =>
  Array.from({ length: count }, (_, index) => ({
    left: `${(index * 97) % 100}%`,
    top: `${(index * 53) % 100}%`,
    animationDelay: `${(index % 13) * -0.45}s`,
    animationDuration: `${fast ? 1.3 + (index % 8) * 0.2 : 5.5 + (index % 9) * 0.4}s`,
    opacity: 0.35 + ((index * 7) % 45) / 100,
    scale: 0.55 + ((index * 11) % 65) / 100,
  }));

export const AnimatedFilterOverlay = ({
  type,
  className,
  particleCount,
  aiTextureUrl,
}: AnimatedFilterOverlayProps) => {
  const particles = useMemo(() => {
    switch (type) {
      case 'snow':
        return createParticles(particleCount ?? 44);
      case 'rain':
        return createParticles(particleCount ?? 52, true);
      case 'sparkles':
        return createParticles(particleCount ?? 26);
      case 'ai':
        return createParticles(particleCount ?? 18);
      default:
        return [];
    }
  }, [particleCount, type]);

  if (type === 'none') return null;

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {type === 'snow' && particles.map((particle, index) => (
        <span
          key={`snow-${index}`}
          className="absolute rounded-full bg-white/85 shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-xtrim-snowfall"
          style={{
            width: `${4 + (index % 3)}px`,
            height: `${4 + (index % 3)}px`,
            ...particle,
            transform: `scale(${particle.scale})`,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            opacity: particle.opacity,
          }}
        />
      ))}

      {type === 'rain' && particles.map((particle, index) => (
        <span
          key={`rain-${index}`}
          className="absolute bg-gradient-to-b from-white/70 to-cyan-200/50 rounded-full animate-xtrim-rainfall"
          style={{
            width: '1.5px',
            height: `${14 + (index % 8) * 2}px`,
            ...particle,
            transform: `scaleY(${particle.scale + 0.4})`,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            opacity: Math.min(0.95, particle.opacity + 0.25),
          }}
        />
      ))}

      {type === 'sparkles' && particles.map((particle, index) => (
        <span
          key={`spark-${index}`}
          className="absolute animate-xtrim-twinkle"
          style={{
            ...particle,
            animationDelay: particle.animationDelay,
            animationDuration: `${2 + (index % 5) * 0.4}s`,
            opacity: particle.opacity,
          }}
        >
          <span className="block w-2 h-2 rotate-45 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
        </span>
      ))}

      {type === 'ai' && aiTextureUrl && (
        <>
          <span
            className="absolute -inset-[20%] bg-center bg-cover opacity-45 mix-blend-screen animate-xtrim-ai-drift"
            style={{ backgroundImage: `url(${aiTextureUrl})` }}
          />
          {particles.map((particle, index) => (
            <span
              key={`ai-glow-${index}`}
              className="absolute rounded-full bg-violet-200/70 blur-[1px] animate-xtrim-twinkle"
              style={{
                width: `${4 + (index % 4)}px`,
                height: `${4 + (index % 4)}px`,
                ...particle,
                animationDuration: `${1.6 + (index % 7) * 0.35}s`,
              }}
            />
          ))}
        </>
      )}

      <div className={cn(
        'absolute inset-0',
        type === 'snow' && 'bg-gradient-to-b from-white/5 via-transparent to-sky-200/10',
        type === 'rain' && 'bg-gradient-to-b from-slate-700/10 via-slate-900/15 to-slate-800/20',
        type === 'sparkles' && 'bg-gradient-to-br from-fuchsia-400/5 via-transparent to-cyan-300/10',
        type === 'ai' && 'bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-200/15'
      )} />
    </div>
  );
};
