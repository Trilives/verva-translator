import { describe, expect, it } from "vitest";

/**
 * Regression cover for the blank-window bug: Fluent copies FluentProvider's
 * className onto the portal mount node appended to <body>. Any unscoped
 * `.provider-root` sizing rule therefore turns that portal into a full-viewport
 * opaque sheet at z-index 1000000, hiding the entire window the moment a
 * Dropdown, Tooltip or Dialog opens.
 *
 * Every sheet is scanned, not just one: the rules live in feature partials now,
 * and a guard reading a single file would miss them.
 */
const sheets = import.meta.glob("./*.css", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const allCss = Object.values(sheets).join("\n");

const entry = import.meta.glob("../main.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const mainSource = Object.values(entry)[0];

describe("stylesheets", () => {
  it("covers every stylesheet in the directory", () => {
    expect(Object.keys(sheets).length).toBeGreaterThan(1);
    expect(Object.keys(sheets)).toContain("./base.css");
  });

  it("styles .provider-root only as a direct child of #root", () => {
    const rules = allCss
      .split("\n")
      .filter((line: string) => line.includes(".provider-root") && line.includes("{"));
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
    expect(allCss).toMatch(/body\s*>\s*\.fui-FluentProvider\s*\{[^}]*height:\s*auto/);
  });

  /**
   * Vite's dev server does not inline CSS `@import`, so a sheet that imports
   * the others serves empty and the whole app renders unstyled under
   * `npm run dev`. Order is owned by the import list in main.tsx instead.
   */
  it("never uses CSS @import to compose sheets", () => {
    expect(allCss).not.toMatch(/@import/);
  });

  /** Cascade order is load order, so responsive must be imported last. */
  it("imports every sheet from main.tsx, responsive last", () => {
    const imported = [...mainSource.matchAll(/import "\.\/styles\/([\w-]+)\.css"/g)].map((match) => match[1]);
    const present = Object.keys(sheets).map((path) => path.replace("./", "").replace(".css", ""));
    expect([...imported].sort()).toEqual([...present].sort());
    expect(imported[0]).toBe("base");
    expect(imported.at(-1)).toBe("responsive");
  });
});
