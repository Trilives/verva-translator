import { describe, expect, it } from "vitest";
import { followerScrollTop, type ScrollBox } from "./useSyncedScroll";

const box = (scrollTop: number, scrollHeight: number, clientHeight = 100): ScrollBox =>
  ({ scrollTop, scrollHeight, clientHeight });

describe("synced editor scrolling", () => {
  /**
   * The panes hold the same text in two languages and rarely share a height,
   * so the follower matches a fraction of its own range, not a pixel offset.
   */
  it("matches the fraction scrolled, not the pixel offset", () => {
    const from = box(50, 600); // range 500, so 10%
    const to = box(0, 2100); // range 2000
    expect(followerScrollTop(from, to)).toBe(200); // 10% of 2000
  });

  it("keeps both ends aligned", () => {
    const to = box(0, 2100);
    expect(followerScrollTop(box(0, 600), to)).toBe(null); // already at the top
    expect(followerScrollTop(box(500, 600), to)).toBe(2000); // bottom to bottom
  });

  it("drives from either side", () => {
    expect(followerScrollTop(box(1000, 2100), box(0, 600))).toBe(250); // 50% of 500
  });

  it("does not move a follower that cannot scroll", () => {
    expect(followerScrollTop(box(250, 600), box(0, 80))).toBe(null);
    expect(followerScrollTop(box(250, 600), box(0, 100))).toBe(null);
  });

  /** Every write emits another scroll event, so sub-pixel work must be skipped. */
  it("ignores corrections too small to see", () => {
    expect(followerScrollTop(box(250, 600), box(1000.4, 2100))).toBe(null);
    expect(followerScrollTop(box(250, 600), box(990, 2100))).toBe(1000);
  });

  it("treats an unscrollable driver as being at the top", () => {
    expect(followerScrollTop(box(0, 100), box(500, 2100))).toBe(0);
  });

  it("clamps overscroll rather than pushing the follower past its end", () => {
    // Elastic overscroll can report a scrollTop beyond the range.
    expect(followerScrollTop(box(620, 600), box(0, 2100))).toBe(2000);
    expect(followerScrollTop(box(-30, 600), box(500, 2100))).toBe(0);
  });
});
