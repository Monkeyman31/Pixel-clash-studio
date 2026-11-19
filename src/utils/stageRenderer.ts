import { DummyOpponent, GroundConfig, Hitbox, StageType } from '../types';

// Render Stage Background onto Canvas
export function renderStageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  stageType: StageType,
  stageOpacity: number,
  groundConfig: GroundConfig,
  characterPivot: { x: number; y: number }
) {
  const canvasW = width * zoom;
  const canvasH = height * zoom;
  const groundY = groundConfig.groundY * zoom;

  ctx.save();
  ctx.globalAlpha = stageOpacity;

  switch (stageType) {
    case 'training_grid': {
      // Background gradient (Dark slate to cool blue)
      const grad = ctx.createLinearGradient(0, 0, 0, canvasH);
      grad.addColorStop(0, '#151926');
      grad.addColorStop(1, '#0e111a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Vertical distance grid lines (every 8 pixels)
      ctx.strokeStyle = 'rgba(78, 120, 200, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, canvasH);
        ctx.stroke();
      }

      // Floor grid perspective lines below ground
      ctx.fillStyle = 'rgba(30, 41, 64, 0.4)';
      ctx.fillRect(0, groundY, canvasW, canvasH - groundY);
      break;
    }

    case 'dojo': {
      // Wood panels & Shoji screen
      ctx.fillStyle = '#1c1714';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Shoji grid upper wall
      ctx.strokeStyle = 'rgba(180, 140, 90, 0.12)';
      ctx.lineWidth = 1;
      for (let y = 0; y < groundY; y += 12 * zoom) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasW, y);
        ctx.stroke();
      }
      for (let x = 0; x <= width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, groundY);
        ctx.stroke();
      }

      // Tatami wood floor
      ctx.fillStyle = '#2d2118';
      ctx.fillRect(0, groundY, canvasW, canvasH - groundY);
      break;
    }

    case 'cyberpunk': {
      // Deep purple/night sky
      const sky = ctx.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, '#0a0514');
      sky.addColorStop(1, '#1e0b2e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, canvasW, groundY);

      // Neon grid lines
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x * zoom, 0);
        ctx.lineTo(x * zoom, groundY);
        ctx.stroke();
      }

      // Asphalt wet floor
      ctx.fillStyle = '#0f111a';
      ctx.fillRect(0, groundY, canvasW, canvasH - groundY);

      // Cyan neon floor line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvasW, groundY);
      ctx.stroke();
      break;
    }

    case 'dark_arena': {
      // Tournament spotlight stage
      ctx.fillStyle = '#0c0e14';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Spotlight cone
      const cone = ctx.createRadialGradient(
        canvasW / 2,
        groundY,
        5 * zoom,
        canvasW / 2,
        groundY,
        25 * zoom
      );
      cone.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      cone.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = cone;
      ctx.fillRect(0, 0, canvasW, canvasH);
      break;
    }

    default:
      // Default checkerboard handled by CSS
      break;
  }

  ctx.restore();

  // Draw Ground Line & Projected Foot Shadow
  if (groundConfig.visible) {
    ctx.save();

    // Projected character shadow under pivot
    if (groundConfig.showShadow) {
      const shadowX = (characterPivot.x + 0.5) * zoom;
      const shadowY = groundY;
      const shadowRx = 6 * zoom;
      const shadowRy = 2 * zoom;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(shadowX, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // High-visibility ground line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)'; // Amber ground line
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvasW, groundY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('GROUND LEVEL', 4, groundY - 3);

    ctx.restore();
  }
}

export interface DummyCollisionResult {
  hasCollision: boolean;
  collisionType?: 'hit' | 'block' | 'throw' | 'counter' | 'clash' | 'armor' | 'guard_cancel';
  label?: string;
  hitCoords?: { x: number; y: number };
}

// Render Dummy Opponent (P2 Silhouette) across 6 Dummy States and test for Box Collisions
export function renderDummyOpponent(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  dummy: DummyOpponent,
  groundY: number,
  p1Hitboxes: Hitbox[],
  animPhaseTime: number = 0
): DummyCollisionResult {
  if (!dummy.enabled) return { hasCollision: false };

  ctx.save();

  const state = dummy.state || 'idle';
  const p2Width = 14;
  const p2Height = 22;

  let walkOffset = 0;
  let jumpOffset = 0;
  if (state === 'walk') {
    walkOffset = Math.round(Math.sin(animPhaseTime * 4) * 5);
  } else if (state === 'jump') {
    jumpOffset = Math.round(Math.abs(Math.sin(animPhaseTime * 3.5)) * 12);
  }

  const p2X = Math.min(width - p2Width - 2, Math.max(0, dummy.distance + walkOffset));
  const p2Y = groundY - p2Height - jumpOffset;

  const sx = p2X * zoom;
  const sy = p2Y * zoom;
  const sw = p2Width * zoom;
  const sh = p2Height * zoom;

  const stateBodyColor =
    state === 'block'
      ? 'rgba(56, 189, 248, 0.4)'
      : state === 'counter_hit'
      ? 'rgba(244, 63, 94, 0.42)'
      : state === 'guard_cancel'
      ? 'rgba(245, 158, 11, 0.45)'
      : 'rgba(99, 102, 241, 0.35)';

  const stateStrokeColor =
    state === 'block'
      ? '#38bdf8'
      : state === 'counter_hit'
      ? '#f43f5e'
      : state === 'guard_cancel'
      ? '#f59e0b'
      : '#6366f1';

  // Draw dummy silhouette
  ctx.fillStyle = stateBodyColor;
  ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = stateStrokeColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sx, sy, sw, sh);

  // Head
  ctx.fillStyle = stateBodyColor;
  const headSize = 6 * zoom;
  ctx.fillRect(sx + sw / 2 - headSize / 2, sy - headSize, headSize, headSize);
  ctx.strokeRect(sx + sw / 2 - headSize / 2, sy - headSize, headSize, headSize);

  // Guard / Guard Cancel shield indicator
  if (state === 'block' || state === 'guard_cancel') {
    ctx.strokeStyle = state === 'guard_cancel' ? '#fbbf24' : '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx - 2 * zoom, sy - 4 * zoom);
    ctx.lineTo(sx - 2 * zoom, sy + sh);
    ctx.stroke();
  }

  // P2 Hurtbox (Green)
  const dummyHurtbox = {
    x: p2X - 1,
    y: p2Y - 6,
    w: p2Width + 2,
    h: p2Height + 6,
  };

  if (dummy.showHurtbox) {
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      dummyHurtbox.x * zoom,
      dummyHurtbox.y * zoom,
      dummyHurtbox.w * zoom,
      dummyHurtbox.h * zoom
    );
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(`P2 [${state.toUpperCase()}]`, dummyHurtbox.x * zoom, dummyHurtbox.y * zoom - 4);
  }

  // Check intersections against P1 active boxes (hitbox, throwbox, counterbox, clashbox, armorbox)
  let result: DummyCollisionResult = { hasCollision: false };

  for (const hb of p1Hitboxes) {
    const isInteractive =
      hb.type === 'hitbox' ||
      hb.type === 'throwbox' ||
      hb.type === 'counterbox' ||
      hb.type === 'clashbox' ||
      hb.type === 'armorbox';
    if (!isInteractive) continue;

    const p1Right = hb.x + hb.w;
    const p1Bottom = hb.y + hb.h;
    const dRight = dummyHurtbox.x + dummyHurtbox.w;
    const dBottom = dummyHurtbox.y + dummyHurtbox.h;

    if (
      hb.x < dRight &&
      p1Right > dummyHurtbox.x &&
      hb.y < dBottom &&
      p1Bottom > dummyHurtbox.y
    ) {
      const hitCoords = {
        x: Math.max(hb.x, dummyHurtbox.x) + 2,
        y: Math.max(hb.y, dummyHurtbox.y) + 2,
      };

      if (hb.type === 'throwbox') {
        result = { hasCollision: true, collisionType: 'throw', label: 'THROW!', hitCoords };
      } else if (hb.type === 'counterbox') {
        result = { hasCollision: true, collisionType: 'counter', label: 'PARRY!', hitCoords };
      } else if (hb.type === 'clashbox') {
        result = { hasCollision: true, collisionType: 'clash', label: 'CLASH!', hitCoords };
      } else if (hb.type === 'armorbox') {
        result = { hasCollision: true, collisionType: 'armor', label: 'ARMOR!', hitCoords };
      } else if (state === 'block') {
        result = { hasCollision: true, collisionType: 'block', label: 'BLOCK!', hitCoords };
      } else if (state === 'guard_cancel') {
        result = { hasCollision: true, collisionType: 'guard_cancel', label: 'G-CANCEL!', hitCoords };
      } else if (state === 'counter_hit') {
        result = { hasCollision: true, collisionType: 'counter', label: 'COUNTER HIT!', hitCoords };
      } else {
        result = { hasCollision: true, collisionType: 'hit', label: 'HIT!', hitCoords };
      }
      break;
    }
  }

  if (result.hasCollision && result.hitCoords) {
    const sparkX = result.hitCoords.x * zoom;
    const sparkY = result.hitCoords.y * zoom;

    const sparkFill =
      result.collisionType === 'block'
        ? '#38bdf8'
        : result.collisionType === 'throw'
        ? '#c084fc'
        : result.collisionType === 'clash'
        ? '#fb923c'
        : result.collisionType === 'armor'
        ? '#f8fafc'
        : '#ffff00';

    const sparkStroke =
      result.collisionType === 'block'
        ? '#0284c7'
        : result.collisionType === 'throw'
        ? '#9333ea'
        : '#ff3300';

    ctx.fillStyle = sparkFill;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 7 * zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = sparkStroke;
    ctx.lineWidth = 3;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(sparkX, sparkY);
      ctx.lineTo(
        sparkX + Math.cos(angle) * 11 * zoom,
        sparkY + Math.sin(angle) * 11 * zoom
      );
      ctx.stroke();
    }

    const label = result.label || 'HIT!';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = sparkStroke;
    ctx.lineWidth = 2;
    ctx.font = 'bold 13px monospace';
    ctx.strokeText(label, sparkX - 18, sparkY - 12);
    ctx.fillText(label, sparkX - 18, sparkY - 12);
  }

  ctx.restore();
  return result;
}
