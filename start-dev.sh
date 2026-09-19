#!/usr/bin/env bash
# start-dev.sh — Khởi động toàn bộ Novel Platform trong tmux

set -e

PGINSTALL="$HOME/workspace/novel-platform/backend/.venv/lib/python3.12/site-packages/embedded_postgres/pginstall/bin"
PGDATA="$HOME/.local/novel-pgdata"
REDIS="$HOME/bin/redis-server"
PROJECT="$HOME/workspace/novel-platform"

echo "🚀 Novel Platform Dev Launcher"
echo "================================"

# ── Giết session cũ nếu có ──────────────────────────
tmux kill-session -t novel 2>/dev/null || true

# ── Kiểm tra PostgreSQL ──────────────────────────────
if ! $PGINSTALL/pg_ctl -D $PGDATA status 2>&1 | grep -q "server is running"; then
    echo "📦 Khởi động PostgreSQL..."
    $PGINSTALL/pg_ctl -D $PGDATA -l $HOME/.local/novel-pg.log start
    sleep 2
fi
echo "✅ PostgreSQL running"

# ── Tạo session tmux 4 panes ────────────────────────
# Layout:
# ┌─────────────┬──────────────┐
# │  [0] Redis  │  [1] Backend │
# ├─────────────┼──────────────┤
# │  [2] Frnt   │  [3] Logs    │
# └─────────────┴──────────────┘

tmux new-session -d -s novel -x 220 -y 55 -n "Novel Platform"

# Split layout
tmux split-window -h -t novel:0
tmux split-window -v -t novel:0.0
tmux split-window -v -t novel:0.1

# Pane 0 (top-left): Redis
tmux send-keys -t novel:0.0 "echo '🔴 Redis Server' && $REDIS --port 6379 --loglevel notice" Enter

# Pane 1 (bottom-left): Frontend
tmux send-keys -t novel:0.2 "cd $PROJECT/frontend && echo '⚛️  Frontend Vite' && npm run dev" Enter

# Pane 2 (top-right): Backend
tmux send-keys -t novel:0.1 "cd $PROJECT/backend && echo '🐍 FastAPI Backend' && uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0" Enter

# Pane 3 (bottom-right): Logs / Shell
tmux send-keys -t novel:0.3 "echo '📋 Logs / Shell — novel-platform' && tail -f $HOME/.local/novel-pg.log" Enter

echo ""
echo "✅ Tất cả đã khởi động trong tmux session 'novel'"
echo ""
echo "   tmux attach -t novel     → Xem màn hình"
echo "   Ctrl+B + arrow           → Di chuyển giữa panes"
echo "   Ctrl+B + d               → Detach (để app chạy nền)"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/api/docs"
