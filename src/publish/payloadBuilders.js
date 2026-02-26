function escapeHtml(s) {
  if (typeof s !== "string") return String(s || "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function extractTitleFromContent(content) {
  if (!content || typeof content !== "string") return null;
  const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }
  return null;
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function createSlug(title) {
  if (!title || typeof title !== "string") return "";
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function buildWpPostDraftFromSeoArticle({ topic, content }) {
  const title = extractTitleFromContent(content) || topic || "SEO Article";
  const excerpt = stripHtml(content).slice(0, 160);
  const slug = createSlug(title);

  return {
    postType: "post",
    mode: "create",
    remoteId: null,
    title: title,
    content: content || "",
    excerpt: excerpt || "",
    slug: slug,
    status: "draft",
  };
}

function buildWpPostDraftFromSeoFix({ pageUrl, fixResult }) {
  const title = "SEO Fix návrh: " + (pageUrl || "Unknown Page");
  const slug = createSlug(title);

  let contentParts = [];
  if (fixResult.suggested_title) {
    contentParts.push("<h2>Návrh Title</h2><p>" + escapeHtml(fixResult.suggested_title) + "</p>");
  }
  if (fixResult.suggested_meta_description) {
    contentParts.push("<h2>Návrh Meta Description</h2><p>" + escapeHtml(fixResult.suggested_meta_description) + "</p>");
  }
  if (fixResult.suggested_h1) {
    contentParts.push("<h2>Návrh H1</h2><p>" + escapeHtml(fixResult.suggested_h1) + "</p>");
  }
  if (pageUrl) {
    contentParts.push("<h2>URL stránky</h2><p><a href=\"" + escapeHtml(pageUrl) + "\">" + escapeHtml(pageUrl) + "</a></p>");
  }

  const content = contentParts.length > 0
    ? contentParts.join("\n\n")
    : "<p>SEO fix návrh pro: " + escapeHtml(pageUrl || "Unknown") + "</p>";

  return {
    postType: "post",
    mode: "create",
    remoteId: null,
    title: title,
    content: content,
    excerpt: "SEO fix návrh pro " + (pageUrl || "Unknown Page"),
    slug: slug,
    status: "draft",
  };
}

module.exports = {
  buildWpPostDraftFromSeoArticle,
  buildWpPostDraftFromSeoFix,
};
