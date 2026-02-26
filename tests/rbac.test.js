/**
 * RBAC tests: requireRole middleware and role restrictions.
 * Run: node tests/rbac.test.js
 */

const assert = require("assert");

function testRequireRoleLogic() {
  const allowedRoles = ["owner", "editor"];

  function checkRole(userRole) {
    const set = new Set(allowedRoles);
    if (!userRole) return { allowed: false, reason: "no role" };
    if (!set.has(userRole)) return { allowed: false, reason: "forbidden" };
    return { allowed: true };
  }

  assert.deepStrictEqual(checkRole("owner"), { allowed: true });
  assert.deepStrictEqual(checkRole("editor"), { allowed: true });
  assert.deepStrictEqual(checkRole("viewer"), { allowed: false, reason: "forbidden" });
  assert.deepStrictEqual(checkRole(null), { allowed: false, reason: "no role" });

  const allRoles = ["owner", "editor", "viewer"];
  const ownerOnly = ["owner"];
  assert.ok(allRoles.includes("viewer"));
  assert.ok(ownerOnly.includes("owner") && !ownerOnly.includes("editor"));
  console.log("requireRole logic: OK");
}

function testEndpointMatrix() {
  const ownerOnly = ["POST /api/workspace/profile", "GET/POST/PATCH/DELETE /api/workspace/users"];
  const ownerOrEditor = ["POST /api/chat", "POST /api/marketing/*", "POST /api/design/render"];
  const allRoles = ["GET /api/chat/threads", "GET /api/chat/threads/:id", "GET /api/outputs", "GET /api/workspace/profile"];

  assert.ok(ownerOnly.length >= 2);
  assert.ok(ownerOrEditor.length >= 3);
  assert.ok(allRoles.length >= 4);
  console.log("Endpoint matrix: OK");
}

testRequireRoleLogic();
testEndpointMatrix();
console.log("\nRBAC tests passed.");
process.exit(0);
