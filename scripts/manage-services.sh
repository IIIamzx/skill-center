#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROMPT_VAULT_DIR="${PROMPT_VAULT_DIR:-$HOME/.paperclip/instances/default/workspaces/ef3683dc-1e1b-45d6-9d75-3dc8df0b095e/prompt-vault}"
STATE_DIR="$ROOT_DIR/.run"
LOG_DIR="$ROOT_DIR/log"

mkdir -p "$STATE_DIR" "$LOG_DIR"

usage() {
  cat <<'EOF'
Usage:
  scripts/manage-services.sh start   [skillcenter|prompt-vault|all]
  scripts/manage-services.sh stop    [skillcenter|prompt-vault|all]
  scripts/manage-services.sh restart [skillcenter|prompt-vault|all]
  scripts/manage-services.sh status  [skillcenter|prompt-vault|all]

Default service is "all".
EOF
}

pid_file() {
  case "$1" in
    skillcenter) echo "$STATE_DIR/skillcenter.pid" ;;
    prompt-vault) echo "$STATE_DIR/prompt-vault.pid" ;;
    *) echo "Unknown service: $1" >&2; exit 2 ;;
  esac
}

service_dir() {
  case "$1" in
    skillcenter) echo "$ROOT_DIR" ;;
    prompt-vault) echo "$PROMPT_VAULT_DIR" ;;
    *) echo "Unknown service: $1" >&2; exit 2 ;;
  esac
}

service_log() {
  case "$1" in
    skillcenter) echo "$LOG_DIR/skillcenter-dev.log" ;;
    prompt-vault) echo "$PROMPT_VAULT_DIR/promptstudio.log" ;;
    *) echo "Unknown service: $1" >&2; exit 2 ;;
  esac
}

service_ports() {
  case "$1" in
    skillcenter) echo "3001 5173" ;;
    prompt-vault) echo "5174" ;;
    *) echo "Unknown service: $1" >&2; exit 2 ;;
  esac
}

service_url() {
  case "$1" in
    skillcenter) echo "http://127.0.0.1/skillcenter/" ;;
    prompt-vault) echo "http://127.0.0.1/promptstudio/" ;;
    *) echo "Unknown service: $1" >&2; exit 2 ;;
  esac
}

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local file="$1"
  [[ -f "$file" ]] && tr -d '[:space:]' < "$file" || true
}

port_is_busy() {
  local port="$1"
  ss -ltn "sport = :$port" | awk 'NR > 1 { found = 1 } END { exit !found }'
}

show_port_owner() {
  local port="$1"
  ss -ltnp "sport = :$port" || true
}

check_ports_free() {
  local service="$1"
  local port

  for port in $(service_ports "$service"); do
    if port_is_busy "$port"; then
      echo "Port $port is already in use; refusing to start $service." >&2
      show_port_owner "$port" >&2
      return 1
    fi
  done
}

start_service() {
  local service="$1"
  local file dir log pid

  file="$(pid_file "$service")"
  dir="$(service_dir "$service")"
  log="$(service_log "$service")"
  pid="$(read_pid "$file")"

  if is_running "$pid"; then
    echo "$service is already running (pid $pid)."
    return 0
  fi

  if [[ -f "$file" ]]; then
    rm -f "$file"
  fi

  if [[ ! -d "$dir" ]]; then
    echo "Directory does not exist for $service: $dir" >&2
    return 1
  fi

  check_ports_free "$service"

  echo "Starting $service..."
  (
    cd "$dir"
    nohup setsid npm run dev >> "$log" 2>&1 &
    echo $! > "$file"
  )

  sleep 2
  pid="$(read_pid "$file")"
  if is_running "$pid"; then
    echo "$service started (pid $pid). URL: $(service_url "$service")"
    echo "Log: $log"
  else
    echo "$service failed to stay running. Check log: $log" >&2
    return 1
  fi
}

stop_service() {
  local service="$1"
  local file pid

  file="$(pid_file "$service")"
  pid="$(read_pid "$file")"

  if ! is_running "$pid"; then
    echo "$service is not running."
    rm -f "$file"
    return 0
  fi

  echo "Stopping $service (pid $pid)..."
  kill "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! is_running "$pid"; then
      rm -f "$file"
      echo "$service stopped."
      return 0
    fi
    sleep 0.5
  done

  echo "$service did not stop gracefully; sending SIGKILL."
  kill -9 "-$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
  rm -f "$file"
  echo "$service stopped."
}

status_service() {
  local service="$1"
  local file pid port

  file="$(pid_file "$service")"
  pid="$(read_pid "$file")"

  if is_running "$pid"; then
    echo "$service: running (pid $pid), URL: $(service_url "$service")"
  else
    echo "$service: not running"
  fi

  for port in $(service_ports "$service"); do
    if port_is_busy "$port"; then
      echo "  port $port: listening"
    else
      echo "  port $port: free"
    fi
  done
}

services_for() {
  case "${1:-all}" in
    all) echo "skillcenter prompt-vault" ;;
    skillcenter|prompt-vault) echo "$1" ;;
    *) echo "Unknown service target: $1" >&2; exit 2 ;;
  esac
}

main() {
  local action="${1:-}"
  local target="${2:-all}"
  local service

  case "$action" in
    start)
      for service in $(services_for "$target"); do
        start_service "$service"
      done
      ;;
    stop)
      for service in $(services_for "$target"); do
        stop_service "$service"
      done
      ;;
    restart)
      for service in $(services_for "$target"); do
        stop_service "$service"
        start_service "$service"
      done
      ;;
    status)
      for service in $(services_for "$target"); do
        status_service "$service"
      done
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"
