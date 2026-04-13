import test from "node:test";
import assert from "node:assert/strict";

function canPublish(existingPublishedVersionId: string | null, targetVersionId: string) {
  return existingPublishedVersionId === null || existingPublishedVersionId === targetVersionId;
}

function canApprove(reviewerId: string, approverId: string) {
  return reviewerId !== approverId;
}

test("only one published version may be active per model", () => {
  assert.equal(canPublish(null, "v1"), true);
  assert.equal(canPublish("v1", "v1"), true);
  assert.equal(canPublish("v1", "v2"), false);
});

test("reviewer and approver must differ", () => {
  assert.equal(canApprove("user-a", "user-b"), true);
  assert.equal(canApprove("user-a", "user-a"), false);
});

