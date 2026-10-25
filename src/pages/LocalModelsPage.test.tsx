// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AppSettings } from "../domain/types";
import { LOCAL_OLLAMA_ID } from "../domain/localOllama";
import { I18nProvider } from "../i18n/I18nContext";
import { LocalModelsPage } from "./LocalModelsPage";

const mocks = vi.hoisted(() => ({
  status: vi.fn(), pull: vi.fn(), cancel: vi.fn(), onProgress: vi.fn(),
  load: vi.fn(), unload: vi.fn(), start: vi.fn()
}));
vi.mock("../services/backend", () => ({
  localModelStatus: mocks.status, pullLocalModel: mocks.pull,
  cancelLocalModelPull: mocks.cancel, onLocalModelPull: mocks.onProgress,
  loadLocalModel: mocks.load, unloadLocalModel: mocks.unload, startOllama: mocks.start
}));

const settings = { locale: "en", profiles: [] } as unknown as AppSettings;

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
  mocks.status.mockResolvedValue({ available: true, ollamaInstalled: true, models: [], activePulls: [] });
  mocks.pull.mockReset().mockResolvedValue(undefined);
  mocks.cancel.mockResolvedValue(undefined);
  mocks.onProgress.mockResolvedValue(() => {});
  mocks.start.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it("offers cancellation for an active pull and clears the busy state afterward", async () => {
  let rejectPull: (reason: string) => void = () => {};
  mocks.pull.mockImplementation(() => new Promise<void>((_, reject) => { rejectPull = reject; }));
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Download" })[0].hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getAllByRole("button", { name: "Download" })[0]);
  expect(mocks.pull).toHaveBeenCalledWith("translategemma:4b-it-q4_K_M", undefined);
  fireEvent.click(screen.getByRole("button", { name: "Cancel download" }));
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("translategemma:4b-it-q4_K_M"));
  rejectPull("LOCAL_PULL_CANCELLED");
  await waitFor(() => expect(screen.getByText(/Download request canceled/)).not.toBeNull());
  expect(screen.queryByRole("button", { name: "Cancel download" })).toBeNull();
});

it("keeps idle model cards out of the busy state", async () => {
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Download" })[0].hasAttribute("disabled")).toBe(false));
  expect(screen.queryByText("Working…")).toBeNull();
  expect(screen.queryByRole("button", { name: "Cancel download" })).toBeNull();
});

it("distinguishes installed but stopped Ollama from a missing installation", async () => {
  mocks.status.mockResolvedValue({ available: false, ollamaInstalled: true, models: [], activePulls: [] });
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  expect(await screen.findByText(/Ollama is installed but not running/)).not.toBeNull();
  expect(screen.queryByText("Get Ollama for Windows")).toBeNull();
  expect(screen.queryByText("Not installed")).toBeNull();
  expect(screen.getAllByRole("button", { name: "Download" })[0].hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Start Ollama" }));
  await waitFor(() => expect(mocks.start).toHaveBeenCalledOnce());
});

it("keeps model research behind a guide button", async () => {
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  expect(screen.queryByText(/Memory figures are approximate/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Model guide" }));
  expect(await screen.findByText(/Memory figures are approximate/)).not.toBeNull();
});

it("can cancel a pull after returning to the local models page", async () => {
  mocks.status.mockResolvedValue({ available: true, ollamaInstalled: true, models: [], activePulls: ["qwen3.5:2b-q4_K_M"] });
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  const cancel = await screen.findByRole("button", { name: "Cancel download" });
  fireEvent.click(cancel);
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith("qwen3.5:2b-q4_K_M"));
});

it("uses the optional proxy for a model download", async () => {
  mocks.status.mockResolvedValue({ available: false, ollamaInstalled: true, models: [], activePulls: [] });
  const withProxy = { ...settings, ollamaProxyUrl: "127.0.0.1:7897" };
  render(<I18nProvider locale="en"><LocalModelsPage settings={withProxy} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  await waitFor(() => expect(screen.getAllByRole("button", { name: "Download" })[0].hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getAllByRole("button", { name: "Download" })[0]);
  await waitFor(() => expect(mocks.pull).toHaveBeenCalledWith("translategemma:4b-it-q4_K_M", "127.0.0.1:7897"));
});

it("downloads a custom Ollama model name", async () => {
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  fireEvent.change(screen.getByRole("textbox", { name: "Ollama model name" }), { target: { value: "mistral:7b-instruct-q4_K_M" } });
  const card = screen.getByText("mistral:7b-instruct-q4_K_M").closest("article");
  expect(card).not.toBeNull();
  await waitFor(() => expect(within(card!).getByRole("button", { name: "Download" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(within(card!).getByRole("button", { name: "Download" }));
  await waitFor(() => expect(mocks.pull).toHaveBeenCalledWith("mistral:7b-instruct-q4_K_M", undefined));
});

it("shows a custom pull after reopening the page", async () => {
  mocks.status.mockResolvedValue({ available: true, ollamaInstalled: true, models: [], activePulls: ["mistral:7b-instruct-q4_K_M"] });
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={vi.fn()} onUse={vi.fn()} /></I18nProvider>);
  const card = (await screen.findByText("mistral:7b-instruct-q4_K_M")).closest("article");
  expect(card).not.toBeNull();
  expect(within(card!).getByRole("button", { name: "Cancel download" })).not.toBeNull();
});

it("uses the fixed Ollama profile for an installed model", async () => {
  mocks.status.mockResolvedValue({ available: true, ollamaInstalled: true,
    models: [{ name: "gemma3:1b-it-q4_K_M", size: 806067407, running: false }], activePulls: [] });
  let nextSettings = settings;
  const update = vi.fn(async (change: AppSettings | ((value: AppSettings) => AppSettings)) => {
    nextSettings = typeof change === "function" ? change(nextSettings) : change;
  });
  const onUse = vi.fn();
  render(<I18nProvider locale="en"><LocalModelsPage settings={settings} update={update} onUse={onUse} /></I18nProvider>);
  const card = (await screen.findByText("gemma3:1b-it-q4_K_M")).closest("article");
  fireEvent.click(within(card!).getByRole("button", { name: "Use in translation" }));
  await waitFor(() => expect(onUse).toHaveBeenCalledOnce());
  expect(nextSettings.activeProfileId).toBe(LOCAL_OLLAMA_ID);
  expect(nextSettings.profiles.filter((profile) => profile.kind === "ollama")).toHaveLength(1);
  expect(nextSettings.profiles.find((profile) => profile.id === LOCAL_OLLAMA_ID)?.model).toBe("gemma3:1b-it-q4_K_M");
});
