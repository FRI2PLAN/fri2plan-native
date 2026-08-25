import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appConfig = JSON.parse(
  readFileSync(new URL("../app.json", import.meta.url), "utf8"),
);

describe("Configuration des liens d’invitation Android", () => {
  it("associe les URLs HTTPS d’invitation au package FRI2PLAN", () => {
    const filters = appConfig.expo.android.intentFilters ?? [];
    const invitationFilter = filters.find(
      (filter) =>
        filter.action === "VIEW" &&
        filter.autoVerify === true &&
        filter.data?.some(
          (data) =>
            data.scheme === "https" &&
            data.host === "app.fri2plan.ch" &&
            data.pathPrefix === "/invitation",
        ),
    );

    expect(appConfig.expo.android.package).toBe("app.fri2plan.ch");
    expect(invitationFilter).toBeDefined();
    expect(invitationFilter.category).toEqual(
      expect.arrayContaining(["BROWSABLE", "DEFAULT"]),
    );
  });
});
