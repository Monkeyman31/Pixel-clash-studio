import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// AI Studio requirement: server must run on port 3000 (Nginx on 8080 reverse-proxies to localhost:3000)
function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p) && p > 0 && p !== 8080) return p;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p) && p > 0) return p;
  }
  return 3000;
}
const port = resolvePort();

app.use(express.json({ limit: '10mb' }));

// Health check endpoints for container and warmup probes
app.get('/health', (_req, res) => res.status(200).send('OK'));
app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok', port }));

// Initialize Google GenAI if key is present
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const STYLE_PROFILE_DIRECTIVES: Record<string, string> = {
  nes: 'Authentic 8-bit NES Famicom pixel art: strict 3-4 color ramps per sprite, blocky pure pixel clusters, crisp 1px black outlines, zero anti-aliasing.',
  gameboy: 'Nintendo Game Boy DMG-01 4-shade olive-green pixel art: strict 4 tones (#0f380f, #306230, #8bac0f, #9bbc0f) and crisp Bayer dithering.',
  snes: 'Super Nintendo (SNES) 16-bit pixel art: 12-15 color hue-shifted shading ramps, crisp 1px tinted dark outlines, warm expressive readability.',
  sega_genesis: 'SEGA Genesis / Mega Drive 16-bit pixel art: bold metallic speculars, cobalt/crimson contrast, intentional vertical and checkerboard dithering.',
  cps1: 'Capcom CPS-1 arcade pixel art (SF2 / Final Fight): chunky muscular volume, firm 1px black outlines, bold sunlit primary hues.',
  cps2: 'Capcom CPS-2 16-color indexed sprite palette: vibrant saturated cel-shaded hues, high readability against detailed arcade backgrounds.',
  snk_neogeo: '1990s SNK Neo Geo MVS 16-bit pixel art: subtle artisanal dithering, gritty warm earth and metallic tones, authentic arcade contrast.',
  kof: 'The King of Fighters arcade pixel art aesthetic: crisp 1px dark outlines, dramatic directional rim light, dynamic Neo-Geo fighting silhouettes.',
  garou: 'Garou: Mark of the Wolves (1999 SNK) master pixel art style: fluid anatomical motion creases, warm directional sunlight vs cool twilight shadows, crisp 1px variable-dark ink outlines.',
  sf_alpha: 'Street Fighter Alpha 3 CPS-2 anime pixel art style: bold muscular shapes, clean cel-shaded color ramps, bright tournament-readable highlights.',
  darkstalkers: 'Darkstalkers Vampire Savior style: exaggerated gothic arcade animation, saturated violet/magenta shadows and eerie emerald highlights.',
  metal_slug: 'Metal Slug SNK/Nazca masterclass pixel art: dense weathered metallic/fabric micro-texture, warm olive drab, rust, smoky orange bursts.',
  guilty_gear: 'Guilty Gear anime fighting game aesthetic: sharp 1-2px angular outlines, heavy contrast shadows, neon magenta and electric cyan energy.',
  blazblue: 'BlazBlue 2D anime fighter sprite aesthetic: crystalline azure and royal blue lighting, ornate gold trim, razor-sharp arcane energy bursts.',
  skullgirls: 'Skullgirls dark Art Deco fighting game aesthetic rendered in crisp pixel art: thick bold ink outlines, elastic silhouette readability, dramatic plum/crimson/gold cel shading.',
  pixel_fantasy: 'Handcrafted Pixel Fantasy action/fighter sprite style: crisp steel highlights, emerald and arcane gold magic runes, rich wood/leather tones.',
  pixel_scifi: 'Sci-Fi Cyberpunk pixel art aesthetic: deep midnight shadows with intense cyan, hot pink, and lime neon rim-lighting and holographic accents.',
  pixel_cyberpunk: 'Sci-Fi Cyberpunk pixel art aesthetic: deep midnight shadows with intense cyan, hot pink, and lime neon rim-lighting and holographic accents.',
  pixel_rpg: 'Classic Pixel RPG sprite style: balanced readable proportions, warm skin/cloth shading, clean 1px dark sepia/indigo outlines.',
  custom: 'Follow the artist custom style definition, outline width, shading type, and exact palette colors strictly.',
};

function buildContextualDirective(
  styleMode: string = 'keep',
  styleProfile: string = 'kof',
  blendRatio: number = 0.5,
  contextAnalysis?: any,
  palette: string[] = [],
  options?: {
    trainedProfile?: any;
    coherenceLevel?: string;
    poseFidelity?: string;
    referenceFidelity?: string;
    customStyleDescription?: string;
    referenceMode?: 'strict' | 'free';
    preserveConstraints?: Record<string, boolean>;
    phase1Analysis?: any;
    referenceProject?: any;
  }
): string {
  const effectiveProfileKey =
    styleMode === 'auto_detect' && contextAnalysis?.detectedProfileId
      ? contextAnalysis.detectedProfileId
      : styleProfile === 'pixel_cyberpunk'
      ? 'pixel_scifi'
      : styleProfile;
  const profileDesc =
    effectiveProfileKey === 'custom' && options?.customStyleDescription
      ? `CUSTOM ARTIST STYLE: ${options.customStyleDescription}`
      : STYLE_PROFILE_DIRECTIVES[effectiveProfileKey] || STYLE_PROFILE_DIRECTIVES.kof;

  const ctxSummary = contextAnalysis
    ? `Active Project Visual Analysis -> Style: ${contextAnalysis.visualStyle} (${contextAnalysis.era || 'Arcade'}), Detected Profile: ${contextAnalysis.detectedProfileId || effectiveProfileKey}, Resolution: ${contextAnalysis.resolution}, Colors Used: ${contextAnalysis.uniqueColors}, Outline: ${contextAnalysis.lineThickness ?? 1}px, Shading: ${contextAnalysis.shadingType || 'cel'}, Light Direction: ${contextAnalysis.lightDirection || 'top-left'}, Anti-Alias: ${contextAnalysis.antiAliasLevel || 'none'}, Detail Level: ${contextAnalysis.detailLevel || 'medium'}, Animation: ${contextAnalysis.animationType}, Palette: ${(contextAnalysis.activePalette || palette).slice(0, 14).join(', ')}.`
    : `Project Palette: ${palette.slice(0, 14).join(', ')}.`;

  const phase1Note = options?.phase1Analysis
    ? ` PHASE 1 VERIFIED ANALYSIS -> Detected Style: ${options.phase1Analysis.detectedStyle}, Palette Colors: ${options.phase1Analysis.paletteCount}, Detected Pose: ${options.phase1Analysis.detectedPose}, Perspective: ${options.phase1Analysis.perspective}, Outline: ${options.phase1Analysis.outlinePx}px, Anatomy: ${options.phase1Analysis.anatomyNotes}.`
    : '';

  const trainedNote = options?.trainedProfile
    ? ` TRAINED PROJECT BASELINE (${options.trainedProfile.summary}): Enforce master project palette [${(options.trainedProfile.masterPalette || []).slice(0, 12).join(', ')}], outline ${options.trainedProfile.lineThickness}px, light ${options.trainedProfile.lightDirection}, shading ${options.trainedProfile.shadingType}.`
    : '';

  const preserveEntries = options?.preserveConstraints
    ? Object.entries(options.preserveConstraints)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)
    : [];
  const preserveRule =
    preserveEntries.length > 0
      ? ` MANDATORY PRESERVATION LOCKS: Strictly preserve [${preserveEntries.join(', ')}] across the generated pixels.`
      : '';

  const coherence = options?.coherenceLevel || 'high';
  const coherenceRule =
    coherence === 'max'
      ? 'COHERENCE: MAXIMUM — Strictly lock colors to the active palette, preserve exact outline width, ZERO stray 1px orphan noise dots, ZERO interior holes, ZERO blurry semi-transparent anti-alias pixels.'
      : coherence === 'high'
      ? 'COHERENCE: HIGH — Keep clean contiguous silhouettes, zero accidental 1px holes or isolated stray noise pixels, and crisp solid hex colors.'
      : 'COHERENCE: BALANCED — Maintain clean pixel clusters and readable fighting-game silhouettes without stray single-pixel noise.';

  const refMode = options?.referenceMode || 'strict';
  const fidelity = options?.referenceFidelity || options?.poseFidelity || 'high';
  const fidelityRule =
    refMode === 'free'
      ? ' REFERENCE MODE: FREE INSPIRATION — Draw creative inspiration from the reference style, colors, and energy without copying its exact silhouette or pose pixel-for-pixel.'
      : fidelity === 'exact'
      ? ' REFERENCE MODE: STRICT (EXACT) — Strictly imitate the reference pose, keep exact body proportions and composition, preserve silhouette, hair, outfit, and limb continuity as ONE connected figure; NEVER cut or fragment limbs.'
      : fidelity === 'high'
      ? ' REFERENCE MODE: STRICT (HIGH) — Interpret the entire character coherently preserving pose, proportions, outfit, accessories, and intact body continuity.'
      : fidelity === 'medium'
      ? ' REFERENCE MODE: STRICT (MEDIUM) — Follow core reference stance and proportions while allowing minor dynamic arcade polish.'
      : ' REFERENCE MODE: STRICT (LOW) — Loosely follow reference posture and framing cues.';

  let modeDirective = '';
  if (styleMode === 'adapt' || styleMode === 'custom') {
    modeDirective = `MODE: MANUAL/ADAPT TARGET STYLE (${effectiveProfileKey}). ${profileDesc}`;
  } else if (styleMode === 'auto_detect') {
    modeDirective = `MODE: AUTO-DETECTED PROJECT STYLE (${effectiveProfileKey}). ${profileDesc} Harmonize with project lighting and outline thickness.`;
  } else if (styleMode === 'blend') {
    const pct = Math.round(Math.max(0, Math.min(1, blendRatio)) * 100);
    modeDirective = `MODE: BLEND STYLES (${100 - pct}% Current Project + ${pct}% Profile "${effectiveProfileKey}": ${profileDesc}).`;
  } else {
    modeDirective = `MODE: KEEP CURRENT PROJECT STYLE strictly. Match existing palette, outline thickness, shading, and light direction.`;
  }

  const refProjectNote = options?.referenceProject
    ? ` ${options.referenceProject.promptDirective || `GLOBAL REFERENCE PROJECT: ${options.referenceProject.name} (Sprites: ${options.referenceProject.spriteTraits}; FX: ${options.referenceProject.fxTraits}; HUD: ${options.referenceProject.hudTraits}; Stage: ${options.referenceProject.stageTraits}).`}`
    : '';

  return `${ctxSummary}${phase1Note}${trainedNote}${refProjectNote} ${modeDirective} ${coherenceRule}${fidelityRule}${preserveRule}`;
}

function appendReferenceGuideImages(parts: any[], referenceImagesBase64?: unknown) {
  if (!Array.isArray(referenceImagesBase64)) return;
  for (const img of referenceImagesBase64.slice(0, 3)) {
    if (typeof img === 'string') {
      const match = img.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
  }
}

// API: Phase 1 Context & Reference Visual Analyzer (Two-Phase Generative AI Flow)
app.post('/api/ai/analyze-context', async (req, res) => {
  try {
    const {
      currentFrameBase64,
      referenceImagesBase64 = [],
      projectContext,
      targetSection = 'personajes',
      prompt = '',
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const parts: any[] = [];
    if (typeof currentFrameBase64 === 'string') {
      const match = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    appendReferenceGuideImages(parts, referenceImagesBase64);

    const systemInstruction = `You are a technical pixel-art director performing Phase 1 Pre-Generation Analysis for a 2D Fighting Game studio.
Inspect the attached canvas/reference images and project telemetry carefully BEFORE generation happens.
Output ONLY valid JSON:
{
  "detectedStyle": string,
  "profileId": "nes" | "gameboy" | "snes" | "sega_genesis" | "cps1" | "cps2" | "snk_neogeo" | "kof" | "garou" | "sf_alpha" | "darkstalkers" | "metal_slug" | "guilty_gear" | "blazblue" | "skullgirls" | "pixel_fantasy" | "pixel_scifi" | "pixel_rpg" | "custom",
  "paletteCount": number,
  "detectedPose": string,
  "perspective": "Lateral 2D" | "3/4" | "Frontal" | "Cenital / Mixta",
  "outlinePx": number,
  "shadingType": "flat" | "cel" | "gradient_dither",
  "lightDirection": "top-left" | "top-right" | "top" | "front" | "rim",
  "anatomyNotes": string
}
Rules:
- Be concise and concrete in Spanish for detectedPose and anatomyNotes (e.g., "Patada frontal extendida", "Guardia media derecha", "Anatomía atlética compacta con contorno limpio").`;

    parts.push({
      text: `Analyze context for section "${targetSection}". Intent: "${prompt}". Local metrics: ${JSON.stringify(projectContext || {})}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in Phase 1 analyze-context:', error);
    return res.status(500).json({ error: error.message || 'Failed Phase 1 visual analysis' });
  }
});

// API: AI Fighting Game VFX Generator & Optional FX Lab Assistant
app.post('/api/ai/vfx-generate', async (req, res) => {
  try {
    const {
      prompt,
      width = 48,
      height = 48,
      palette = [],
      stylePreset = 'kof',
      styleMode = 'keep',
      styleProfile = 'kof',
      blendRatio = 0.5,
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      referenceImagesBase64 = [],
      effectType,
      detailLevel,
      visualStyle,
      modifiers,
      shape,
      direction,
      customAngleDeg,
      frameCount = 4,
      splitComponents = false,
      complexity = 'medium',
      particleAmount = 'medium',
      animated = true,
      assistAction = 'generate',
      sourcePixels = [],
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true
      });
    }

    const safeFrameCount = animated === false ? 1 : Math.max(1, Math.min(16, Math.round(Number(frameCount) || 4)));
    const resolvedStyle = visualStyle || styleProfile || stylePreset || 'cps2';
    const contextualDirective = buildContextualDirective(
      styleMode,
      resolvedStyle,
      blendRatio,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const assistDirectiveMap: Record<string, string> = {
      generate: 'Create a brand-new pixel art VFX sequence matching the exact user specifications.',
      variations: 'Generate a fresh, creative visual variation of the existing FX while keeping its core silhouette and readability.',
      clean: 'Clean up stray pixels, remove visual noise, sharpen silhouettes, and enforce clean pixel clusters.',
      add_detail: 'Enhance the existing FX with richer internal highlights, micro-sparks, dynamic edges, and pixel-art shading depth.',
      simplify: 'Simplify the FX into bold, readable low-count retro pixel shapes with fewer colors and crisp outlines.',
      adapt_style: `Restyle the FX strictly to match the "${resolvedStyle}" visual aesthetic and color contrast.`,
      recolor: `Recolor the FX harmoniously using the target palette: ${(palette || []).slice(0, 10).join(', ')}.`,
      animate: `Convert the source FX into a lively ${safeFrameCount}-frame animated VFX cycle with smooth motion progression.`,
    };
    const assistDirective = assistDirectiveMap[String(assistAction)] || assistDirectiveMap.generate;

    const sampledSource = Array.isArray(sourcePixels)
      ? sourcePixels
          .slice(0, 220)
          .filter((p: any) => p && typeof p.x === 'number' && typeof p.y === 'number' && typeof p.color === 'string')
      : [];

    const fxSpecLines = [
      `Assistant Task: ${assistDirective}`,
      effectType ? `Effect Type: ${effectType}` : null,
      detailLevel ? `Detail Level: ${detailLevel}` : null,
      complexity ? `Complexity: ${complexity}` : null,
      particleAmount ? `Particle Density / Amount: ${particleAmount}` : null,
      `Animation Mode: ${animated === false ? 'Static single frame' : `Animated (${safeFrameCount} frames)`}`,
      visualStyle ? `Visual Style: ${visualStyle}` : null,
      shape ? `Geometric Shape: ${shape}` : null,
      direction ? `Direction: ${direction}${direction === 'custom' && customAngleDeg !== undefined ? ` (${customAngleDeg}deg)` : ''}` : null,
      modifiers ? `Modifiers: ${JSON.stringify(modifiers)}` : null,
      splitComponents ? 'Layer Split: include optional component separation hints (base/glow/sparks/smoke).' : null,
      sampledSource.length > 0
        ? `Existing Source FX Sample (${sampledSource.length} pixels): ${JSON.stringify(sampledSource)}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const systemInstruction = `You are an expert retro fighting game pixel artist and VFX animator assisting inside FX Lab.
Generate a ${safeFrameCount}-FRAME ${safeFrameCount > 1 ? 'ANIMATED' : 'STATIC'} pixel art VFX sequence (progression from ignition/startup through peak burst/arc to dissipation).
${contextualDirective}
${fxSpecLines}
If reference images are attached, use their silhouette, energy shape, and color inspiration while staying strictly crisp pixel art.

Output ONLY a valid JSON object matching this schema:
{
  "name": string,
  "description": string,
  "category": "projectile" | "hit_spark" | "energy_slash" | "aura" | "dust",
  "style": "${resolvedStyle}",
  "recommendedFramesCount": ${safeFrameCount},
  "pixels": [
    {"x": number, "y": number, "color": string}
  ],
  "frames": [
    [ {"x": number, "y": number, "color": string} ]
  ],
  "hitbox": {
    "x": number,
    "y": number,
    "width": number,
    "height": number
  }
}
Rules:
- Width is ${width}, Height is ${height} (0-indexed coordinates).
- Return exactly ${safeFrameCount} entries in "frames", each having 40-180 crisp pixel coordinates showing smooth frame-by-frame motion.
- "pixels" should contain the peak intensity frame.
- Coordinates MUST strictly be within 0..${width - 1} for x and 0..${height - 1} for y.`;

    const parts: any[] = [];
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `FX Lab Task (${assistAction}): "${prompt || effectType || 'pixel art vfx'}". Style: ${resolvedStyle}, Detail: ${detailLevel || 'high'}, Complexity: ${complexity}, Particles: ${particleAmount}, Shape: ${shape || 'auto'}, Direction: ${direction || 'right'}, Frames: ${safeFrameCount}, Grid size: ${width}x${height}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from AI model');
    }

    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating VFX:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate VFX' });
  }
});

// API: AI Guided Modular FX Recipe Builder (creates 100% manually editable modular layers, morphology & deformers)
app.post('/api/ai/vfx-recipe', async (req, res) => {
  try {
    const {
      prompt = '',
      effectType = 'aura',
      detailLevel = 'high',
      visualStyle = 'cps2',
      animated = true,
      frameCount = 8,
      particleAmount = 'medium',
      complexity = 'medium',
      palette = [],
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const systemInstruction = `You are a veteran 2D fighting game VFX technical artist designing a modular, 100% manually editable FX recipe for PixelClash Studio's FX Lab.
Understand creative natural-language instructions like:
- "Aura de ki basada en viento" -> wind_streams + dust_cloud + distortion + optional light aura_shell
- "Electricidad suave" -> lightning + glow + particles with soft cyan/white palette and low chaos
- "Humo mágico" -> smoke + particles + glow with violet/pink tones and wave/turbulence deformers
- "Explosión con escombros grandes" -> fire_core + fragments + smoke + waves + sparks
- "Chakra oscuro con fragmentación" -> aura_shell + smoke + fragments + distortion with dark purple/black palette

Output ONLY valid JSON matching this exact schema:
{
  "name": string,
  "explanation": string,
  "frameCount": number,
  "modules": [
    {
      "name": string,
      "type": "particles" | "glow" | "lightning" | "smoke" | "sparks" | "waves" | "fire_core" | "fragments" | "smear" | "fluid" | "aura_shell" | "wind_streams" | "distortion" | "ground_spikes" | "dust_cloud",
      "layerRole": "base" | "particles" | "rocks" | "smoke" | "sparks" | "distortion" | "glow" | "extras",
      "blendMode": "normal" | "screen" | "color-dodge" | "lighten",
      "colorCore": "#hex",
      "colorMid": "#hex",
      "colorEdge": "#hex",
      "scale": number,
      "density": number,
      "intensity": number,
      "speed": number,
      "opacity": number,
      "chaos": number,
      "angleDeg": number,
      "offsetX": number,
      "offsetY": number
    }
  ],
  "morphology": {
    "enabled": boolean,
    "width": number,
    "height": number,
    "topWidth": number,
    "midWidth": number,
    "bottomWidth": number,
    "overallHeight": number
  },
  "deformers": {
    "enabled": boolean,
    "wave": number,
    "curvature": number,
    "twist": number,
    "noise": number,
    "turbulence": number,
    "distortion": number,
    "vortex": number,
    "expansion": number,
    "contraction": number,
    "visualSpeed": number,
    "agitation": number,
    "flow": number
  }
}
Rules:
- Return 2 to 6 cohesive modules tailored strictly to the user prompt and complexity (${complexity}).
- Respect particleAmount (${particleAmount}) and animated (${animated ? frameCount + ' frames' : '1 static frame'}).
- Use crisp hex colors (#rrggbb) inspired by the prompt and optional project palette: ${(palette || []).slice(0, 10).join(', ')}.
- Keep numeric ranges valid: scale 40..170, density 20..100, intensity 30..100, speed 40..180, chaos 5..90, offsetX/offsetY -30..30.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Prompt: "${prompt || effectType}". Type: ${effectType}, Detail: ${detailLevel}, Style: ${visualStyle}, Animated: ${animated}, Frames: ${frameCount}, Particles: ${particleAmount}, Complexity: ${complexity}.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating modular FX recipe:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate modular FX recipe' });
  }
});

// API: AI Frame In-Between / Motion Breakdown Assistant
app.post('/api/ai/tween-assist', async (req, res) => {
  try {
    const { actionName, totalFrames, keyframesInfo } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true
      });
    }

    const systemInstruction = `You are a professional fighting game animation director (CPS2, Street Fighter III 3rd Strike, BlazBlue, King of Fighters).
Given a move name and frame count, provide precise fighting game frame data, animation principles (anticipation, smear frames, active hit, recovery, follow-through), and exact pixel displacement instructions for animators.
Output ONLY valid JSON with this schema:
{
  "actionName": string,
  "archetype": "Strike" | "Projectile" | "Anti-Air" | "Command Grab" | "Dash",
  "startupFrames": number,
  "activeFrames": number,
  "recoveryFrames": number,
  "totalFrames": number,
  "frameBreakdown": [
    {
      "frameIndex": number,
      "phase": "Anticipation / Startup" | "Smear / Active" | "Impact / Hit" | "Recovery" | "Follow-through",
      "durationTicks": number,
      "directorNotes": string,
      "pixelMotionTips": string,
      "hitboxType": "none" | "hurtbox_extended" | "active_hitbox"
    }
  ],
  "hitAdvantage": string,
  "blockAdvantage": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze combat move: "${actionName}". Current frame count: ${totalFrames}. Details: ${keyframesInfo || 'Classic fighting game attack'}.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error with tween assistant:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze motion' });
  }
});

// API: AI In-Between Frame Interpolator (Supports single or multi-frame interpolation + quality controls)
app.post('/api/ai/tween-frame', async (req, res) => {
  try {
    const {
      frameABase64,
      frameBBase64,
      moveName = 'Ataque de Combate',
      width = 48,
      height = 48,
      palette = [],
      frameCount = 1,
      detailLevel = 'high',
      smoothness = 75,
      styleMode = 'keep',
      styleProfile = 'kof',
      customStyleDescription = '',
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY no configurado en el servidor.',
        fallback: true,
      });
    }

    const safeCount = Math.max(1, Math.min(8, Math.round(Number(frameCount) || 1)));
    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile,
      0.5,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, customStyleDescription, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const parts: any[] = [];
    if (frameABase64 && typeof frameABase64 === 'string') {
      const match = frameABase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (frameBBase64 && typeof frameBBase64 === 'string') {
      const match = frameBBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    const systemInstruction = `You are a legendary fighting game animation director and pixel artist (Street Fighter III: 3rd Strike, Garou, Darkstalkers, Guilty Gear).
You are given Frame A (start pose) and Frame B (end pose).
${contextualDirective}
Quality Controls -> Frames to generate: ${safeCount}, Detail Level: ${detailLevel}, Smoothness: ${smoothness}%.
Task: Generate exactly ${safeCount} progressive intermediate IN-BETWEEN frame(s) smoothly connecting Frame A into Frame B with intact silhouettes, zero detached body parts, and crisp solid hex pixels.
Rules:
- Size is ${width}x${height} (0 to ${width - 1} for x, 0 to ${height - 1} for y).
- Maintain consistent color palette: ${palette.slice(0, 16).join(', ')}.
- Output ONLY valid JSON:
{
  "frameName": string,
  "phase": "startup" | "active" | "recovery",
  "durationTicks": number,
  "pixels": [{"x": number, "y": number, "color": string}],
  "frames": [[{"x": number, "y": number, "color": string}]],
  "hitboxes": [{"type": "hurtbox" | "hitbox" | "pushbox", "x": number, "y": number, "width": number, "height": number, "name": string}],
  "directorNotes": string
}`;

    parts.push({
      text: `Move: "${moveName}". Generate ${safeCount} smooth in-between frame(s) connecting Frame A and Frame B at ${width}x${height} with detail=${detailLevel}, smoothness=${smoothness}%, style=${styleProfile}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating in-between frame:', error);
    return res.status(500).json({ error: error.message || 'Error al generar in-between con IA' });
  }
});

// API: Dedicated Character AI Studio Endpoint (Create, Variation, Recolor, Outfit, Anatomy, Reference Adapt)
app.post('/api/ai/character-generate', async (req, res) => {
  try {
    const {
      taskMode = 'variation',
      prompt = '',
      currentFrameBase64,
      referenceImagesBase64 = [],
      width = 48,
      height = 48,
      palette = [],
      styleMode = 'keep',
      styleProfile = 'kof',
      blendRatio = 0.5,
      customStyleDescription = '',
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      referenceFidelity = 'high',
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
      preserveFlags = {
        silhouette: true,
        proportions: true,
        posture: true,
        design: true,
        hair: true,
        outfit: true,
        accessories: true,
      },
    } = req.body;

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server.', fallback: true });
    }

    const parts: any[] = [];
    if (typeof currentFrameBase64 === 'string') {
      const m = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    appendReferenceGuideImages(parts, referenceImagesBase64);

    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile,
      blendRatio,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, referenceFidelity, customStyleDescription, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const preserveList = Object.entries(preserveFlags)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
      .join(', ');

    const modeDirectives: Record<string, string> = {
      create: 'CHARACTER CREATION: Design a complete original fighting-game pixel-art character matching the target style and proportions.',
      variation: 'CHARACTER REDESIGN / VARIATION: Generate an expressive costume/stance redesign while respecting preserved character identity traits.',
      recolor: 'CHARACTER RECOLOR / 2P PALETTE: Keep linework & shading intact while remapping hue ramps harmonically to target palette.',
      outfit: 'OUTFIT CHANGE: Change clothing/armor cleanly while keeping face, hair, anatomy, and pose completely intact.',
      anatomy: 'ADAPT POSE / ANATOMY: Adjust muscularity, height/build, or fighting pose cohesively as one intact character.',
      reference_adapt: 'REFERENCE ADAPTATION: Faithfully adapt the attached reference character into crisp pixel art honoring silhouette, hair, outfit, accessories, and posture.',
      clean_sprite: 'CLEAN & POLISH SPRITE: Preserve exact character design and pose, remove stray 1px orphan noise, fill accidental holes, unify outline thickness, and clamp cleanly to target palette.',
    };

    const systemInstruction = `You are a lead pixel-art character designer for 2D fighting games (Street Fighter, KOF, Garou, Skullgirls, Guilty Gear).
${modeDirectives[String(taskMode)] || modeDirectives.variation}
${contextualDirective}
PRESERVE STRICTLY: ${preserveList || 'silhouette, proportions, design'}.
REFERENCE FIDELITY: ${referenceFidelity.toUpperCase()} — Respect silhouette, hair, outfit, accessories, proportions, and posture without chopping limbs or adding stray 1px noise.
Output ONLY valid JSON:
{
  "name": string,
  "description": string,
  "pixels": [{"x": number, "y": number, "color": string}],
  "hitboxes": [{"type": "hurtbox" | "pushbox", "x": number, "y": number, "width": number, "height": number, "name": string}]
}
Rules: Grid ${width}x${height} (0..${width - 1}, 0..${height - 1}), crisp solid #rrggbb hex colors, transparent background.`;

    parts.push({
      text: `Character Task (${taskMode}): "${prompt || 'Guerrero pixel art'}". Fidelity: ${referenceFidelity}, Style: ${styleProfile}, Preserve: ${preserveList}, Size: ${width}x${height}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: { systemInstruction, responseMimeType: 'application/json' },
    });
    return res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in character-generate:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate character with AI' });
  }
});

// API: Dedicated Animation AI Studio Endpoint (Generate, Fix, Cycle, Transition)
app.post('/api/ai/animation-generate', async (req, res) => {
  try {
    const {
      taskMode = 'generate',
      prompt = '',
      currentFrameBase64,
      referenceImagesBase64 = [],
      width = 48,
      height = 48,
      frameCount = 4,
      detailLevel = 'high',
      smoothness = 80,
      palette = [],
      styleMode = 'keep',
      styleProfile = 'kof',
      customStyleDescription = '',
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      cyclePreset = '',
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
    } = req.body;

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server.', fallback: true });
    }

    const safeCount = Math.max(2, Math.min(12, Math.round(Number(frameCount) || 4)));
    const parts: any[] = [];
    if (typeof currentFrameBase64 === 'string') {
      const m = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    appendReferenceGuideImages(parts, referenceImagesBase64);

    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile,
      0.5,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, customStyleDescription, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const animModeDesc: Record<string, string> = {
      generate: 'GENERATE FULL ANIMATION: Create anticipation, active strike/action, follow-through, and recovery frames.',
      fix: 'FIX & POLISH ANIMATION: Stabilize silhouette volume, fix jittery pixels, smooth arcs, and preserve character consistency.',
      cycle: `SEAMLESS LOOP CYCLE${cyclePreset ? ` (${cyclePreset})` : ''}: Ensure final frame flows smoothly back into frame 1 (Walk Cycle, Run Cycle, Jump, Attack, or Idle).`,
      transition: 'ACTION TRANSITION: Bridge current stance smoothly into target stance with clean weight transfer.',
    };

    const systemInstruction = `You are a veteran 2D fighting game animation director (CPS-2, KOF XIII, Garou, Skullgirls).
${animModeDesc[String(taskMode)] || animModeDesc.generate}
${contextualDirective}
Quality Controls -> Frames: ${safeCount}, Detail Level: ${detailLevel}, Smoothness: ${smoothness}%.
Output ONLY valid JSON:
{
  "name": string,
  "description": string,
  "frames": [[{"x": number, "y": number, "color": string}]],
  "phaseNames": string[],
  "directorNotes": string
}
Rules: Return exactly ${safeCount} frames in "frames", each ${width}x${height} (0..${width - 1}, 0..${height - 1}), crisp solid #rrggbb pixels, coherent silhouettes.`;

    parts.push({
      text: `Animation Task (${taskMode}): "${prompt || 'Secuencia de combate fluida'}". Frames: ${safeCount}, Detail: ${detailLevel}, Smoothness: ${smoothness}%, Style: ${styleProfile}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: { systemInstruction, responseMimeType: 'application/json' },
    });
    return res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in animation-generate:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate animation with AI' });
  }
});

// API: AI Frame Modifier with Reference Image & Multimodal Prompt
app.post('/api/ai/frame-remix', async (req, res) => {
  try {
    const {
      prompt,
      currentFrameBase64,
      referenceImageBase64,
      referenceImagesBase64 = [],
      width = 48,
      height = 48,
      palette = [],
      styleMode = 'keep',
      styleProfile = 'kof',
      blendRatio = 0.5,
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      poseFidelity = 'high',
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY no configurado en el servidor.',
        fallback: true
      });
    }

    const parts: any[] = [];

    if (currentFrameBase64 && typeof currentFrameBase64 === 'string') {
      const match = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }

    if (referenceImageBase64 && typeof referenceImageBase64 === 'string') {
      const match = referenceImageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }

    appendReferenceGuideImages(parts, referenceImagesBase64);

    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile,
      blendRatio,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, poseFidelity }
    );

    const systemInstruction = `You are an elite retro fighting game sprite artist and animator.
Analyze the provided sprite frame, active AI guide references, and prompt instructions holistically before generating.
${contextualDirective}
Output ONLY a valid JSON object matching this schema:
{
  "title": string,
  "description": string,
  "recommendedPhase": "startup" | "active" | "recovery" | "neutral",
  "pixels": [
    {"x": number, "y": number, "color": string}
  ],
  "hitboxes": [
    {
      "type": "hurtbox" | "hitbox" | "pushbox",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "name": string
    }
  ],
  "artistNotes": string
}
Rules:
- Canvas dimensions: ${width}x${height} (0 to ${width - 1} for x, 0 to ${height - 1} for y).
- Interpret the ENTIRE character holistically: NEVER split limbs into disconnected pieces, NEVER drop parts of the sprite silhouette, NEVER leave random 1px noise or holes.
- Return crisp solid #rrggbb hex colors strictly forming a clean, coherent pixel-art result.`;

    parts.push({
      text: `Instructions: "${prompt}". Grid size is ${width}x${height}. Modify or restyle the fighting game character according to the reference guides, coherence (${coherenceLevel}), pose fidelity (${poseFidelity}), and prompt.`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Respuesta vacía del modelo de IA');
    }

    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error en frame-remix:', error);
    return res.status(500).json({ error: error.message || 'Error al modificar fotograma con IA' });
  }
});

// API: AI Fighting Game Palette / 2P Recolor Generator
app.post('/api/ai/palette-swap', async (req, res) => {
  try {
    const { currentColors, themePrompt } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true
      });
    }

    const systemInstruction = `You are a retro fighting game color stylist (creating iconic Player 1, Player 2, and EX alternate color palettes like Street Fighter, Tekken, Guilty Gear).
Preserve luminance relationships (highlight, midtone, deep shadow) while remapping hues to a distinct character theme.
Output ONLY valid JSON:
{
  "themeName": string,
  "description": string,
  "colorMapping": [
    {"original": string, "replacement": string, "role": string}
  ],
  "newPalette": string[]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Theme: "${themePrompt}". Remap this fighter palette: ${JSON.stringify(currentColors)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating palette swap:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate palette' });
  }
});

// API: AI Fighting Game Stage & Background Generator
app.post('/api/ai/stage-generate', async (req, res) => {
  try {
    const {
      prompt,
      width = 48,
      height = 48,
      stylePreset = 'kof',
      styleMode = 'keep',
      styleProfile = 'kof',
      blendRatio = 0.5,
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      mood = 'night',
      layerMode = 'full',
      biome = '',
      stageCategory = 'escenarios',
      customStyleDescription = '',
      palette = [],
      referenceImagesBase64 = [],
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile || stylePreset,
      blendRatio,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, customStyleDescription, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const systemInstruction = `You are a master retro fighting game background, environment & tileset pixel artist.
Generate a cohesive pixel-art environment asset (Category: ${stageCategory}) for a ${width}x${height} canvas that strictly adapts to the target visual style (${styleProfile || stylePreset}) and project training context.
NEVER draw fighter characters or UI bars here — produce ONLY world scenery/environment pixels.
${contextualDirective}
${biome ? `Stage Category / Biome: ${biome}.` : ''}
Atmosphere/Mood: ${mood}. Layer Mode: ${layerMode}. Category Focus: ${stageCategory} (fondos/skyline | escenarios/arena | decoracion/props | parallax band | seamless tileset | terreno/ground slabs | world element).
If reference images are provided, analyze their palette, lighting direction, outline thickness, and visual era before generating.
Output ONLY a valid JSON object:
{
  "name": string,
  "description": string,
  "palette": string[],
  "pixels": [
    {"x": number, "y": number, "color": string}
  ]
}
Rules:
- Coordinates MUST be within 0..${width - 1} for x and 0..${height - 1} for y.
- Adapt architectural details, sky shading/dithering, and ground floor cleanly to the active style profile (${styleProfile || stylePreset}).
- Zero random stray 1px noise. Return crisp solid #rrggbb hex pixels forming recognizable pixel-art scenery.`;

    const parts: any[] = [];
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `Generate pixel art fighting stage: "${prompt}".${biome ? ` Biome: ${biome}.` : ''} Style: ${styleProfile || stylePreset}, Mode: ${styleMode}, Coherence: ${coherenceLevel}, Mood: ${mood}, Size: ${width}x${height}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI stage:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate AI stage' });
  }
});

// API: AI Fighting Game HUD Overlay Generator
app.post('/api/ai/hud-generate', async (req, res) => {
  try {
    const {
      prompt,
      width = 48,
      height = 48,
      theme = 'cps2',
      hudTheme,
      styleMode = 'keep',
      styleProfile = 'cps2',
      blendRatio = 0.5,
      contextAnalysis,
      trainedProfile,
      coherenceLevel = 'high',
      includeElements = ['healthbars', 'timer', 'super'],
      elementCategory = '',
      hudCategory = 'barras_vida',
      customStyleDescription = '',
      palette = [],
      referenceImagesBase64 = [],
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const activeTheme = hudTheme || theme || 'cps2';
    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile || activeTheme,
      blendRatio,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, customStyleDescription, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const systemInstruction = `You are an expert arcade fighting game UI/HUD pixel designer.
Generate a retro pixel-art HUD / UI asset (Category: ${elementCategory || hudCategory}) on a transparent ${width}x${height} grid tailored authentically to the target visual style (${styleProfile || activeTheme}).
NEVER generate characters or stage backgrounds — ONLY crisp UI/HUD pixel components.
${contextualDirective}
UI Element Category: ${elementCategory || hudCategory} (barras_vida | retratos | temporizadores | interfaces | menus | marcadores).
Include elements: ${Array.isArray(includeElements) ? includeElements.join(', ') : 'healthbars, timer, super'}.
HUD Theme: ${activeTheme}.
Output ONLY a valid JSON object:
{
  "name": string,
  "description": string,
  "elements": string[],
  "pixels": [
    {"x": number, "y": number, "color": string}
  ]
}
Rules:
- Coordinates strictly 0..${width - 1} for x and 0..${height - 1} for y.
- Match frame bevels, typography blocks, color contrast, and bar styling strictly to the target style.
- Keep non-UI combat center transparent so fighters remain visible; return crisp #rrggbb hex pixels with zero stray orphan specks.`;

    const parts: any[] = [];
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `Design fighting game HUD overlay: "${prompt}".${elementCategory ? ` Category: ${elementCategory}.` : ''} Theme: ${activeTheme}, Style: ${styleProfile || activeTheme}, Coherence: ${coherenceLevel}, Size: ${width}x${height}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI HUD:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate AI HUD' });
  }
});

// API: AI Reusable Fighting Game Element / Stamp Generator for Library
app.post('/api/ai/element-generate', async (req, res) => {
  try {
    const {
      prompt,
      category = 'vfx',
      size = 24,
      palette = [],
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const systemInstruction = `You are a pixel art asset designer for retro fighting games.
Create a crisp reusable pixel-art stamp/prop of size ${size}x${size} in category "${category}" (character accessory/weapon, vfx spark, stage prop, or hud badge).
Output ONLY valid JSON:
{
  "name": string,
  "description": string,
  "category": "character" | "vfx" | "stage" | "hud",
  "pixels": [
    {"x": number, "y": number, "color": string}
  ]
}
Rules:
- Coordinates strictly 0..${size - 1} for x and y.
- Transparent background; return 25 to 220 crisp pixels forming a clear silhouette.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Create ${size}x${size} pixel art ${category} element: "${prompt}". Palette: ${palette.slice(0, 12).join(', ')}.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating AI library element:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate AI element' });
  }
});

// API: AI 2D Pose Dummie Retargeting (keeps character outfit, hair, proportions, palette intact)
app.post('/api/ai/pose-retarget', async (req, res) => {
  try {
    const {
      currentFrameBase64,
      poseName = 'Pose personalizada',
      rigType = 'male',
      jointSummary = '',
      width = 48,
      height = 48,
      palette = [],
      intensity = 75,
      poseFidelity = 'high',
      coherenceLevel = 'high',
      contextAnalysis,
      trainedProfile,
      styleMode = 'keep',
      styleProfile = 'kof',
      referenceMode = 'strict',
      preserveConstraints,
      phase1Analysis,
      referenceProject,
      referenceImagesBase64 = [],
      prompt = '',
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const contextualDirective = buildContextualDirective(
      styleMode,
      styleProfile || contextAnalysis?.detectedProfileId || 'kof',
      0.5,
      contextAnalysis,
      palette,
      { trainedProfile, coherenceLevel, poseFidelity, referenceMode, preserveConstraints, phase1Analysis, referenceProject }
    );

    const fidelityNote =
      referenceMode === 'free'
        ? 'FREE INSPIRATION: Adapt creatively toward the pose energy while keeping coherent fighter identity.'
        : poseFidelity === 'exact'
        ? 'EXACT FIDELITY: Match the target joint coordinates, body lean, perspective, limb angles, and silhouette geometry strictly.'
        : poseFidelity === 'high'
        ? 'HIGH FIDELITY: Align all limbs, torso tilt, head gaze, and stance accurately to the target skeleton.'
        : 'BALANCED FIDELITY: Adapt naturally toward the target pose while prioritizing silhouette balance.';

    const systemInstruction = `You are an expert 2D fighting game pixel artist specializing in holistic character pose retargeting.
Look at the attached character sprite image and adapt the ENTIRE character cohesively into the requested target pose ("${poseName}", Rig: ${rigType}, Adaptation Intensity: ${intensity}%).
${contextualDirective}
${fidelityNote}
${prompt ? `Additional Pose Guidance: ${prompt}` : ''}
Target Joint Coordinates (normalized 0..1): ${jointSummary}
CRITICAL ANTI-FRAGMENTATION & PIXEL INTEGRITY RULES:
- Reinterpret the character as ONE continuous, intact body: NEVER split, chop, or leave floating disconnected limbs, head, or torso pieces.
- Preserve the EXACT character identity: hair, face, clothing, weapon/accessories, proportions, outline width (${contextAnalysis?.lineThickness ?? 1}px), light direction (${contextAnalysis?.lightDirection || 'top-left'}), and Pixel Art shading style.
- Use colors strictly from the character's existing colors and Project Palette: ${palette.slice(0, 16).join(', ')}.
- Zero 1px stray orphan dots, zero interior pixel holes, zero semi-transparent anti-alias smudge.
- Output ONLY valid JSON:
{
  "name": string,
  "description": string,
  "pixels": [
    {"x": number, "y": number, "color": string}
  ]
}
- Coordinates strictly 0..${width - 1} for x and 0..${height - 1} for y. Transparent background.`;

    const parts: any[] = [];
    if (typeof currentFrameBase64 === 'string') {
      const match = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `Holistically retarget the ENTIRE pixel character to pose "${poseName}" (${rigType}) with ${poseFidelity} pose fidelity (${referenceMode} mode) at ${intensity}% adaptation on a ${width}x${height} grid without splitting any body parts.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in AI pose retarget:', error);
    return res.status(500).json({ error: error.message || 'Failed to retarget pose with AI' });
  }
});

// API: AI Self-Evaluation (Evaluates Sprites, HUD, FX, Animations, and Visual Coherence)
app.post('/api/ai/self-evaluate', async (req, res) => {
  try {
    const {
      currentFrameBase64,
      projectContext,
      telemetryStats,
      referenceProject,
      trainedProfile,
      framesCount = 1,
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const parts: any[] = [];
    if (typeof currentFrameBase64 === 'string') {
      const m = currentFrameBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }

    const systemInstruction = `You are a Principal Art Director & AI Pipeline Auditor for a 2D Fighting Game Pixel Art studio.
Perform an honest Self-Evaluation ("Autoevaluación IA") of the project's generated assets and AI workflow across 5 axes:
1. "sprites" ("Sprites")
2. "hud" ("HUD")
3. "fx" ("FX")
4. "animaciones" ("Animaciones")
5. "coherencia" ("Coherencia visual")

Output ONLY valid JSON matching this schema:
{
  "overallScore": number,
  "summary": string,
  "axes": [
    {
      "key": "sprites" | "hud" | "fx" | "animaciones" | "coherencia",
      "label": "Sprites" | "HUD" | "FX" | "Animaciones" | "Coherencia visual",
      "score": number,
      "status": "Optimo" | "Mejorable" | "Requiere atencion",
      "observation": string
    }
  ],
  "improvements": string[]
}
Rules:
- All text MUST be in natural, concise Spanish explaining WHAT can be improved and WHY.
- Scores 0..100 based realistically on the attached sprite frame, frame count (${framesCount}), project context, telemetry stats, trained profile, and active reference project.`;

    parts.push({
      text: `Audit Project Context: ${JSON.stringify(projectContext || {})}. Telemetry: ${JSON.stringify(telemetryStats || {})}. Reference Project: ${JSON.stringify(referenceProject || null)}. Trained Profile: ${JSON.stringify(trainedProfile || null)}. Frames Count: ${framesCount}.`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in AI self-evaluation:', error);
    return res.status(500).json({ error: error.message || 'Failed to self-evaluate AI quality' });
  }
});

// Serve frontend: Vite middleware in dev, static files in production
async function setupVite() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PixelClash Studio server running at http://0.0.0.0:${port}`);
  });
}

setupVite();
