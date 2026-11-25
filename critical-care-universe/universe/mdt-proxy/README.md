# MDT proxy

The MDT room answers any question by sending it, with the live (simulated) patient state, to this small proxy. The proxy holds the API key. The page never does. Without the proxy the room still answers, from its built-in specialists.

## Deploy (about 5 minutes, free Cloudflare account)

```
cd critical-care-universe/universe/mdt-proxy
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY      # paste a NEW key made for this, with a spend limit
npx wrangler deploy
```

Wrangler prints a URL like `https://ccu-mdt-proxy.<you>.workers.dev`.

## Connect the room

Open the MDT once with `nexus.html?mdt=https://ccu-mdt-proxy.<you>.workers.dev`. The page remembers it in that browser. `?mdt=off` forgets it.
To set it for everyone, add `window.CCU_MDT_URL = "https://…"` in a script before `nexus.js` in `nexus.html`.

## What the model sees, and does not

- Sees: the story as told, vitals, support, what has been given, results that are back, what is pending, the last few questions.
- Never sees: the diagnosis, the case's own list of steps, or any result that has not come back.
- Never gives: doses, rates, dilutions. The prompt forbids them and the page removes them if one slips through. Doses come from a validated protocol.
- Suggests actions only as buttons. Nothing is ordered until a doctor taps.

## Cost and safety

Each deep question is one model call (a few hundred tokens out). Set a monthly spend limit on the key. `ALLOWED_ORIGIN` in `wrangler.toml` stops other sites using the proxy from a browser. Anyone who finds the proxy URL can still call it directly, so keep the spend limit on.
