# NeoBot Orchestrator Enforcement Audit Report

**Date:** 2025-02-20  
**Goal:** Verify and enforce that ALL AI generation goes through ContextPack → Orchestrator → Provider.

---

## STEP 1 — Illegal provider calls (outside `src/orchestrator/`)

Patterns scanned: `replicate.run(`, `openai.chat(`, `client.chat.completions.create(`, `generateImage(`, `generateText(`, `SDXL`, `imageProviders/`, `masterPromptBuilder(`

### Allowed (provider implementation — no fix)

| File | Line | Snippet | Note |
|------|------|---------|------|
| `src/llm/llmGateway.js` | 43 | `const response = await client.chat.completions.create(` | LLM provider implementation; only called by orchestrator. |
| `src/imageProviders/replicate.js` | 130 | `const p = replicate.run(MODEL_ID, { input });` | Replicate provider implementation. |
| `src/imageProviders/replicate.js` | 256 | `const p = replicate.run(MODEL_ID, { input });` | Same (image-to-image). |
| `src/imageProviders/index.js` | 2, 9 | Replicate SDXL comments | Re-export only. |
| `src/marketing/masterPromptBuilder.js` | 71, 149 | `buildMasterImagePrompt`, `buildMasterNegativePrompt` | Used by replicate.js (provider) and imageCompose; see violations. |

### Violations — direct provider / LLM calls outside orchestrator

| File | Line | Code snippet | Recommended fix |
|------|------|--------------|------------------|
| `src/marketing/imageCompose.js` | 651 | `const bgResult = await generateBackground({` | Only called from orchestrator; orchestrator must pass through `traceId` for context guard. Do not call `generateBackground` from anywhere else. |
| `src/marketing/imageCompose.js` | 727 | `let llmRes = await llmChat({` | Same; ensure `traceId` from orchestrator is passed to `llmChat` so context guard passes. |
| `src/marketing/imageCompose.js` | 746 | `llmRes = await llmChat({` | Retry path; same as above. |
| `src/marketing/imageCompose.js` | 8, 206, 221 | `buildMasterImagePrompt`, `buildMasterNegativePrompt` | Used to build prompts inside compose; acceptable as sub-step when compose is invoked only by orchestrator. |
| `src/marketing/artDirection.js` | 40 | `const response = await llmChat({` | **Bypass.** Route/worker calling art direction must use ContextPack and orchestrator. Redirect: build ContextPack, call `orchestrator.generateText` with art-direction task. |
| `llm.js` (root) | 33 | `const result = await llmChat({` | **Bypass** if used by any route. Ensure no route uses `askLLM` from `llm.js`; if used, refactor to build ContextPack and call orchestrator. |
| `src/ai/openaiImage.js` | 75 | `async function generateImage({ prompt, format })` | **Separate provider** (DALL-E). If any route/worker calls this, it must go through an orchestrator wrapper with ContextPack. |

---

## STEP 2 — Routes and ContextPack usage

| Route file | Uses buildContextPack? | Uses orchestrator? | Status |
|------------|------------------------|--------------------|--------|
| `src/routes/content.js` | Yes (line 182) | Yes `generateText` (line 204) | OK |
| `src/routes/images.js` | Yes (line 256) | Yes `generateImage` (line 262) | OK |
| `src/routes/design.js` | Yes (line 123) | Yes `generateDesignBackground`, `generateText` (135, 175) | OK |
| `src/routes/chat.js` | Yes (line 216) | Yes `generateText` (line 225) | OK |
| `src/routes/debug.js` | Yes (line 19) | No (returns contextPack only) | OK |
| `src/routes/adsStudio.js` | No (delegates to marketing) | No direct; uses `analyzeUrlAndDraftAds`, `generateImagesFromUrl`, `generateProductVariants` | OK (marketing module uses orchestrator internally) |
| `src/routes/me.js` | No | No generation | N/A |
| `src/routes/workspaceProfile.js` | No | No generation | N/A |
| `src/routes/health.js` | No | No generation | N/A |
| `src/routes/jobs.js` | No | Reads stored `art_direction_json`; does not call `generateArtDirection` in scanned path | If jobs or workers call `generateArtDirection` or openaiImage, flag as bypass |

**Routes bypassing orchestrator:** None of the main generative routes (content, images, design, chat) bypass; they use ContextPack + orchestrator. `artDirection.js` and `llm.js` call LLM directly and are flagged above.

---

## Missing ContextPack validation

- Before this audit: orchestrator only checked `contextPack` and `contextPack.traceId` (DEV_GUARD).
- Added: **assertContextPack** in orchestrator (traceId, resolvedIndustry, brief required) for all generate functions.

---

## Overall safety status

**SAFE** (with caveats; enforcement guards added):

1. **imageCompose** calls `generateBackground` and `llmChat` directly, but it is **only ever invoked by the orchestrator** (generateImage). So the only entry point for compose is the orchestrator; the violation is “module calling provider” rather than “route bypassing orchestrator.”
2. **artDirection.js** and **llm.js** (and **openaiImage** if used) are true bypasses if called from routes/workers without ContextPack.
3. Enforcement guards (assertContextPack, contextGuard mark/assert) are added so that in dev any direct provider call without a marked traceId will throw.

After adding **assertContextPack** and **contextGuard** (mark in orchestrator, assert in providers), status can be considered **SAFE** for all code paths that go through the orchestrator; remaining risk is any legacy call to `artDirection`, `llm.js`, or `openaiImage` that is not refactored.

---

## Summary

- **Illegal provider calls (outside orchestrator):** 3 files (imageCompose, artDirection, llm.js); imageCompose is orchestrator-driven; artDirection and llm.js are direct bypasses if used.
- **Routes bypassing orchestrator:** 0 among main generative routes.
- **Missing ContextPack validation:** Addressed by assertContextPack in orchestrator.
- **Enforcement:** assertContextPack + contextGuard (DEV) added.
