import { describe, expect, it } from "vitest";
import { documentApiUrl } from "./api";

describe("documentApiUrl", () => {
  it("uses the authenticated career endpoint for locally stored resumes", () => {
    expect(documentApiUrl("/uploads/private/career/resume_123.pdf")).toBe(
      "/api/files/career/resume_123.pdf",
    );
  });

  it("uses the authenticated franchise endpoint for private documents", () => {
    expect(documentApiUrl("/uploads/private/franchise/id-card_123.jpg")).toBe(
      "/api/files/franchise/id-card_123.jpg",
    );
  });

  it("preserves remote storage URLs", () => {
    expect(documentApiUrl("https://storage.example.com/resume.pdf")).toBe(
      "https://storage.example.com/resume.pdf",
    );
  });
});
