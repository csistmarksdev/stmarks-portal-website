# Install screenshots

The previews the browser's install dialog shows, listed in `src/app/manifest.ts`.
They show the sign-in page only, so no church data appears in them.

To retake them after the sign-in page changes, run this from this folder with Microsoft Edge (Git Bash):

```bash
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
SITE=https://129-225-110-39.sslip.io/login
"$EDGE" --headless=new --hide-scrollbars --virtual-time-budget=8000 --window-size=1280,720 --screenshot="$(cygpath -w "$PWD")\\login-wide.png" "$SITE"
"$EDGE" --headless=new --hide-scrollbars --virtual-time-budget=8000 --window-size=540,1170 --screenshot="$(cygpath -w "$PWD")\\login-narrow.png" "$SITE"
```

Keep the sizes as they are. They must match the `sizes` field in the manifest.
