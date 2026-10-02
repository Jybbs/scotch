run_prose() {
  uv run --exact --locked prose "$@" .mise/tasks src tests
}
