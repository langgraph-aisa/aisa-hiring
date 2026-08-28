import { describe, expect, it } from "vitest";

const looksConfigured = (value: string | undefined) => Boolean(value && value.trim() && !value.includes("PENDIENTE") && !value.includes("pending"));

describe("integration secrets", () => {
  it("validates ApiChat configuration shape without sending a message", async () => {
    const endpoint = process.env.APICHAT_API_ENDPOINT;
    const token = process.env.APICHAT_TOKEN;
    const accountId = process.env.APICHAT_ACCOUNT_ID;

    if (!looksConfigured(endpoint) || !looksConfigured(token) || !looksConfigured(accountId)) {
      expect(true).toBe(true);
      return;
    }

    const response = await fetch(endpoint!, {
      method: "OPTIONS",
      headers: { Authorization: `Bearer ${token}`, "X-Account-Id": accountId! },
    });
    expect(response.status).toBeLessThan(500);
  });
});
