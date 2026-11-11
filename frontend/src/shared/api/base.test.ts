import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";

import { api, formsApi, isPublicPagePath, publicApi, surveysApi } from "./base";

let captured: InternalAxiosRequestConfig[] = [];

const capture: AxiosAdapter = async (config) => {
  captured.push(config);
  return { data: {}, status: 200, statusText: "OK", headers: {}, config };
};

const authHeader = (config: InternalAxiosRequestConfig) =>
  config.headers?.Authorization ?? config.headers?.authorization;

beforeEach(() => {
  captured = [];
  publicApi.defaults.adapter = capture;
  api.defaults.adapter = capture;
  localStorage.clear();
  localStorage.setItem("access_token", "stale-jwt");
});

test("public pages: /survey/* and /forms/*, not the /surveys dashboard section", () => {
  expect(isPublicPagePath("/survey/abc/")).toBe(true);
  expect(isPublicPagePath("/forms/abc")).toBe(true);
  expect(isPublicPagePath("/surveys")).toBe(false);
  expect(isPublicPagePath("/surveys/1/results")).toBe(false);
  expect(isPublicPagePath("/admin/forms")).toBe(false);
  expect(isPublicPagePath(null)).toBe(false);
});

test("form invitation link never sends the JWT", async () => {
  await formsApi.public.get("tok");
  await formsApi.public.submit("tok", { name: "A" });
  expect(captured).toHaveLength(2);
  captured.forEach((config) => expect(authHeader(config)).toBeUndefined());
});

test("anonymous survey never sends the JWT, a named one does", async () => {
  await surveysApi.public.get("tok");
  await surveysApi.public.submit("tok", [], false);
  await surveysApi.public.submit("tok", [], true);
  expect(authHeader(captured[0])).toBeUndefined();
  expect(authHeader(captured[1])).toBeUndefined();
  expect(authHeader(captured[2])).toBe("Bearer stale-jwt");
});

test("the dashboard client still attaches the JWT", async () => {
  await api.get("/auth/me/");
  expect(authHeader(captured[0])).toBe("Bearer stale-jwt");
});
