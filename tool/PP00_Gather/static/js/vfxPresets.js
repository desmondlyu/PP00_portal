/**
 * PP00 Gather - Visual Effects Presets & Procedural Fallback Renderer
 * Coordinates with OfficeVfx manager to supply timing, color palettes, and canvas drawing.
 */
(function(root) {
  const OfficeVfxPresets = {
    palettes: {
      amber: { core: '#ffffff', mid: '#f59e0b', outer: '#1e293b' },
      cyan: { core: '#ffffff', mid: '#38bdf8', outer: '#0f172a' },
      purple: { core: '#f5d0fe', mid: '#c084fc', outer: '#3b0764' },
      gold: { core: '#fef08a', mid: '#eab308', outer: '#422006' },
      green: { core: '#bbf7d0', mid: '#22c55e', outer: '#052e16' },
      smoke: { core: '#f8fafc', mid: '#94a3b8', outer: '#1e293b' }
    },

    definitions: {
      hit: {
        layer: 'front',
        durationMs: 420,
        scale: 1.0,
        palette: 'amber',
        anchorOffset: { x: 0, y: -24 }
      },
      blunt_hit: {
        layer: 'front',
        durationMs: 350,
        scale: 1.1,
        palette: 'amber',
        anchorOffset: { x: 0, y: -24 }
      },
      swing: {
        layer: 'front',
        durationMs: 300,
        scale: 1.0,
        palette: 'amber',
        anchorOffset: { x: 0, y: -16 }
      },
      thrust: {
        layer: 'front',
        durationMs: 250,
        scale: 1.0,
        palette: 'amber',
        anchorOffset: { x: 0, y: -16 }
      },
      dodge: {
        layer: 'front',
        durationMs: 300,
        scale: 1.0,
        palette: 'cyan',
        anchorOffset: { x: 0, y: -16 }
      },
      poof: {
        layer: 'front',
        durationMs: 650,
        scale: 1.2,
        palette: 'smoke',
        anchorOffset: { x: 0, y: -18 }
      },
      collect: {
        layer: 'front',
        durationMs: 400,
        scale: 1.0,
        palette: 'gold',
        anchorOffset: { x: 0, y: -20 }
      },
      zap: {
        layer: 'front',
        durationMs: 350,
        scale: 1.0,
        palette: 'cyan',
        anchorOffset: { x: 0, y: -24 }
      },
      stunned: {
        layer: 'front',
        durationMs: 1000,
        loop: true,
        scale: 1.0,
        palette: 'gold',
        // When anchor.headY is provided, headY is already at the head.
        // anchorOffset is only applied if headY is not available.
        anchorOffset: { x: 0, y: -48 }
      },
      sleep: {
        layer: 'front',
        durationMs: 1200,
        loop: true,
        scale: 1.0,
        palette: 'cyan',
        anchorOffset: { x: 12, y: -50 }
      }
    },

    /**
     * Procedural fallback drawing in Canvas 2D when spritesheets are loading or unavailable.
     * Renders crisp retro pixel particles and lines matching the office manga style.
     * Guaranteed fail-safe with try/finally so ctx state is never corrupted.
     */
    drawFallback(ctx, item, t, x, y) {
      if (!ctx || t < 0 || t > 1) return;
      const kind = item.kind || 'hit';
      const angle = item.angle || 0;
      const def = OfficeVfxPresets.definitions[kind] || {};
      const scale = (item.scale || def.scale || 1.0);
      const paletteName = def.palette || 'amber';
      const pal = OfficeVfxPresets.palettes[paletteName] || OfficeVfxPresets.palettes.amber;

      ctx.save();
      try {
        ctx.translate(Math.round(x), Math.round(y));

        if (kind === 'hit' || kind === 'blunt_hit') {
          // High-contrast starburst with dark outer edge and 4 outward spark diamonds
          const radius = (6 + (1 - Math.pow(1 - t, 2)) * 16) * scale;
          const alpha = Math.max(0, 1 - t * 1.2);
          ctx.globalAlpha = alpha;

          // Dark outer contour for contrast on bright floors (>= 2px)
          ctx.fillStyle = pal.outer;
          const coreSize = Math.max(4, Math.round(4 * scale));
          ctx.fillRect(-coreSize / 2 - 1, -coreSize / 2 - 1, coreSize + 2, coreSize + 2);

          // Core star
          ctx.fillStyle = pal.core;
          ctx.fillRect(-coreSize / 2, -coreSize / 2, coreSize, coreSize);

          // Outward sparks along impact angle
          ctx.fillStyle = pal.mid;
          const sparkSize = Math.max(3, Math.round(3 * scale));
          for (let i = 0; i < 4; i++) {
            const a = angle + (i * Math.PI) / 2 + Math.PI / 4;
            const dist = radius * (0.8 + 0.2 * i);
            const sx = Math.round(Math.cos(a) * dist);
            const sy = Math.round(Math.sin(a) * dist);
            // Outline
            ctx.fillStyle = pal.outer;
            ctx.fillRect(sx - sparkSize / 2 - 1, sy - sparkSize / 2 - 1, sparkSize + 2, sparkSize + 2);
            // Color fill
            ctx.fillStyle = pal.mid;
            ctx.fillRect(sx - sparkSize / 2, sy - sparkSize / 2, sparkSize, sparkSize);
          }
        } else if (kind === 'swing' || kind === 'thrust') {
          // Slicing slash arc with >= 2px line width and dark back-stroke for contrast
          const alpha = Math.max(0, Math.sin(t * Math.PI));
          ctx.globalAlpha = alpha;
          ctx.rotate(angle);

          const r = 22 * scale;
          const startA = -Math.PI / 3;
          const endA = startA + t * ((Math.PI * 2) / 3);

          // Dark outer contour line (>= 3px)
          ctx.strokeStyle = pal.outer;
          ctx.lineWidth = Math.max(4, 4 * scale);
          ctx.beginPath();
          ctx.arc(0, 0, r, startA, endA);
          ctx.stroke();

          // Main colored slash (>= 2px)
          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = Math.max(2, 2 * scale);
          ctx.stroke();

          // Bright center core
          ctx.strokeStyle = pal.core;
          ctx.lineWidth = Math.max(1, 1 * scale);
          ctx.stroke();
        } else if (kind === 'dodge') {
          // Hollow cyan trail arc and quick drift lines (>= 2px)
          const alpha = Math.max(0, 1 - t);
          ctx.globalAlpha = alpha;

          // Dark outer contour
          ctx.strokeStyle = pal.outer;
          ctx.lineWidth = Math.max(3, 3 * scale);
          ctx.beginPath();
          ctx.arc(-t * 14 * scale, 0, 16 * scale, -Math.PI / 2, Math.PI / 2);
          ctx.stroke();

          // Main color arc
          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = Math.max(2, 2 * scale);
          ctx.stroke();
        } else if (kind === 'poof') {
          // Defeat smoke cloud: 6 expanding puff particles fading out
          const alpha = Math.max(0, 1 - t);
          ctx.globalAlpha = alpha;
          const count = 6;
          for (let i = 0; i < count; i++) {
            const a = (i * 2 * Math.PI) / count + t;
            const dist = t * 24 * scale;
            const size = Math.max(3, Math.round((1 - t * 0.6) * 6 * scale));
            const px = Math.round(Math.cos(a) * dist);
            const py = Math.round(Math.sin(a) * dist);

            // Dark outline
            ctx.fillStyle = pal.outer;
            ctx.fillRect(px - size / 2 - 1, py - size / 2 - 1, size + 2, size + 2);
            // Smoke fill
            ctx.fillStyle = pal.mid;
            ctx.fillRect(px - size / 2, py - size / 2, size, size);
          }
        } else if (kind === 'collect') {
          // Golden sparkles converging inward then popping
          const alpha = Math.max(0, Math.sin(t * Math.PI));
          ctx.globalAlpha = alpha;
          const size = Math.max(3, Math.round(3 * scale));
          for (let i = 0; i < 5; i++) {
            const a = (i * 2 * Math.PI) / 5;
            const dist = (1 - t) * 20 * scale;
            const px = Math.round(Math.cos(a) * dist);
            const py = Math.round(Math.sin(a) * dist);

            ctx.fillStyle = pal.outer;
            ctx.fillRect(px - size / 2 - 1, py - size / 2 - 1, size + 2, size + 2);
            ctx.fillStyle = pal.core;
            ctx.fillRect(px - size / 2, py - size / 2, size, size);
          }
        } else if (kind === 'stunned') {
          // 3 revolving gold stars above head
          const starSize = Math.max(4, Math.round(4 * scale));
          for (let i = 0; i < 3; i++) {
            const a = t * Math.PI * 2 + (i * 2 * Math.PI) / 3;
            const sx = Math.round(Math.cos(a) * 14 * scale);
            const sy = Math.round(Math.sin(a) * 5 * scale); // isometric oval

            ctx.fillStyle = pal.outer;
            ctx.fillRect(sx - starSize / 2 - 1, sy - starSize / 2 - 1, starSize + 2, starSize + 2);
            ctx.fillStyle = pal.mid;
            ctx.fillRect(sx - starSize / 2, sy - starSize / 2, starSize, starSize);
          }
        } else if (kind === 'sleep') {
          // Floating Z letters
          const alpha = Math.max(0, Math.sin(t * Math.PI));
          ctx.globalAlpha = alpha;
          ctx.font = `${Math.max(10, Math.round(10 * scale))}px monospace`;
          const driftY = -Math.round(t * 16 * scale);
          const driftX = Math.round(Math.sin(t * Math.PI * 2) * 4 * scale);

          // Outline text
          ctx.fillStyle = pal.outer;
          ctx.fillText('Z', driftX + 1, driftY + 1);
          ctx.fillStyle = pal.mid;
          ctx.fillText('Z', driftX, driftY);
        } else if (kind === 'zap') {
          // Quick zigzag electric spark with >= 2px stroke
          const alpha = Math.max(0, 1 - t);
          ctx.globalAlpha = alpha;

          ctx.strokeStyle = pal.outer;
          ctx.lineWidth = Math.max(4, 4 * scale);
          ctx.beginPath();
          ctx.moveTo(-6 * scale, -8 * scale);
          ctx.lineTo(2 * scale, -2 * scale);
          ctx.lineTo(-2 * scale, 2 * scale);
          ctx.lineTo(6 * scale, 8 * scale);
          ctx.stroke();

          ctx.strokeStyle = pal.mid;
          ctx.lineWidth = Math.max(2, 2 * scale);
          ctx.stroke();
        }
      } finally {
        ctx.restore();
      }
    }
  };

  root.OfficeVfxPresets = OfficeVfxPresets;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OfficeVfxPresets };
  }
})(typeof window !== 'undefined' ? window : globalThis);
