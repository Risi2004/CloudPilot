import React, { useEffect, useRef } from 'react';
import './HexGridBackground.css';

function HexGridBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w, h;

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = rect.width;
      h = canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };
    window.addEventListener('mousemove', onMove);
    canvas.parentElement.addEventListener('mouseleave', onLeave);

    // --- Hex grid config ---
    const hexSize = 28;
    const gapX = hexSize * Math.sqrt(3);
    const gapY = hexSize * 1.5;

    // Build hex centers
    const buildGrid = () => {
      const hexes = [];
      const cols = Math.ceil(w / gapX) + 2;
      const rows = Math.ceil(h / gapY) + 2;
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const offsetX = row % 2 === 0 ? 0 : gapX * 0.5;
          hexes.push({
            x: col * gapX + offsetX,
            y: row * gapY,
            status: 'idle',       // 'idle' | 'warning' | 'healing'
            warningT: 0,          // 0..1 for warning pulse
            healT: 0,             // 0..1 for heal animation
            rippleRadius: 0,
            rippleOpacity: 0,
          });
        }
      }
      return hexes;
    };
    let hexes = buildGrid();

    const onResizeGrid = () => { hexes = buildGrid(); };
    window.addEventListener('resize', onResizeGrid);

    // Draw a single hexagon path
    const drawHex = (cx, cy, size) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // --- Self-healing events ---
    const activeTimeouts = [];

    const triggerHealEvent = () => {
      const idleHexes = hexes.filter(h => h.status === 'idle');
      if (idleHexes.length === 0) return;
      const target = idleHexes[Math.floor(Math.random() * idleHexes.length)];

      // Phase 1: Warning
      target.status = 'warning';
      target.warningT = 0;

      const t = setTimeout(() => {
        // Phase 2: Healing ripple
        target.status = 'healing';
        target.healT = 0;
        target.rippleRadius = 0;
        target.rippleOpacity = 1;

        const t2 = setTimeout(() => {
          target.status = 'idle';
          target.warningT = 0;
          target.healT = 0;
        }, 1800);
        activeTimeouts.push(t2);
      }, 2200);
      activeTimeouts.push(t);
    };

    // Start heal events periodically
    const healInterval = setInterval(triggerHealEvent, 5000);
    // First event fires sooner
    const firstTimeout = setTimeout(triggerHealEvent, 1500);
    activeTimeouts.push(firstTimeout);

    // --- Animation loop ---
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const now = performance.now();

      for (let i = 0; i < hexes.length; i++) {
        const hex = hexes[i];
        const dx = hex.x - mx;
        const dy = hex.y - my;
        const distMouse = Math.sqrt(dx * dx + dy * dy);

        // Mouse proximity glow
        let mouseGlow = 0;
        if (distMouse < 160) {
          mouseGlow = (1 - distMouse / 160) * 0.25;
        }

        // Determine hex color/alpha
        let strokeAlpha = 0.04 + mouseGlow;
        let strokeColor = `rgba(0, 212, 255, ${strokeAlpha})`;
        let fillColor = 'transparent';

        if (hex.status === 'warning') {
          hex.warningT = Math.min(hex.warningT + 0.02, 1);
          const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
          const intensity = hex.warningT * pulse;
          strokeColor = `rgba(248, 113, 113, ${0.15 + intensity * 0.5})`;
          fillColor = `rgba(239, 68, 68, ${intensity * 0.08})`;
        } else if (hex.status === 'healing') {
          hex.healT = Math.min(hex.healT + 0.015, 1);
          const fade = 1 - hex.healT;
          strokeColor = `rgba(52, 211, 153, ${0.1 + fade * 0.4})`;
          fillColor = `rgba(16, 185, 129, ${fade * 0.06})`;

          // Expanding ripple effect
          hex.rippleRadius += 2.5;
          hex.rippleOpacity = Math.max(0, 1 - hex.rippleRadius / 180);

          if (hex.rippleOpacity > 0) {
            ctx.beginPath();
            ctx.arc(hex.x, hex.y, hex.rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 212, 255, ${hex.rippleOpacity * 0.35})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Inner ripple (slightly delayed)
            if (hex.rippleRadius > 20) {
              ctx.beginPath();
              ctx.arc(hex.x, hex.y, hex.rippleRadius - 20, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(52, 211, 153, ${hex.rippleOpacity * 0.2})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // Draw hex cell
        drawHex(hex.x, hex.y, hexSize);
        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(healInterval);
      activeTimeouts.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', onResizeGrid);
      window.removeEventListener('mousemove', onMove);
      if (canvas.parentElement) {
        canvas.parentElement.removeEventListener('mouseleave', onLeave);
      }
    };
  }, []);

  return (
    <>
      {/* Ambient glow blobs */}
      <div className="hero-glow hero-glow--cyan"></div>
      <div className="hero-glow hero-glow--blue"></div>

      {/* Self-healing hex grid canvas */}
      <canvas ref={canvasRef} className="hero-hex-canvas" />
    </>
  );
}

export default HexGridBackground;
