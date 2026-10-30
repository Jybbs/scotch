//! Holds a game's tag pairs as python-chess's `Headers` keeps them, the tag
//! line its reader takes them from, and the variant a `Variant` tag names.

use crate::lines::is_space;

/// The Seven Tag Roster in the order the PGN standard, section 8.1.1, lists
/// it, beside the placeholder python-chess fills each tag with until a file
/// sets it.
const ROSTER: [(&str, &str); 7] = [
    ("Event", "?"),
    ("Site", "?"),
    ("Date", "????.??.??"),
    ("Round", "?"),
    ("White", "?"),
    ("Black", "?"),
    ("Result", "*"),
];

/// The names python-chess 1.11.2 reads a `Variant` tag under, the first
/// list naming standard chess and each further list a variant it reads
/// under rules of their own.
const VARIANTS: [&[&str]; 10] = [
    &[
        "Standard",
        "Chess",
        "Classical",
        "Normal",
        "Illegal",
        "From Position",
    ],
    &["Suicide", "Suicide chess"],
    &["Giveaway", "Giveaway chess", "Give away", "Give away chess"],
    &["Antichess", "Anti chess", "Anti"],
    &["Atomic", "Atom", "Atomic chess"],
    &["King of the Hill", "KOTH", "kingOfTheHill"],
    &["Racing Kings", "Racing", "Race", "racingkings"],
    &["Horde", "Horde chess"],
    &[
        "Three-check",
        "Three check",
        "Threecheck",
        "Three check chess",
        "3-check",
        "3 check",
        "3check",
    ],
    &["Crazyhouse", "Crazy House", "House", "ZH"],
];

/// The rules a game's moves are read under, as its `Variant` tag names them.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Rules {
    /// Standard chess, for a game naming no variant, standard chess, or one
    /// of the `wild` variants python-chess reads as standard chess.
    Standard,
    /// Chess960, whose castling moves the king onto the rook's square.
    Chess960,
    /// A variant python-chess reads under rules of its own, whose moves the
    /// crate leaves unread.
    Variant,
}

impl Rules {
    /// Reads the rules the variant `name` names, or the error python-chess's
    /// reader records for a name it reads no rules under, as it reads a
    /// `Variant` tag through `Headers.variant` and
    /// `chess.variant.find_variant`, where no name names standard chess.
    pub fn named(name: Option<&str>) -> Result<Rules, String> {
        let Some(name) = name else {
            return Ok(Rules::Standard);
        };
        let folded = name.to_lowercase();

        if [
            "chess960",
            "chess 960",
            "fischerandom",
            "fischerrandom",
            "fischer random",
        ]
        .contains(&folded.as_str())
        {
            return Ok(Rules::Chess960);
        }

        if folded
            .strip_prefix("wild/")
            .is_some_and(|wild| ["0", "1", "2", "3", "4", "5", "6", "7", "8", "8a"].contains(&wild))
        {
            return Ok(Rules::Standard);
        }

        match VARIANTS
            .iter()
            .position(|aliases| aliases.iter().any(|alias| alias.to_lowercase() == folded))
        {
            Some(0) => Ok(Rules::Standard),
            Some(_) => Ok(Rules::Variant),
            None => Err(format!("unsupported variant: {name}")),
        }
    }
}

/// The tag pairs of one game, the Seven Tag Roster first and every other
/// tag after it in the order the file first sets it.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Tags {
    roster: [String; 7],
    others: Vec<(String, String)>,
}

impl Default for Tags {
    fn default() -> Self {
        Tags {
            roster: ROSTER.map(|(_, placeholder)| placeholder.to_owned()),
            others: Vec::new(),
        }
    }
}

impl Tags {
    /// Reads the value of the tag `name`, or `None` where the game sets no
    /// such tag.
    pub fn get(&self, name: &str) -> Option<&str> {
        match ROSTER.iter().position(|(roster, _)| *roster == name) {
            Some(at) => Some(&self.roster[at]),
            None => self
                .others
                .iter()
                .find(|(other, _)| other == name)
                .map(|(_, value)| value.as_str()),
        }
    }

    /// Sets the tag `name` to `value`, keeping the place a tag set earlier
    /// holds.
    pub fn set(&mut self, name: &str, value: &str) {
        if let Some(at) = ROSTER.iter().position(|(roster, _)| *roster == name) {
            value.clone_into(&mut self.roster[at]);
        } else if let Some((_, held)) = self.others.iter_mut().find(|(other, _)| other == name) {
            value.clone_into(held);
        } else {
            self.others.push((name.to_owned(), value.to_owned()));
        }
    }

    /// Reads the tag line `line` as python-chess's reader matches it against
    /// `^\[([A-Za-z0-9][A-Za-z0-9_+#=:-]*)\s+"([^\r]*)"\]\s*$`, returning the
    /// tag's name and its value, which runs to the last `"]` that only
    /// whitespace follows.
    pub fn parse(line: &str) -> Option<(&str, &str)> {
        let rest = line.strip_prefix('[')?;
        let named = rest
            .find(|c: char| !(c.is_ascii_alphanumeric() || "_+#=:-".contains(c)))
            .unwrap_or(rest.len());
        let (name, rest) = rest.split_at(named);
        let spaced = rest.trim_start_matches(is_space);

        if !name.starts_with(|c: char| c.is_ascii_alphanumeric()) || spaced.len() == rest.len() {
            return None;
        }

        let value = spaced.strip_prefix('"')?;
        let close = value
            .rmatch_indices("\"]")
            .map(|(at, _)| at)
            .find(|&at| value[at + 2..].chars().all(is_space))?;

        Some((name, &value[..close]))
    }

    /// Reads the rules the `Variant` tag names, as `Rules::named` reads
    /// them.
    pub fn rules(&self) -> Result<Rules, String> {
        Rules::named(self.get("Variant"))
    }

    /// Lists every tag pair, the Seven Tag Roster first in its own order.
    pub fn pairs(self) -> Vec<(String, String)> {
        ROSTER
            .iter()
            .map(|(name, _)| (*name).to_owned())
            .zip(self.roster)
            .chain(self.others)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_tag_line_reads_its_name_and_value() {
        assert_eq!(
            Tags::parse("[Event \"Linares\"]\n"),
            Some(("Event", "Linares"))
        );
        assert_eq!(
            Tags::parse("[White  \"Tal\"]  \r\n"),
            Some(("White", "Tal"))
        );
        assert_eq!(Tags::parse("[Site \"a\"] b\"]\n"), Some(("Site", "a\"] b")));
    }

    #[test]
    fn a_malformed_tag_line_reads_as_none() {
        for line in [
            "[Event\"x\"]\n",
            "[_x \"y\"]\n",
            " [Event \"x\"]\n",
            "[Event \"x\"] y\n",
        ] {
            assert_eq!(Tags::parse(line), None, "{line:?}");
        }
    }

    #[test]
    fn a_later_tag_keeps_the_place_of_an_earlier_one() {
        let mut tags = Tags::default();
        tags.set("Opening", "Sicilian");
        tags.set("ECO", "B20");
        tags.set("Opening", "French");
        tags.set("White", "Tal");

        let pairs = tags.pairs();

        assert_eq!(pairs[4], ("White".to_owned(), "Tal".to_owned()));
        assert_eq!(
            &pairs[7..],
            [
                ("Opening".to_owned(), "French".to_owned()),
                ("ECO".to_owned(), "B20".to_owned())
            ]
        );
    }

    #[test]
    fn a_variant_tag_names_the_rules() {
        let rules = |name: &str| {
            let mut tags = Tags::default();
            tags.set("Variant", name);
            tags.rules()
        };

        assert_eq!(Tags::default().rules(), Ok(Rules::Standard));
        assert_eq!(Rules::named(None), Ok(Rules::Standard));
        assert_eq!(rules("from position"), Ok(Rules::Standard));
        assert_eq!(rules("wild/8a"), Ok(Rules::Standard));
        assert_eq!(rules("Fischer Random"), Ok(Rules::Chess960));
        assert_eq!(rules("koth"), Ok(Rules::Variant));
        assert_eq!(
            rules("Bughouse"),
            Err("unsupported variant: Bughouse".to_owned())
        );
    }
}
