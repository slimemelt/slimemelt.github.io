import { DiscordSDK } from "@discord/embedded-app-sdk";
import Hls from "hls.js";
// Londrina Solid is bundled with the page (Discord blocks fonts loaded from other websites)
import "@fontsource/londrina-solid/400.css";
import "@fontsource/londrina-solid/900.css";

// ---- Settings -------------------------------------------------------------
const STREAM_HOST = "https://watch.mistlive.tv";
const STREAM_PATH = "/hls/ypch/playlist.m3u8";
// Must match the URL mapping you add in the Discord Developer Portal:
//   prefix "/mist"  ->  target "watch.mistlive.tv"
const PROXY_PREFIX = "/.proxy/mist";
const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
// ---------------------------------------------------------------------------

// Discord adds ?frame_id=... when it loads an Activity. Outside Discord we play directly (handy for testing).
const params = new URLSearchParams(window.location.search);
const inDiscord = params.has("frame_id");

const video = document.getElementById("player");
const overlay = document.getElementById("overlay");
const playBtn = document.getElementById("playBtn");
const statusEl = document.getElementById("status");

const debugEl = document.getElementById("debug");
const setStatus = (text) => { statusEl.textContent = text; };
const setDebug = (text) => { debugEl.textContent = text; };
// The gray diagnostic line stays hidden unless something goes wrong (or you add ?debug to the address)
const revealDebug = () => debugEl.classList.add("show");
let streamReady = false;

// One diagnostic line shown under the status, so a stuck page tells you why
const hasId = Boolean(CLIENT_ID);
const hlsJs = Hls.isSupported();
const nativeHls = Boolean(document.createElement("video").canPlayType("application/vnd.apple.mpegurl"));
const baseDebug = () => `Application ID in this build: ${hasId ? "yes" : "NO (set the DISCORD_CLIENT_ID variable, then re-run the deploy)"} | running in: ${inDiscord ? "Discord" : "a normal browser"} | platform: ${params.get("platform") || "n/a"} | hls.js: ${hlsJs ? "yes" : "no"} | native HLS: ${nativeHls ? "yes" : "no"}`;
setDebug(baseDebug());
if (params.has("debug")) revealDebug();

async function start() {
  if (inDiscord) {
    if (!CLIENT_ID) {
      setStatus("Missing VITE_DISCORD_CLIENT_ID. Add it to .env and rebuild.");
      revealDebug();
      return;
    }
    setStatus("Connecting to Discord…");
    const sdk = new DiscordSDK(CLIENT_ID);
    await sdk.ready(); // tells Discord the Activity finished loading
  }

  const src = (inDiscord ? PROXY_PREFIX : STREAM_HOST) + STREAM_PATH;
  setStatus("Loading stream…");
  setDebug(`${baseDebug()} | stream: ${src}`);
  // If nothing has loaded after a while, say so instead of sitting on "Loading…"
  setTimeout(() => {
    if (!streamReady) {
      setStatus("Still loading. The connection to the stream may be blocked.");
      revealDebug();
    }
  }, 15000);

  if (Hls.isSupported()) {
    const hls = new Hls({
      liveSyncDurationCount: 3,
      // If the playlist contains full https://watch.mistlive.tv/... links, send them through Discord's proxy too.
      xhrSetup: (xhr, url) => {
        if (inDiscord && url.startsWith(STREAM_HOST)) {
          xhr.open("GET", PROXY_PREFIX + url.slice(STREAM_HOST.length), true);
        }
      },
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      streamReady = true;
      setStatus("");
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      const code = data.response && data.response.code ? ` / HTTP ${data.response.code}` : "";
      setDebug(`${baseDebug()} | stream: ${src} | ${data.type} / ${data.details}${code}`);
      if (data.fatal) revealDebug();
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setStatus("Connection problem, retrying…");
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
      } else {
        setStatus("Couldn't play the stream.");
        hls.destroy();
      }
    });
    hls.loadSource(src);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src; // Safari and iOS play HLS natively
    streamReady = true;
    setStatus("");
  } else {
    setStatus("This device can't play HLS streams.");
  }
}

playBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  video.controls = true;
  video.play().catch(() => {
    video.controls = false;
    overlay.classList.remove("hidden");
  });
});

start().catch((err) => {
  setStatus(`Something went wrong: ${err.message}`);
  revealDebug();
});
