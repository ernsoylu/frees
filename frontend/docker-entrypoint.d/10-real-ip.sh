#!/bin/sh
# Generate the real_ip trust list from TRUSTED_PROXY_CIDRS.
#
# nginx can only recover the true client address from X-Forwarded-For if it
# knows which upstream hops are trustworthy — and that answer is deployment
# specific, so it is NEVER guessed here. Unset (the default) means no proxy is
# trusted: $remote_addr stays the actual connection peer and a client-supplied
# X-Forwarded-For is ignored entirely.
#
# Guessing is not safe. With a docker-published port the peer nginx sees is
# always the bridge gateway (172.x), so trusting the private ranges by default
# would make EVERY external client look like it came from a trusted proxy —
# handing anyone on the internet the ability to forge their own client address
# and hand themselves a fresh rate-limit bucket per request. That is the exact
# bypass this is meant to close, so the default has to be "trust nothing".
#
# Set it only to the address the edge actually reaches nginx from:
#   Railway   TRUSTED_PROXY_CIDRS="fd00::/8"          (private network)
#   Pangolin  TRUSTED_PROXY_CIDRS="10.0.0.0/8"        (whatever the tunnel uses)
# Multiple entries are comma- or space-separated.
set -e

target="/etc/nginx/real-ip.conf"
: > "$target"

if [ -n "${TRUSTED_PROXY_CIDRS:-}" ]; then
  for cidr in $(echo "$TRUSTED_PROXY_CIDRS" | tr ',' ' '); do
    [ -n "$cidr" ] && echo "set_real_ip_from $cidr;" >> "$target"
  done
  # Walk the forwarded chain right-to-left, skipping trusted hops, and take the
  # first untrusted address as the client. Only applies when the CONNECTION
  # peer is itself in the trust list above.
  echo "real_ip_header X-Forwarded-For;" >> "$target"
  echo "real_ip_recursive on;" >> "$target"
fi
