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
  kof: 'The King of Fighters arcade pixel art aesthetic: crisp 1px dark outlines, dramatic directional rim light, dynamic Neo-Geo fighting silhouettes.',
  sf_alpha: 'Street Fighter Alpha 3 CPS-2 anime pixel art style: bold muscular shapes, clean cel-shaded color ramps, bright tournament-readable highlights.',
  darkstalkers: 'Darkstalkers Vampire Savior style: exaggerated gothic arcade animation, saturated violet/magenta shadows and eerie emerald highlights.',
  guilty_gear: 'Guilty Gear anime fighting game aesthetic: sharp angular cel-shading, heavy contrast shadows, neon magenta and electric cyan energy arcs.',
  blazblue: 'BlazBlue 2D anime fighter sprite aesthetic: crystalline azure and royal blue lighting, ornate gold trim, razor-sharp arcane energy bursts.',
  snk_neogeo: 'Classic 1990s SNK Neo Geo MVS 16-bit pixel art: subtle checkerboard dithering, gritty warm earth and metallic tones, authentic arcade contrast.',
  cps2: 'Capcom CPS-2 16-color indexed sprite palette: punchy primary hues, high readability against detailed arcade backgrounds.',
  pixel_fantasy: 'Handcrafted Pixel Fantasy action/fighter sprite style: crisp steel highlights, emerald and arcane gold magic runes, rich wood/leather tones.',
  pixel_cyberpunk: 'Cyberpunk pixel art aesthetic: deep midnight shadows with intense cyan, hot pink, and lime neon rim-lighting and holographic accents.',
};

function buildContextualDirective(
  styleMode: string = 'keep',
  styleProfile: string = 'kof',
  blendRatio: number = 0.5,
  contextAnalysis?: any,
  palette: string[] = []
): string {
  const profileDesc = STYLE_PROFILE_DIRECTIVES[styleProfile] || STYLE_PROFILE_DIRECTIVES.kof;
  const ctxSummary = contextAnalysis
    ? `Active Project Context -> Visual Style: ${contextAnalysis.visualStyle}, Resolution: ${contextAnalysis.resolution}, Colors Used: ${contextAnalysis.uniqueColors}, Animation Type: ${contextAnalysis.animationType}, Genre: ${contextAnalysis.gameGenre}, Palette: ${(contextAnalysis.activePalette || palette).slice(0, 12).join(', ')}.`
    : `Project Palette: ${palette.slice(0, 12).join(', ')}.`;

  if (styleMode === 'adapt') {
    return `${ctxSummary} MODE: ADAPT COMPLETELY TO EXTERNAL PROFILE (${styleProfile}). ${profileDesc}`;
  }
  if (styleMode === 'blend') {
    const pct = Math.round(Math.max(0, Math.min(1, blendRatio)) * 100);
    return `${ctxSummary} MODE: BLEND STYLES (${100 - pct}% Current Project Style + ${pct}% External Profile "${styleProfile}": ${profileDesc}). Fuse both palettes and shading rules seamlessly.`;
  }
  return `${ctxSummary} MODE: KEEP CURRENT PROJECT STYLE strictly. Match the active palette, contrast, and shading discipline of the existing sprite.`;
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
      palette
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

// API: AI In-Between Frame Interpolator (Generates intermediate motion frame between Frame A and Frame B)
app.post('/api/ai/tween-frame', async (req, res) => {
  try {
    const { 
      frameABase64, 
      frameBBase64, 
      moveName = 'Ataque de Combate',
      width = 48, 
      height = 48, 
      palette = [] 
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY no configurado en el servidor.',
        fallback: true
      });
    }

    const parts: any[] = [];

    // Add Frame A
    if (frameABase64 && typeof frameABase64 === 'string') {
      const match = frameABase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] }
        });
      }
    }

    // Add Frame B
    if (frameBBase64 && typeof frameBBase64 === 'string') {
      const match = frameBBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] }
        });
      }
    }

    const systemInstruction = `You are a legendary fighting game animation director and pixel artist (Capcom Street Fighter III: 3rd Strike, Darkstalkers, Guilty Gear).
You are given two keyframes of a fighting move:
- Frame A: Starting/anticipation pose
- Frame B: Impact/destination pose
Your task: Generate the intermediate IN-BETWEEN frame (Tween/Smear frame) that connects Frame A and Frame B smoothly.
Rules:
- Size is ${width}x${height} (0 to ${width - 1} for x, 0 to ${height - 1} for y).
- Maintain consistent color palette with Frame A and B: ${palette.slice(0, 16).join(', ')}.
- Include dynamic motion lines, limb stretching, or energy blur streaks where the attack is moving.
- Output ONLY valid JSON:
{
  "frameName": string,
  "phase": "startup" | "active" | "recovery",
  "durationTicks": number,
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
  "directorNotes": string
}`;

    parts.push({
      text: `Move: "${moveName}". Generate the perfect in-between transition frame connecting Frame A (anticipation) and Frame B (strike/destination) at ${width}x${height} pixels.`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: parts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating in-between frame:', error);
    return res.status(500).json({ error: error.message || 'Error al generar in-between con IA' });
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
      palette
    );

    const systemInstruction = `You are an elite retro fighting game sprite artist and animator.
Analyze the provided sprite frame, active AI guide references, and prompt instructions.
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
- Return between 60 and 300 pixels forming a clean, coherent modification.`;

    parts.push({
      text: `Instructions: "${prompt}". Grid size is ${width}x${height}. Modify or restyle the fighting game character according to the reference guides and prompt.`
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
      mood = 'night',
      layerMode = 'full',
      biome = '',
      palette = [],
      referenceImagesBase64 = [],
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
      palette
    );

    const systemInstruction = `You are a master retro fighting game background & stage pixel artist.
Generate a pixel-art fighting game stage composition for a ${width}x${height} canvas.
${contextualDirective}
${biome ? `Stage Category / Biome: ${biome}.` : ''}
Atmosphere/Mood: ${mood}. Layer Mode: ${layerMode}.
If reference images are provided, draw visual composition and color inspiration from them.
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
- Leave clean fighting readability: darker ground floor at bottom ~20% of canvas, atmospheric architecture/sky/neon/dojo props above.
- Return 180 to 900 crisp pixels forming recognizable retro fighting game stage scenery.`;

    const parts: any[] = [];
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `Generate pixel art fighting stage: "${prompt}".${biome ? ` Biome: ${biome}.` : ''} Style: ${styleProfile || stylePreset}, Mode: ${styleMode}, Mood: ${mood}, Size: ${width}x${height}.`,
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
      includeElements = ['healthbars', 'timer', 'super'],
      elementCategory = '',
      palette = [],
      referenceImagesBase64 = [],
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
      palette
    );

    const systemInstruction = `You are an expert arcade fighting game UI/HUD pixel designer.
Generate a retro pixel-art fighting game HUD layout overlay on a transparent ${width}x${height} grid.
${contextualDirective}
${elementCategory ? `UI Element Category: ${elementCategory}.` : ''}
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
- Keep the center combat area transparent so fighters remain visible; place life bars/portraits/timer near top rows and super/combo meters near bottom rows.
- Return 90 to 550 crisp pixel coordinates with sharp metallic/neon contrast.`;

    const parts: any[] = [];
    appendReferenceGuideImages(parts, referenceImagesBase64);
    parts.push({
      text: `Design fighting game HUD overlay: "${prompt}".${elementCategory ? ` Category: ${elementCategory}.` : ''} Theme: ${activeTheme}, Mode: ${styleMode}, Size: ${width}x${height}.`,
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
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server.',
        fallback: true,
      });
    }

    const systemInstruction = `You are an expert 2D fighting game pixel artist specializing in character pose retargeting.
Look at the attached character sprite image and adapt the character strictly into the requested target pose ("${poseName}", Rig: ${rigType}, Adaptation Intensity: ${intensity}%).
Target Joint Coordinates (normalized 0..1): ${jointSummary}
CRITICAL RULES:
- Preserve the EXACT character design: hair, colors, clothing, weapon/accessories, proportions, and Pixel Art shading style.
- Use colors strictly from the character's existing colors and Project Palette: ${palette.slice(0, 16).join(', ')}.
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
    parts.push({
      text: `Retarget the attached pixel character to pose "${poseName}" (${rigType}) at ${intensity}% adaptation on a ${width}x${height} grid.`,
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
