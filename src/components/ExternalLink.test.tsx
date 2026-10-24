// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExternalLink } from "./ExternalLink";

const mocks = vi.hoisted(() => ({ openUrl: vi.fn(), isTauri: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: mocks.openUrl }));
vi.mock("../services/runtime", () => ({ isTauri: mocks.isTauri }));

describe("external links in the desktop app", () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.isTauri.mockReturnValue(true);
    mocks.openUrl.mockReset().mockResolvedValue(undefined);
  });

  it("opens the Ollama download URL with the system browser", () => {
    const onError = vi.fn();
    render(<ExternalLink href="https://ollama.com/download/windows" onError={onError}>Download Ollama</ExternalLink>);
    fireEvent.click(screen.getByRole("link", { name: "Download Ollama" }));
    expect(mocks.openUrl).toHaveBeenCalledWith("https://ollama.com/download/windows");
    expect(onError).not.toHaveBeenCalled();
  });

  it("shows an opener failure instead of silently doing nothing", async () => {
    mocks.openUrl.mockRejectedValue(new Error("No browser"));
    const onError = vi.fn();
    render(<ExternalLink href="https://ollama.com/download/windows" onError={onError}>Download Ollama</ExternalLink>);
    fireEvent.click(screen.getByRole("link", { name: "Download Ollama" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith("Error: No browser"));
  });
});
