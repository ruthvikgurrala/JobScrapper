import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

console.log("Adding Stealth Plugin...");
chromium.use(StealthPlugin());
console.log("Stealth Plugin successfully added!");
