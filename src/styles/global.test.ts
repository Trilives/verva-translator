import { describe, expect, it } from "vitest";
import css from "./global.css?raw";

/**
 * Regression cover for the blank-window bug: Fluent copies FluentProvider's
 * className onto the portal mount node appended to <body>. Any unscoped
 * `.provider-root` sizing rule therefore turns that portal into a full-viewport
 * opaque sheet at z-index 1000000, hiding the entire window the moment a
 * Dropdown, Tooltip or Dialog opens.
 */
describe("global stylesheet", () => {
  const rules = css
    .split("\n")
    .filter((line: string) => line.includes(".provider-root") && line.includes("{"));

  it("styles .provider-root only as a direct child of #root", () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      const selectors = rule.slice(0, rule.indexOf("{"));
      for (const selector of selectors.split(",")) {
        if (!selector.includes(".provider-root")) continue;
        expect(selector).toMatch(/#root\s*>\s*\.provider-root/);
      }
    }
  });

  it("neutralises layout on any body-level Fluent portal", () => {
    expect(css).toMatch(/body\s*>\s*\.fui-FluentProvider\s*\{[^}]*height:\s*auto/);
  });
});
