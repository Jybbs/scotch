/// Names the position `fen` sets up.
pub fn named(fen: &str) -> Result<(), String> {
    Err(format!("names no position: {fen}"))
}
