import { describe, expect, it } from "vitest";
import { evaluateDeterministic } from "./evaluation";
import { normalizePhone } from "./phone";

describe("recruitment rules", () => {
  it("normalizes a Guatemala phone to E.164", () => {
    expect(normalizePhone("5555 5555", "GT")).toEqual({ e164: "+50255555555", country: "GT" });
    expect(normalizePhone("+502 5555 5555", "GT").e164).toBe("+50255555555");
  });

  it("rejects an invalid Guatemala phone", () => {
    expect(() => normalizePhone("123", "GT")).toThrow();
  });

  it("fails a hard rule when the answer is not accepted", () => {
    const result = evaluateDeterministic([{ fieldKey: "vehicle", label: "Licencia", hardFail: true, acceptedAnswers: ["Sí"] }], { vehicle: "No" });
    expect(result.passed).toBe(false);
    expect(result.hardFailReason).toBe("Licencia");
  });

  it("supports minimum experience in months", () => {
    const result = evaluateDeterministic([{ fieldKey: "experience", label: "Experiencia", hardFail: true, answerConfig: { minMonths: 12 } }], { experience: "8 meses" });
    expect(result.passed).toBe(false);
    expect(result.results[0]?.reason).toContain("12 meses");
  });

  it("allows a candidate who meets all deterministic conditions", () => {
    const result = evaluateDeterministic([
      { fieldKey: "vehicle", label: "Licencia", hardFail: true, acceptedAnswers: ["Sí"] },
      { fieldKey: "experience", label: "Experiencia", hardFail: true, answerConfig: { minMonths: 12 } },
    ], { vehicle: "Sí", experience: "18 meses" });
    expect(result.passed).toBe(true);
    expect(result.results.every(item => item.passed)).toBe(true);
  });
});
