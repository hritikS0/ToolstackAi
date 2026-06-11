import { useEffect, useRef } from 'react'

export function BackgroundEffects() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!glowRef.current) return
      const x = (e.clientX / window.innerWidth) * 100
      const y = (e.clientY / window.innerHeight) * 100
      glowRef.current.style.setProperty('--glow-x', `${x}%`)
      glowRef.current.style.setProperty('--glow-y', `${y}%`)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .dot-float-1 { animation: float1 14s ease-in-out infinite; }
          .dot-float-2 { animation: float2 18s ease-in-out infinite; }
          .dot-float-3 { animation: float3 16s ease-in-out infinite; }
          .dot-float-4 { animation: float4 20s ease-in-out infinite; }
          .dot-float-5 { animation: float5 22s ease-in-out infinite; }
          .grid-drift { animation: gridPulse 12s ease-in-out infinite alternate; }
          .scan-line {
            animation: scanDown 8s linear infinite;
          }
        }
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.6; }
          50% { transform: translate(-10px, -50px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(-25px, -15px) scale(1.1); opacity: 0.5; }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33% { transform: translate(-15px, -25px) scale(0.9); opacity: 0.6; }
          66% { transform: translate(15px, -45px) scale(1.15); opacity: 0.3; }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(10px, -40px) scale(1.3); opacity: 0.5; }
        }
        @keyframes float4 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
          30% { transform: translate(-20px, -20px) scale(0.85); opacity: 0.55; }
          60% { transform: translate(15px, -35px) scale(1.2); opacity: 0.3; }
        }
        @keyframes float5 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          40% { transform: translate(25px, -30px) scale(1.1); opacity: 0.45; }
          80% { transform: translate(-10px, -55px) scale(0.9); opacity: 0.35; }
        }
        @keyframes gridPulse {
          0% { opacity: 0.02; }
          100% { opacity: 0.04; }
        }
        @keyframes scanDown {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      {/* Animated terminal grid */}
      <div
        className="absolute inset-0 grid-drift"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 158, 11, 0.12) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, rgba(245, 158, 11, 0.12) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, black 30%, transparent 70%)',
        }}
      />

      {/* Subtle scan line */}
      <div
        className="scan-line absolute left-0 right-0 h-px opacity-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.15), transparent)',
        }}
      />

      {/* Mouse-reactive glow */}
      <div
        ref={glowRef}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(500px circle at var(--glow-x, 50%) var(--glow-y, 30%), rgba(245, 158, 11, 0.06), transparent 60%)',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0">
        <div className="dot-float-1 absolute size-1.5 rounded-full bg-amber-500/30" style={{ left: '15%', top: '25%', filter: 'blur(1px)' }} />
        <div className="dot-float-2 absolute size-1 rounded-full bg-amber-400/25" style={{ left: '75%', top: '35%', filter: 'blur(1px)' }} />
        <div className="dot-float-3 absolute size-2 rounded-full bg-amber-500/20" style={{ left: '45%', top: '55%', filter: 'blur(1.5px)' }} />
        <div className="dot-float-4 absolute size-1.5 rounded-full bg-amber-400/25" style={{ left: '85%', top: '65%', filter: 'blur(1px)' }} />
        <div className="dot-float-5 absolute size-1 rounded-full bg-amber-500/30" style={{ left: '10%', top: '70%', filter: 'blur(1px)' }} />
      </div>
    </div>
  )
}
