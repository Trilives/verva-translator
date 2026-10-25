// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useUpdates } from "./useUpdates";

const mocks = vi.hoisted(() => ({ find: vi.fn(), install: vi.fn(), mode: vi.fn() }));
vi.mock("../services/updater", () => ({ findUpdate: mocks.find, installUpdate: mocks.install }));
vi.mock("../services/backend", () => ({ detectInstallMode: mocks.mode }));

beforeEach(() => {
  mocks.find.mockReset().mockResolvedValue({ available: true, version: "0.3.0-beta.5" });
  mocks.install.mockReset().mockResolvedValue(undefined);
  mocks.mode.mockReset().mockResolvedValue("installed");
});

it("checks silently at startup and installs only after the explicit action", async () => {
  const { result } = renderHook(() => useUpdates("beta"));
  await waitFor(() => expect(result.current.available?.version).toBe("0.3.0-beta.5"));
  expect(mocks.find).toHaveBeenCalledWith("beta");
  expect(mocks.install).not.toHaveBeenCalled();
  await act(async () => { await result.current.check(); });
  expect(mocks.install).not.toHaveBeenCalled();
  await act(async () => { await result.current.install(); });
  expect(mocks.install).toHaveBeenCalledOnce();
  expect(mocks.install).toHaveBeenCalledWith("beta", "0.3.0-beta.5");
});

it("never tries to install from a portable build", async () => {
  mocks.mode.mockResolvedValue("portable");
  const { result } = renderHook(() => useUpdates("beta"));
  await waitFor(() => expect(result.current.portable).toBe(true));
  await waitFor(() => expect(result.current.available?.version).toBe("0.3.0-beta.5"));
  await act(async () => { await result.current.install(); });
  expect(mocks.install).not.toHaveBeenCalled();
});
