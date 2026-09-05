// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderProfile } from "../domain/types";
import { useModelOptions } from "./useModelOptions";

const mocks = vi.hoisted(() => ({ listModels: vi.fn() }));
vi.mock("../services/backend", () => ({ listModels: mocks.listModels }));

const profile = (id: string): ProviderProfile => ({
  id, name: id, kind: "openai", baseUrl: "http://127.0.0.1/v1",
  model: "m", thinking: "off", longConversation: false, contextLimit: 8192
});

describe("useModelOptions", () => {
  beforeEach(() => mocks.listModels.mockReset());

  it("fetches a profile's models once and caches them", async () => {
    mocks.listModels.mockResolvedValue(["a", "b"]);
    const { result } = renderHook(() => useModelOptions());

    await act(async () => { result.current.load(profile("p1")); });
    expect(result.current.cache.p1).toEqual(["a", "b"]);

    // Reopening the dropdown must not hit the endpoint again.
    await act(async () => { result.current.load(profile("p1")); });
    expect(mocks.listModels).toHaveBeenCalledTimes(1);
  });

  it("caches an empty result and does not retry it", async () => {
    // An endpoint that returns nothing must still be cached, so reopening the
    // dropdown does not refetch. (A network failure is caught the same way,
    // yielding [].)
    mocks.listModels.mockResolvedValue([]);
    const { result } = renderHook(() => useModelOptions());

    await act(async () => { result.current.load(profile("p2")); });
    expect(result.current.cache.p2).toEqual([]);

    await act(async () => { result.current.load(profile("p2")); });
    expect(mocks.listModels).toHaveBeenCalledTimes(1);
  });
});
