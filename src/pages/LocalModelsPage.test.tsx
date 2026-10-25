// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AppSettings } from "../domain/types";
import { I18nProvider } from "../i18n/I18nContext";
import { LocalModelsPage } from "./LocalModelsPage";

const mocks = vi.hoisted(() => ({
  status: vi.fn(), pull: vi.fn(), cancel: vi.fn(), onProgress: vi.fn(),
  load: vi.fn(), unload: vi.fn()
}));
vi.mock("../services/backend", () => ({
  localModelStatus: mocks.status, pullLocalModel: mocks.pull,
  cancelLocalModelPull: mocks.cancel, onLocalModelPull: mocks.onProgress,
  loadLocalModel: mocks.load, unloadLocalModel: mocks.unload
}));

const settings = { locale: "en", profiles: [] } as unknown as AppSettings;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
  mocks.status.mockResolvedValue({ available: true, models: [], activePulls: [] });
  mocks.cancel.mockResolvedValue(undefined);
  mocks.onProgress.mockResolvedValue(() => {});
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("offers cancellation for an active pull and clears the busy state afterward", async () => {
  let rejectPull: (reason: string) => void = () => {};
  mocks.pull.mockImplementation(() => new Promise<void>((_, reject) => { rejectPull = reject; }));
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Download" })[0].hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getAllByRole("button", { name: "Download" })[0]);
  expect(mocks.pull).toHaveBeenCalledWith("translategemma:4b-it-q4_K_M");
  fireEvent.click(screen.getByRole("button", { name: "Cancel download" }));
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("translategemma:4b-it-q4_K_M"));
  rejectPull("LOCAL_PULL_CANCELLED");
  await waitFor(() => expect(screen.getByText(/Download request canceled/)).not.toBeNull());
  expect(screen.queryByRole("button", { name: "Cancel download" })).toBeNull();
});

it("can cancel a pull after returning to the local models page", async () => {
  mocks.status.mockResolvedValue({ available: true, models: [], activePulls: ["qwen3.5:2b-q4_K_M"] });
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  const cancel = await screen.findByRole("button", { name: "Cancel download" });
  fireEvent.click(cancel);
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("qwen3.5:2b-q4_K_M"));
});
