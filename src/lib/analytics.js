import mixpanel from "mixpanel-browser";

export function initAnalytics() {
  if (import.meta.env.DEV) return;

  mixpanel.init("69d2bebfb2f6e2c6fdee4445e9969541", {
    persistence: "localStorage",
  });
}

export function track(event, props = {}) {
  if (import.meta.env.DEV) {
    console.log("[track]", event, props);
    return;
  }

  mixpanel.track(event, props);
}