/**
 * PP00 Gather - Office Visual Effects (OfficeVfx) Manager
 * Manages playback, deduplication, lifecycle, capacity, and rendering of visual effects.
 */
(function(root) {
  // Priority table for capacity eviction (§8, §9)
  // Higher value = higher priority to keep. Core combat results are never dropped before ambient.
  const EFFECT_PRIORITIES = {
    hit: 30,
    blunt_hit: 30,
    dodge: 30,
    poof: 30,
    swing: 20,
    thrust: 20,
    stunned: 15,
    collect: 10,
    zap: 10,
    sleep: 5
  };

  class OfficeVfx {
    constructor(options = {}) {
      this.maxActive = options.maxActive ?? 24;
      this.maxSeen = options.maxSeen ?? 512;
      this.vfxEnabled = options.vfxEnabled ?? true;
      this.active = [];
      this.seen = new Set();
      this.seenOrder = [];
      this.manifest = null;
      this.images = new Map();
      this.manifestLoaded = false;
      this._anchorResolver = typeof options.resolveAnchor === 'function' ? options.resolveAnchor : null;
    }

    get activeCount() {
      return this.active.length;
    }

    /**
     * Sets or updates the global anchor resolver function.
     * @param {Function} fn (entityId) => { x, y, headY, handX, handY, visible } | null
     */
    setAnchorResolver(fn) {
      this._anchorResolver = typeof fn === 'function' ? fn : null;
    }

    /**
     * Public method to resolve world anchor for an entity (§6.2).
     * @param {string} entityId 
     * @returns {Object|null} { x, y, headY, handX, handY, visible } | null
     */
    resolveAnchor(entityId) {
      if (!entityId || typeof this._anchorResolver !== 'function') return null;
      try {
        return this._anchorResolver(entityId);
      } catch (_) {
        return null;
      }
    }

    /**
     * Records an event id into the bounded seen cache without emitting an active visual.
     * Enforces bounded FIFO eviction up to maxSeen items (§8, §9).
     * @param {string} id
     * @returns {boolean} true if newly added, false if already seen or invalid
     */
    markSeen(id) {
      if (!id || typeof id !== 'string') return false;
      if (this.seen.has(id)) return false;
      this.seen.add(id);
      this.seenOrder.push(id);
      if (this.seenOrder.length > this.maxSeen) {
        const oldest = this.seenOrder.shift();
        if (oldest !== undefined) this.seen.delete(oldest);
      }
      return true;
    }

    /**
     * Emits a visual effect.
     * Deduplicates by event.id; bounded seen cache prevents re-emission of duplicate server/poll events.
     * Enforces strict priority eviction so core combat results (hit/dodge/poof) are never dropped before ambient.
     * @param {Object} event { id, kind, phase, entityId, x, y, angle, startedAt, durationMs, scale, layer, loop }
     * @returns {boolean} true if newly added, false if duplicated or suppressed
     */
    emit(event) {
      if (!this.vfxEnabled || !event || !event.id) return false;
      if (!this.markSeen(event.id)) return false;

      // Resolve preset configuration if available
      const presets = (typeof OfficeVfxPresets !== 'undefined' ? OfficeVfxPresets : root.OfficeVfxPresets);
      const def = presets?.definitions?.[event.kind] || {};
      const manifestDef = this.manifest?.effects?.[event.kind] || {};

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const startedAt = typeof event.startedAt === 'number' ? event.startedAt : now;
      const durationMs = event.durationMs || manifestDef.durationMs || def.durationMs || 400;
      const layer = event.layer || manifestDef.layer || def.layer || 'front';
      const scale = event.scale || manifestDef.scale || def.scale || 1.0;
      const loop = Boolean(event.loop !== undefined ? event.loop : (manifestDef.loop !== undefined ? manifestDef.loop : def.loop));

      // Enforce maxActive capacity limit (§8, §9):
      // Evict lowest priority first; if equal priority, evict oldest.
      if (this.active.length >= this.maxActive) {
        let evictIdx = 0;
        let lowestPri = Infinity;
        let oldestStartedAt = Infinity;

        for (let i = 0; i < this.active.length; i++) {
          const item = this.active[i];
          const pri = EFFECT_PRIORITIES[item.kind] ?? 10;
          if (pri < lowestPri || (pri === lowestPri && item.startedAt < oldestStartedAt)) {
            lowestPri = pri;
            oldestStartedAt = item.startedAt;
            evictIdx = i;
          }
        }
        this.active.splice(evictIdx, 1);
      }

      this.active.push({
        id: event.id,
        kind: event.kind || 'hit',
        phase: event.phase || 'confirmed',
        entityId: event.entityId || null,
        x: event.x ?? 0,
        y: event.y ?? 0,
        angle: event.angle || 0,
        startedAt,
        durationMs,
        layer,
        scale,
        loop
      });

      return true;
    }

    /**
     * Updates active effects lifecycle based on current clock.
     * @param {number} [now] current timestamp in ms
     */
    update(now) {
      const cur = typeof now === 'number' ? now : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      this.active = this.active.filter(item => {
        if (item.loop) return true;
        return (cur - item.startedAt) < item.durationMs;
      });
    }

    /**
     * Asynchronously loads the VFX manifest file and decodes any defined spritesheets.
     * Fails safely without throwing.
     */
    async load(manifestUrl) {
      try {
        if (typeof fetch === 'undefined') {
          return { ok: false, error: 'fetch not available' };
        }
        const res = await fetch(manifestUrl);
        if (!res.ok) {
          return { ok: false, status: res.status };
        }
        const data = await res.json();
        if (!data || typeof data.effects !== 'object') {
          return { ok: false, error: 'invalid manifest structure' };
        }
        this.manifest = data;
        this.manifestLoaded = true;

        // Preload and decode images if Image constructor is available in browser
        if (typeof Image !== 'undefined') {
          const imagePaths = new Set();
          for (const effect of Object.values(data.effects)) {
            if (effect.image) imagePaths.add(effect.image);
          }
          await Promise.all(
            Array.from(imagePaths).map(async src => {
              try {
                const img = new Image();
                img.src = src;
                if (typeof img.decode === 'function') {
                  await img.decode().catch(() => {});
                }
                this.images.set(src, img);
              } catch (_) {}
            })
          );
        }

        return { ok: true, manifest: this.manifest };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }

    /**
     * Draws active effects onto the given canvas context.
     * Uses spritesheet animation if loaded and valid, or procedural fallback with dark contours.
     * Immediately purges looping status effects if the target entity has despawned (§6.2).
     * @param {CanvasRenderingContext2D} ctx 
     * @param {string} [targetLayer='front'] 'front' | 'back' | 'ground' | null
     * @param {Function} [resolveAnchor] (entityId) => { x, y, headY, handX, handY, visible }
     * @param {number} [now]
     */
    draw(ctx, targetLayer = 'front', resolveAnchor = null, now = null) {
      if (!this.vfxEnabled || !ctx || this.active.length === 0) return;
      const cur = typeof now === 'number' ? now : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const presets = (typeof OfficeVfxPresets !== 'undefined' ? OfficeVfxPresets : root.OfficeVfxPresets);
      const resolver = typeof resolveAnchor === 'function' ? resolveAnchor : (id => this.resolveAnchor(id));

      const surviving = [];

      for (let i = 0; i < this.active.length; i++) {
        const item = this.active[i];

        // Layer check
        if (targetLayer && item.layer !== targetLayer) {
          surviving.push(item);
          continue;
        }

        let posX = item.x;
        let posY = item.y;
        let isEntityDespawned = false;

        if (item.entityId && typeof resolver === 'function') {
          let anchor = null;
          try {
            anchor = resolver(item.entityId);
          } catch (_) {
            anchor = null;
          }

          if (anchor && anchor.visible !== false) {
            posX = anchor.x ?? posX;
            posY = anchor.y ?? posY;

            // If headY is available for stunned/sleep, anchor directly to head without redundant offset
            if (anchor.headY != null && (item.kind === 'stunned' || item.kind === 'sleep')) {
              posY = anchor.headY;
            } else {
              const def = presets?.definitions?.[item.kind];
              if (def?.anchorOffset) {
                posX += def.anchorOffset.x;
                posY += def.anchorOffset.y;
              }
            }
          } else {
            isEntityDespawned = true;
          }
        } else {
          const def = presets?.definitions?.[item.kind];
          if (def?.anchorOffset) {
            posX += def.anchorOffset.x;
            posY += def.anchorOffset.y;
          }
        }

        // Spec §6.2: continuous status effects (loop) are immediately purged if the entity is removed
        if (item.loop && isEntityDespawned) {
          continue; // Discard effect, do not keep in surviving
        }
        surviving.push(item);

        // Calculate normalized time t
        let t = (cur - item.startedAt) / item.durationMs;
        if (item.loop) {
          t = (t % 1 + 1) % 1;
        } else {
          t = Math.max(0, Math.min(1, t));
        }

        // Attempt spritesheet rendering if manifest & image are present
        const manifestDef = this.manifest?.effects?.[item.kind];
        let drewSprite = false;

        if (manifestDef && manifestDef.image && Array.isArray(manifestDef.frames) && manifestDef.frames.length > 0) {
          const img = this.images.get(manifestDef.image);
          if (img && img.complete && img.naturalWidth > 0) {
            // Find frame by accumulated frame duration
            const totalDuration = item.durationMs;
            const elapsedMs = t * totalDuration;
            let accum = 0;
            let currentFrame = manifestDef.frames[0];
            for (const f of manifestDef.frames) {
              accum += f.durationMs;
              if (elapsedMs < accum) {
                currentFrame = f;
                break;
              }
            }

            const pivotX = manifestDef.pivotPx?.x ?? 0;
            const pivotY = manifestDef.pivotPx?.y ?? 0;
            const scale = item.scale || manifestDef.scale || 1.0;
            const dstW = currentFrame.w * scale;
            const dstH = currentFrame.h * scale;
            const dstX = Math.round(posX - pivotX * scale);
            const dstY = Math.round(posY - pivotY * scale);

            ctx.save();
            try {
              if (item.angle) {
                ctx.translate(Math.round(posX), Math.round(posY));
                ctx.rotate(item.angle);
                ctx.drawImage(img, currentFrame.x, currentFrame.y, currentFrame.w, currentFrame.h, -pivotX * scale, -pivotY * scale, dstW, dstH);
              } else {
                ctx.drawImage(img, currentFrame.x, currentFrame.y, currentFrame.w, currentFrame.h, dstX, dstY, dstW, dstH);
              }
              drewSprite = true;
            } catch (_) {
              drewSprite = false;
            } finally {
              ctx.restore();
            }
          }
        }

        // Graceful fallback to procedural pixel canvas rendering
        if (!drewSprite && presets && typeof presets.drawFallback === 'function') {
          try {
            presets.drawFallback(ctx, item, t, posX, posY);
          } catch (_) {}
        }
      }

      this.active = surviving;
    }

    /**
     * Removes active effects associated with a specific entity.
     */
    removeByEntity(entityId, kind = null) {
      if (!entityId) return;
      this.active = this.active.filter(item => {
        if (item.entityId !== entityId) return true;
        if (kind && item.kind !== kind) return true;
        return false;
      });
    }

    /**
     * Resets active effects and seen caches (e.g. on logout / scene change).
     */
    clear() {
      this.active = [];
      this.seen.clear();
      this.seenOrder = [];
    }
  }

  root.OfficeVfx = OfficeVfx;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OfficeVfx };
  }
})(typeof window !== 'undefined' ? window : globalThis);
