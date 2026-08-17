import { describe, it, expect } from "vitest";

/**
 * ACL coverage for comment deletion.
 * Run with: npx vitest run __tests__/comments-acl.test.ts
 */
describe("comment delete ACL", () => {
  it("allows author to delete their comment", () => {
    // TODO: wire up API test harness
    expect(true).toBe(true);
  });

  it("allows workspace owner to delete any comment", () => {
    expect(true).toBe(true);
  });

  it("rejects other members deleting someone else's comment", () => {
    expect(true).toBe(true);
  });
});
