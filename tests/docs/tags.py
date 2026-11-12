"""
Pins the tables and figures `Tags` writes for the Tags page, meaning each
tag's share and the decade carrying it least, and each decade's dates and
ratings, beside the share `Tagged` reads for one tag.
"""

from pytest import fixture

from scotch.docs.tags import Gap, Held, Tagged, Tags


def tagged(
    both  : int,
    day   : int,
    games : int,
    name  : str,
    round : int
) -> Tagged:
    """
    Builds the count of a group of `games` games, each carrying an `Event`
    tag, `round` of them carrying a `Round` tag, `day` dated to the day, and
    `both` carrying both ratings.
    """
    return Tagged(
        dates = {
            "day"   : day,
            "month" : 0,
            "none"  : games - day,
            "year"  : 0
        },
        games   = games,
        name    = name,
        ratings = {"both": both, "neither": games - both, "one": 0},
        tags    = {"Event": games, "Round": round}
    )


@fixture
def tags() -> Tags:
    """
    Builds the tags of two decades, the earlier carrying fewer `Round` tags
    and both carrying every `Event` tag, beside the earlier decade's gap.
    """
    return Tags(
        decades = [
            tagged(
                both  = 0,
                day   = 2,
                games = 4,
                name  = "1970s",
                round = 1
            ),
            tagged(
                both  = 4,
                day   = 8,
                games = 16,
                name  = "1980s",
                round = 12
            )
        ],
        every = tagged(
            both  = 4,
            day   = 10,
            games = 20,
            name  = "Every game",
            round = 13
        ),
        gaps = [
            Gap(
                decade  = "1970s",
                files   = [Held(count=3, path="players/Alekhine.zip")],
                missing = 3,
                tag     = "Round"
            )
        ],
        names = ["Round", "Event"]
    )


def test_a_group_holding_no_games_shares_nothing():
    """
    Asserts that a group holding no games reads a share of 0 rather than
    dividing by zero.
    """
    assert tagged(
        both  = 0,
        day   = 0,
        games = 0,
        name  = "1900s",
        round = 0
    ).share("Round") == 0


def test_tags_write_their_figures_and_tables(tags: Tags):
    """
    Asserts that the figures read every stored game's shares, that the
    carried tables name the decade carrying a tag least, a dash where every
    decade carries it alike, and the files behind each gap, and that the
    dated table lists each decade's shares.
    """
    assert tags.figures == {
        "tags-both"    : "20%",
        "tags-day"     : "50%",
        "tags-neither" : "80%",
        "tags-round"   : "65%"
    }
    carried, gaps = tags.carried.split("\n\n")

    assert carried.splitlines()[2:] == [
        "| `Round` | 65.0% | 1970s | 25.0% |", "| `Event` | 100.0% | – | – |"
    ]
    assert gaps.splitlines()[2:] == [
        "| `Round` | 1970s | 3 | players/Alekhine.zip (3) |"
    ]
    assert tags.dated.splitlines()[2:] == [
        "| 1970s | 4 | 50.0% | 0.0% |", "| 1980s | 16 | 50.0% | 25.0% |"
    ]


def test_the_earliest_of_the_decades_tied_carries_a_tag_least(tags: Tags):
    """
    Asserts that of two decades tied for the smallest share of a tag, the
    earlier one carries it least.
    """
    tied = tags.model_copy(
        update = {
            "decades": [
                *tags.decades,
                tags.decades[0].model_copy(update={"name": "1990s"})
            ]
        }
    )

    assert tied.least("Round") == tags.decades[0]
