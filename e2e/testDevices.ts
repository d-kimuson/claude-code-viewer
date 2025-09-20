import { devices } from "playwright";

export const testDevices = [
  {
    name: "desktop",
    device: devices["Desktop Chrome"],
  },
  {
    name: "mobile",
    device: devices["iPhone 15"],
  },
  {
    name: "table",
    device: devices["iPad Pro 11"],
  },
];
