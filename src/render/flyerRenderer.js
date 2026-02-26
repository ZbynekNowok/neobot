const path = require("path");
const fs = require("fs");

/**
 * Render marketing flyer from HTML template to PNG
 * Uses puppeteer for high-quality rendering with proper typography
 */
class FlyerRenderer {
  constructor() {
    this.puppeteer = null;
    this.browser = null;
  }

  async init() {
    if (this.browser) return;
    
    try {
      // Lazy load puppeteer
      this.puppeteer = require("puppeteer");
      this.browser = await this.puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });
    } catch (err) {
      // Fallback: if puppeteer not available, use placeholder
      console.warn("Puppeteer not available, using placeholder mode");
    }
  }

  async render(artDirection, brand, offer, format, outputPath) {
    await this.init();

    if (!this.browser) {
      // Placeholder mode - create a simple HTML file instead
      return this.renderPlaceholder(artDirection, brand, offer, format, outputPath);
    }

    const page = await this.browser.newPage();
    
    const dimensions = format === "ig_story" 
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };

    await page.setViewport(dimensions);

    const html = this.generateHTML(artDirection, brand, offer, format);
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for fonts to load
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: false,
    });

    await page.close();
  }

  generateHTML(artDirection, brand, offer, format) {
    const { layoutVariant, palette, overlay } = artDirection;
    const dimensions = format === "ig_story" 
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };

    // Background placeholder (will be replaced with generated image)
    const backgroundUrl = artDirection.backgroundImageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1080' height='1350'%3E%3Crect fill='%23f3f4f6' width='1080' height='1350'/%3E%3C/svg%3E";

    // Overlay styles
    let overlayStyle = "";
    if (overlay && overlay.type === "gradient") {
      overlayStyle = `background: linear-gradient(to bottom, rgba(0,0,0,${overlay.strength || 0.4}), transparent);`;
    } else if (overlay && overlay.type === "blur_card") {
      overlayStyle = `background: rgba(0,0,0,${overlay.strength || 0.3}); backdrop-filter: blur(10px);`;
    } else if (overlay && overlay.type === "solid_band") {
      overlayStyle = `background: ${palette.primary}; opacity: ${overlay.strength || 0.8};`;
    }

    // Layout-specific HTML
    let contentHTML = "";
    
    if (layoutVariant === "left_stack") {
      contentHTML = `
        <div class="content-left">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    } else if (layoutVariant === "bottom_band") {
      contentHTML = `
        <div class="content-bottom">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    } else if (layoutVariant === "center_card") {
      contentHTML = `
        <div class="content-center">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    } else if (layoutVariant === "split") {
      contentHTML = `
        <div class="content-split-left">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
        </div>
        <div class="content-split-right">
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    } else if (layoutVariant === "top_banner") {
      contentHTML = `
        <div class="content-top">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
        </div>
        <div class="content-bottom-section">
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    } else { // corner_badge
      contentHTML = `
        <div class="content-corner">
          <h1 class="headline">${this.escapeHtml(offer.headline)}</h1>
          ${offer.subheadline ? `<p class="subheadline">${this.escapeHtml(offer.subheadline)}</p>` : ""}
          ${offer.bullets.length > 0 ? `<ul class="bullets">${offer.bullets.map(b => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>` : ""}
          <button class="cta">${this.escapeHtml(offer.cta)}</button>
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marketing Flyer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${dimensions.width}px;
      height: ${dimensions.height}px;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: ${palette.text || "#ffffff"};
    }
    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${backgroundUrl}');
      background-size: cover;
      background-position: center;
    }
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      ${overlayStyle}
    }
    .content-left {
      position: absolute;
      left: 60px;
      top: 50%;
      transform: translateY(-50%);
      max-width: 500px;
      z-index: 10;
    }
    .content-bottom {
      position: absolute;
      bottom: 80px;
      left: 60px;
      right: 60px;
      z-index: 10;
    }
    .content-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      max-width: 700px;
      z-index: 10;
    }
    .content-split-left {
      position: absolute;
      left: 60px;
      top: 50%;
      transform: translateY(-50%);
      max-width: 400px;
      z-index: 10;
    }
    .content-split-right {
      position: absolute;
      right: 60px;
      top: 50%;
      transform: translateY(-50%);
      max-width: 400px;
      text-align: right;
      z-index: 10;
    }
    .content-top {
      position: absolute;
      top: 100px;
      left: 60px;
      right: 60px;
      text-align: center;
      z-index: 10;
    }
    .content-bottom-section {
      position: absolute;
      bottom: 80px;
      left: 60px;
      right: 60px;
      z-index: 10;
    }
    .content-corner {
      position: absolute;
      top: 80px;
      right: 60px;
      max-width: 450px;
      z-index: 10;
    }
    h1.headline {
      font-size: ${this.calculateFontSize(offer.headline, layoutVariant)}px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 20px;
      color: ${palette.text || "#ffffff"};
      text-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    p.subheadline {
      font-size: 28px;
      font-weight: 400;
      line-height: 1.4;
      margin-bottom: 24px;
      color: ${palette.text || "#ffffff"};
      text-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    ul.bullets {
      list-style: none;
      margin-bottom: 32px;
    }
    ul.bullets li {
      font-size: 22px;
      font-weight: 400;
      line-height: 1.6;
      margin-bottom: 12px;
      padding-left: 32px;
      position: relative;
      color: ${palette.text || "#ffffff"};
      text-shadow: 0 1px 4px rgba(0,0,0,0.3);
    }
    ul.bullets li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${palette.accent || brand.accent};
      font-weight: 700;
    }
    button.cta {
      background: ${palette.primary || brand.primary};
      color: #ffffff;
      border: none;
      padding: 20px 48px;
      font-size: 24px;
      font-weight: 700;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      font-family: 'Inter', 'Noto Sans', sans-serif;
    }
    button.cta:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="background"></div>
  <div class="overlay"></div>
  ${contentHTML}
</body>
</html>
    `;
  }

  calculateFontSize(text, layoutVariant) {
    // Auto-fit headline: start large, reduce if needed
    const baseSize = layoutVariant === "center_card" ? 72 : 64;
    const maxLength = layoutVariant === "split" ? 40 : 60;
    
    if (text.length > maxLength) {
      return Math.max(36, baseSize - Math.floor((text.length - maxLength) / 5) * 4);
    }
    return baseSize;
  }

  escapeHtml(text) {
    if (text == null) return "";
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async renderPlaceholder(artDirection, brand, offer, format, outputPath) {
    // Create a simple placeholder HTML file
    const html = this.generateHTML(artDirection, brand, offer, format);
    const htmlPath = outputPath.replace(/\.png$/, ".html");
    fs.writeFileSync(htmlPath, html);
    
    // Also create a simple SVG placeholder PNG (minimal fallback)
    const dimensions = format === "ig_story" 
      ? { width: 1080, height: 1920 }
      : { width: 1080, height: 1350 };
    
    // For now, just return HTML path - puppeteer can be installed later
    // The HTML file can be manually converted to PNG or opened in browser
    return htmlPath;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = { FlyerRenderer };
