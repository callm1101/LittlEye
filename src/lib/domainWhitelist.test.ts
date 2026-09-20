import { describe, expect, it } from "vitest";
import { normalizeDomain, normalizeDomainList, parseStoredDomains } from "./domainWhitelist";

describe("website whitelist", () => {
  it("normalizes domains and pasted URLs without retaining paths", () => {
    expect(normalizeDomain(" HTTPS://WWW.Example.com/watch?v=private ")).toBe("www.example.com");
  });

  it("rejects wildcard and invalid domains", () => {
    expect(normalizeDomain("*.example.com")).toBeUndefined();
    expect(normalizeDomain("bad domain.example")).toBeUndefined();
  });

  it("deduplicates normalized domains", () => {
    expect(normalizeDomainList(["Example.com", "https://example.com/a", "openai.com"])).toEqual(["example.com", "openai.com"]);
  });

  it("falls back to the default websites for missing stored configuration", () => {
    expect(parseStoredDomains("not-json")).toEqual(["bilibili.com", "xiaohongshu.com"]);
  });
});
