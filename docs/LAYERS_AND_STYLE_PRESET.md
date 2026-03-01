# Layers contract & stylePreset (compose / render)

## Layers schema (compose & render)

### Button layer (CTA)

**Preferred keys (use these in new code and FE payloads):**

| Key | Type | Description |
|-----|------|-------------|
| `type` | `"button"` | Layer type |
| `id` | string | e.g. `"cta"` |
| `text` | string | Button label (max 32 chars) |
| `x`, `y` | number | Position in canvas pixels |
| `width`, `height` | number | Button size in pixels (used as bounding box; renderer does not derive from text) |
| `fontSize` | number | Text size (10–96) |
| `backgroundColor` | string | Hex color, e.g. `#2563eb` |
| `textColor` | string | Hex color, e.g. `#ffffff` |
| `borderRadius` | number | 0–999 (999 = pill) |

**Legacy aliases (accepted by backend normalizer and renderer as fallback):**

- `width` ← `layer.width ?? layer.w`
- `height` ← `layer.height ?? layer.h`
- `backgroundColor` ← `layer.backgroundColor ?? layer.bg`
- `textColor` ← `layer.textColor ?? layer.color`
- `borderRadius` ← `layer.borderRadius ?? layer.radius`

Backend: `src/routes/images.js` (`validateAndNormalizeLayers`), `src/render/canvasRenderer.js` (`drawButtonLayer`).

---

## stylePreset (Step 1 / compose request)

**Request body:** optional `stylePreset` (string).

**Values:** `"auto"` (default) | `"photographic"` | `"realistic"` | `"cinematic"` | `"animation"` | `"design"`.

- **ContextPack:** `buildContextPack` sets `contextPack.style.preset = body.stylePreset || "auto"`.
- **Master prompt:** `masterPromptBuilder.getStylePresetBlock(preset)` injects a style block into the positive prompt:
  - **photographic:** photorealistic, natural lighting, DSLR, shallow depth of field
  - **realistic:** highly realistic, true-to-life textures, accurate proportions
  - **cinematic:** cinematic lighting, film look, dramatic contrast, anamorphic
  - **animation:** stylized animation, clean outlines, vibrant, illustration
  - **design:** graphic design, minimalist, clean shapes, modern poster style
  - **auto:** no extra block

**Debug:** With `?debug=1`, `_debug.contextUsed.style.preset` contains the used preset.

Relevant files: `src/context/contextEngine.js` (style.preset), `src/marketing/masterPromptBuilder.js` (STYLE_PRESET_PROMPTS, getStylePresetBlock), `src/marketing/imageCompose.js` (getBackgroundPromptParams), `src/imageProviders/replicate.js` (generateBackground).
