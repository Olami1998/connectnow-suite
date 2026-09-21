import { describe, expect, it } from "vitest";
import { parseMeetingInput, meetingJoinPath, meetingInviteUrl } from "./meeting";

describe("parseMeetingInput", () => {
  it("accepts a raw room code", () => {
    expect(parseMeetingInput("abc123xy")).toBe("abc123xy");
  });

  it("parses /join/:id URLs", () => {
    expect(parseMeetingInput("https://meetflow.app/join/abcd1234ef")).toBe("abcd1234ef");
  });

  it("parses legacy ?room= query links", () => {
    expect(parseMeetingInput("https://meetflow.app/?room=legacy01")).toBe("legacy01");
  });

  it("rejects junk and short codes", () => {
    expect(parseMeetingInput("no")).toBeNull();
    expect(parseMeetingInput("")).toBeNull();
    expect(parseMeetingInput("short")).toBeNull();
  });
});

describe("meeting URLs", () => {
  it("builds a join path", () => {
    expect(meetingJoinPath("abc")).toBe("/join/abc");
  });

  it("builds an absolute invite URL", () => {
    expect(meetingInviteUrl("abc", "https://example.com")).toBe("https://example.com/join/abc");
  });
});
