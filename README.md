# Yeeps Channel Watch

A Discord Activity that plays the Yeeps Channel live stream inside a voice channel, so everyone can watch together.

The stream is an HLS feed from watch.mistlive.tv. Inside Discord it is played through the Activity proxy; outside Discord it plays directly.

## Running it

```
npm install
npm run dev
```

Set `VITE_DISCORD_CLIENT_ID` in a `.env` file to your Discord application ID. Without it the Activity can't connect to Discord.

`npm run build` makes the production build in `dist/`.

Add `?debug` to the URL to show the debug line.
