#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DROPLET_IP:-}" ]]; then
  echo "DROPLET_IP is not set. Add it to .env or export it before deployment."
  exit 1
fi

if [[ ! -f ".env" ]]; then
  echo ".env file is required for deployment."
  exit 1
fi

DROPLET_USER="${DROPLET_USER:-root}"
APP_DIR="${APP_DIR:-/opt/seethescience}"
REPO_BRANCH="${REPO_BRANCH:-main}"
REPO_URL="${REPO_URL:-$(git config --get remote.origin.url || true)}"
SSH_KEY_PATH="${SSH_KEY_PATH:-}"

if [[ -z "$REPO_URL" ]]; then
  echo "REPO_URL is not set and git origin could not be detected."
  exit 1
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_KEY_PATH" ]]; then
  SSH_OPTS+=(-i "$SSH_KEY_PATH")
fi

TARGET="${DROPLET_USER}@${DROPLET_IP}"

ssh "${SSH_OPTS[@]}" "$TARGET" "bash -s" <<EOF
set -euo pipefail

SUDO=""
if [[ "\$(id -u)" -ne 0 ]]; then
  SUDO="sudo"
fi

if ! command -v git >/dev/null 2>&1; then
  \$SUDO apt-get update -y
  \$SUDO apt-get install -y git
fi

if ! command -v docker >/dev/null 2>&1; then
  \$SUDO apt-get update -y
  \$SUDO apt-get install -y ca-certificates curl gnupg lsb-release
  \$SUDO install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \$SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  \$SUDO chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \\
    \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | \
    \$SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null
  \$SUDO apt-get update -y
  \$SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

\$SUDO mkdir -p "$APP_DIR"
\$SUDO chown -R "\$USER:\$USER" "$APP_DIR"

if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch --all --prune
  git checkout "$REPO_BRANCH"
  git pull --ff-only origin "$REPO_BRANCH"
else
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi
EOF

scp "${SSH_OPTS[@]}" .env "$TARGET:$APP_DIR/.env"

ssh "${SSH_OPTS[@]}" "$TARGET" "bash -s" <<EOF
set -euo pipefail
cd "$APP_DIR"

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose down || true
  docker-compose up --build -d
else
  docker compose down || true
  docker compose up --build -d
fi
EOF

echo "App live at http://$DROPLET_IP"
