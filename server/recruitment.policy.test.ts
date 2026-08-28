import { describe, expect, it } from "vitest";
import { canChangeStatus, canManageConfiguration, canOperateCandidates, duplicateIdentity, shouldContinueAfterReview } from "./policy";

describe("recruitment policy", () => {
  it("allows operations for admin and recruiter only", () => {
    expect(canOperateCandidates("admin")).toBe(true);
    expect(canOperateCandidates("reclutador")).toBe(true);
    expect(canOperateCandidates("user")).toBe(false);
  });

  it("reserves configuration for admin", () => {
    expect(canManageConfiguration("admin")).toBe(true);
    expect(canManageConfiguration("reclutador")).toBe(false);
  });

  it("accepts only known statuses for an operational role", () => {
    expect(canChangeStatus("reclutador", "calificado")).toBe(true);
    expect(canChangeStatus("user", "calificado")).toBe(false);
    expect(canChangeStatus("admin", "otro_estado")).toBe(false);
  });

  it("uses phone plus position as duplicate identity", () => {
    expect(duplicateIdentity("+50255555555", 4)).toBe("+50255555555:4");
    expect(duplicateIdentity("+50255555555", 4)).toBe(duplicateIdentity("+50255555555", 4));
    expect(duplicateIdentity("+50255555555", 5)).not.toBe(duplicateIdentity("+50255555555", 4));
  });

  it("continues only while status remains qualified after the hold", () => {
    expect(shouldContinueAfterReview("calificado")).toBe(true);
    expect(shouldContinueAfterReview("no_calificado")).toBe(false);
    expect(shouldContinueAfterReview("en_revision")).toBe(false);
  });
});
