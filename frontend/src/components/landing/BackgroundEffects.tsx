import { useEffect, useRef } from 'react'

export function BackgroundEffects() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const { clientX, clientY } = e
      const { innerWidth, innerHeight } = window
      // 8px max displacement, very subtle and premium
      const moveX = ((clientX - innerWidth / 2) / (innerWidth / 2)) * 8
      const moveY = ((clientY - innerHeight / 2) / (innerHeight / 2)) * 8

      containerRef.current.style.setProperty('--bg-mouse-x', `${moveX}px`)
      containerRef.current.style.setProperty('--bg-mouse-y', `${moveY}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* CSS Animation Styles */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .drift-layer-1 {
            animation: drift-1 30s ease-in-out infinite alternate;
            transform-origin: center;
          }
          .drift-layer-2 {
            animation: drift-2 36s ease-in-out infinite alternate;
            transform-origin: center;
          }
          .drift-layer-3 {
            animation: drift-3 42s ease-in-out infinite alternate;
            transform-origin: center;
          }
          .flow-line {
            stroke-dasharray: 6 18;
            animation: flow 45s linear infinite;
          }
          .pulse-circle {
            animation: pulse 4s ease-in-out infinite alternate;
          }
        }
        @keyframes drift-1 {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(12px, -8px) rotate(0.5deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes drift-2 {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(-10px, 10px) rotate(-0.8deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes drift-3 {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          50% { transform: translate(8px, 12px) rotate(0.4deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes flow {
          to { stroke-dashoffset: -300; }
        }
        @keyframes pulse {
          0% { opacity: 0.25; r: 1.5px; }
          100% { opacity: 0.7; r: 2.5px; }
        }
      `}</style>

      {/* Terminal grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(245, 158, 11, 0.25) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(245, 158, 11, 0.25) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(circle at 50% 30%, black 25%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 30%, black 25%, transparent 80%)',
        }}
      />

      {/* Drifting SVG Knowledge Graph Layer */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-10 w-full h-full opacity-60"
        style={{
          transform: 'translate(var(--bg-mouse-x, 0px), var(--bg-mouse-y, 0px))',
          transition: 'transform 1s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <svg className="w-full h-full min-h-[600px]" viewBox="0 0 1000 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Layer 1 (Left Area) */}
          <g className="drift-layer-1">
            {/* Lines */}
            <line x1="120" y1="120" x2="220" y2="180" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="220" y1="180" x2="160" y2="280" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="160" y1="280" x2="300" y2="220" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" className="flow-line" />
            <line x1="300" y1="220" x2="220" y2="180" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="300" y1="220" x2="360" y2="340" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            
            {/* Nodes */}
            <circle cx="120" cy="120" r="1.5" fill="#f59e0b" className="opacity-30" />
            <circle cx="220" cy="180" r="2" fill="#f59e0b" className="opacity-50" />
            <circle cx="160" cy="280" r="1.5" fill="#f59e0b" className="opacity-30" />
            <circle cx="300" cy="220" r="2.5" fill="#f59e0b" className="pulse-circle" />
            <circle cx="360" cy="340" r="2" fill="#f59e0b" className="opacity-40" />
          </g>

          {/* Layer 2 (Right Area) */}
          <g className="drift-layer-2">
            {/* Lines */}
            <line x1="880" y1="140" x2="740" y2="200" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="740" y1="200" x2="800" y2="320" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" className="flow-line" />
            <line x1="800" y1="320" x2="920" y2="270" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="920" y1="270" x2="880" y2="140" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="740" y1="200" x2="640" y2="290" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />

            {/* Nodes */}
            <circle cx="880" cy="140" r="2" fill="#f59e0b" className="opacity-45" />
            <circle cx="740" cy="200" r="2.5" fill="#f59e0b" className="pulse-circle" />
            <circle cx="800" cy="320" r="1.5" fill="#f59e0b" className="opacity-30" />
            <circle cx="920" cy="270" r="2" fill="#f59e0b" className="opacity-50" />
            <circle cx="640" cy="290" r="1.5" fill="#f59e0b" className="opacity-25" />
          </g>

          {/* Layer 3 (Bottom Center) */}
          <g className="drift-layer-3">
            {/* Lines */}
            <line x1="450" y1="410" x2="560" y2="470" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="560" y1="470" x2="490" y2="520" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            <line x1="490" y1="520" x2="390" y2="440" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" className="flow-line" />
            <line x1="390" y1="440" x2="450" y2="410" stroke="rgba(245, 158, 11, 0.05)" strokeWidth="1" />
            
            {/* Nodes */}
            <circle cx="450" cy="410" r="2" fill="#f59e0b" className="opacity-40" />
            <circle cx="560" cy="470" r="1.5" fill="#f59e0b" className="opacity-35" />
            <circle cx="490" cy="520" r="2.5" fill="#f59e0b" className="pulse-circle" />
            <circle cx="390" cy="440" r="2" fill="#f59e0b" className="opacity-50" />
          </g>
        </svg>
      </div>
    </div>
  )
}
