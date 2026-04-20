# Random Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one portrait PNG poster in the workspace showing a cold night mountain-and-lake scene.

**Architecture:** Build the artwork locally as an SVG with layered gradients and landscape shapes, then export it to PNG if a rasterizer is available. Keep the implementation self-contained in a single HTML/SVG artifact plus a final output file to minimize moving parts.

**Tech Stack:** SVG, HTML, optional local rasterization command

---

## File Structure

- Create: `artifacts/random-poster/polar-night-mountain-lake.svg` - source artwork with gradients, sky, moon, mountains, mist, and reflection
- Create: `artifacts/random-poster/polar-night-mountain-lake.html` - lightweight preview wrapper for local viewing in a browser
- Create: `artifacts/random-poster/polar-night-mountain-lake.png` - final deliverable if local rasterization succeeds

### Task 1: Create the source artwork

**Files:**
- Create: `artifacts/random-poster/polar-night-mountain-lake.svg`
- Test: open the SVG in a browser and confirm the scene is portrait, cold-toned, and fully contained in frame

- [ ] **Step 1: Write the source SVG**

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800">
  <!-- sky gradient, moon glow, layered mountains, lake reflection, mist, and stars -->
</svg>
```

- [ ] **Step 2: Verify the file exists and is readable**

Run: `dir "artifacts\random-poster\polar-night-mountain-lake.svg"`
Expected: the SVG file is listed once

- [ ] **Step 3: Open the SVG locally to inspect composition**

Run: `start "" "artifacts\random-poster\polar-night-mountain-lake.svg"`
Expected: the default browser or image viewer opens a portrait night poster

### Task 2: Add a browser preview wrapper

**Files:**
- Create: `artifacts/random-poster/polar-night-mountain-lake.html`
- Modify: `artifacts/random-poster/polar-night-mountain-lake.svg` only if sizing tweaks are needed after preview

- [ ] **Step 1: Write the preview HTML**

```html
<!doctype html>
<html lang="en">
  <meta charset="utf-8" />
  <title>Polar Night Mountain Lake</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #050814; }
    img { width: min(420px, 92vw); height: auto; box-shadow: 0 24px 80px rgba(0,0,0,.45); }
  </style>
  <img src="./polar-night-mountain-lake.svg" alt="Polar night mountain lake poster" />
</html>
```

- [ ] **Step 2: Verify the preview file exists**

Run: `dir "artifacts\random-poster\polar-night-mountain-lake.html"`
Expected: the HTML file is listed once

- [ ] **Step 3: Open the HTML preview**

Run: `start "" "artifacts\random-poster\polar-night-mountain-lake.html"`
Expected: the browser shows the poster centered on a dark background

### Task 3: Export PNG deliverable

**Files:**
- Create: `artifacts/random-poster/polar-night-mountain-lake.png`

- [ ] **Step 1: Check for a local rasterization tool**

Run: `magick -version`
Expected: ImageMagick version output, or a command-not-found style failure

- [ ] **Step 2: Export the PNG if ImageMagick is available**

Run: `magick "artifacts\random-poster\polar-night-mountain-lake.svg" "artifacts\random-poster\polar-night-mountain-lake.png"`
Expected: command exits successfully and writes the PNG

- [ ] **Step 3: Verify the PNG output**

Run: `dir "artifacts\random-poster\polar-night-mountain-lake.png"`
Expected: the PNG file is listed once

- [ ] **Step 4: If rasterization is unavailable, report fallback**

Fallback: deliver the SVG and HTML preview, and report that PNG export requires a local rasterizer such as ImageMagick.
