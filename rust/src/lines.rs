//! Splits PGN text into lines as Python's universal newlines read them, and
//! tells a blank line apart as Python's `str.isspace` does.

/// Reports whether `c` is one of the characters Python's `str.isspace`
/// counts as whitespace, which beside the Unicode `White_Space` property
/// takes the four separators from `\x1c` to `\x1f`.
pub fn is_space(c: char) -> bool {
    c.is_whitespace() || ('\x1c'..='\x1f').contains(&c)
}

/// Reports whether `line` holds at least one character and only whitespace,
/// as Python's `str.isspace` does, so an empty `line` marks the end of the
/// text rather than a blank line.
pub fn is_blank(line: &str) -> bool {
    !line.is_empty() && line.chars().all(is_space)
}

/// The lines of a text, each read with its terminator, where `\n`, `\r\n`,
/// and a lone `\r` each end a line.
pub struct Lines<'a> {
    rest: &'a str,
}

impl<'a> Lines<'a> {
    /// Starts reading `text` at its first line.
    pub fn new(text: &'a str) -> Self {
        Lines { rest: text }
    }

    /// Counts the bytes of the text left to read.
    pub fn remaining(&self) -> usize {
        self.rest.len()
    }

    /// Reads the next line with its terminator, or an empty line once the
    /// text is spent, as Python's `readline` does.
    pub fn next_line(&mut self) -> &'a str {
        let end = match self.rest.find(['\n', '\r']) {
            Some(at) if self.rest[at..].starts_with("\r\n") => at + 2,
            Some(at) => at + 1,
            None => self.rest.len(),
        };
        let (line, rest) = self.rest.split_at(end);
        self.rest = rest;
        line
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_terminator_ends_a_line() {
        let mut lines = Lines::new("a\nb\r\nc\rd");

        let read: Vec<&str> = (0..5).map(|_| lines.next_line()).collect();

        assert_eq!(read, ["a\n", "b\r\n", "c\r", "d", ""]);
    }

    #[test]
    fn a_blank_line_holds_whitespace_alone() {
        assert!(is_blank("\n"));
        assert!(is_blank(" \t\x1c\r\n"));
        assert!(!is_blank(""));
        assert!(!is_blank(" 1. e4\n"));
    }
}
