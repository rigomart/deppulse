#!/usr/bin/env bash
set -euo pipefail

# Run this inside a worktree.
main_root="$(cd "$(git rev-parse --git-common-dir)"/.. && pwd)"
target_root="$(git rev-parse --show-toplevel)"

if [[ "$target_root" == "$main_root" ]]; then
  echo "Already in main worktree; nothing to link."
  exit 0
fi

link_file() {
  local name="$1"
  local src="$main_root/$name"
  local dest="$target_root/$name"

  [[ -f "$src" ]] || return 0
  if [[ -e "$dest" ]]; then
    echo "Skip $name: already exists at $dest"
    return 0
  fi

  ln -s "$src" "$dest"
  echo "Linked $name -> $src"
}

link_file ".env.local"
link_file ".env"
