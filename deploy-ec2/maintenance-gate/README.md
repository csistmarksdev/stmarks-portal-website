# Maintenance gate

Puts the public website behind a maintenance notice when a super admin turns
on **Maintenance mode** in the Portal (System → Maintenance mode) — without any
change to the website itself.

```
visitor ──► :3000  maintenance gate  ──► 127.0.0.1:3001  website (next start)
                     │
                     └── asks the Portal every few seconds:
                         GET http://127.0.0.1:8080/v1/site/status
```

| Portal says | Visitors get |
|---|---|
| maintenance **off** | the website, unchanged |
| maintenance **on** | a bilingual notice page (the Portal's message and "expected back" time), HTTP 503 with `Retry-After`, `noindex` |
| Portal **unreachable** | the website — the gate fails open, so a Portal outage never takes the site down |

Always passed through, whatever the mode: `/api/revalidate` (the Portal
refreshing the site after a publish) and `/favicon.ico`.

Switching maintenance on or off takes effect within about five seconds
(`STATUS_TTL_MS`).

## Install (EC2)

```bash
# the website now listens privately on 127.0.0.1:3001
sudo cp deploy-ec2/csistmc-website.service /etc/systemd/system/
# the gate takes the public port 3000
sudo cp deploy-ec2/csistmc-maintenance-gate.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart csistmc-website
sudo systemctl enable --now csistmc-maintenance-gate
./deploy-ec2/scripts/status.sh
```

Nothing to install: `gate.mjs` uses Node's built-in modules only (Node 18+).

## Preview during maintenance (optional)

Set `GATE_BYPASS_TOKEN` in `gate.env` (see `gate.env.example`), restart the
gate, then open `http://<site>/?gate-preview=<token>` once. That browser sees
the real website for 12 hours while everyone else sees the notice.

## Check it

```bash
curl -s http://127.0.0.1:3000/__gate/health
# {"ok":true,"portal":"reachable","maintenance":false}
journalctl -u csistmc-maintenance-gate -f     # logs every ON/OFF change
```

## Elsewhere (Nginx, Caddy, another host)

The gate is just a reverse proxy; run it anywhere in front of the website with
`UPSTREAM_URL` pointing at the site and `STATUS_URL` at
`https://<portal>/v1/site/status`. Settings are listed at the top of `gate.mjs`.
