each_script() {
  local script
  for script in $(grep -lrsx '# /// script' .mise/tasks || true); do
    "$@" --script "$script"
  done
}
