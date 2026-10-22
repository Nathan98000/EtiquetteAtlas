"""Synthetic stand-ins for the OSF files, with the columns the pipeline reads.

Respondent IDs carry a SENTINEL prefix so tests can assert that no ID reaches any output.
"""

import csv
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from pipeline import raw
from pipeline.ratings import RatingSet

SENTINEL = "SENTINEL"
NA = "NA"


@dataclass(frozen=True)
class Person:
    rid: str
    code: str
    country: str
    region: str
    start: str  # ISO-8601 UTC, as Qualtrics writes it
    att: int = 1
    gender: str | None = "Woman"
    items_missing: bool = False
    ratings: tuple[str, ...] = ("4",)  # one row per entry; "NA" is a missing rating
    iso2: str = "XX"
    student: str = "yes"  # "yes", "no" or NA
    language: str = "EN"


def person(name: str, code: str, country: str, region: str, start: str, **kw: object) -> Person:
    return Person(f"{SENTINEL}-{name}", code, country, region, start, **kw)  # type: ignore[arg-type]


# Expected memberships are spelled out in test_samples.py.
PEOPLE = (
    # Namibia's ISO2 is the literal "NA", which R also writes for missing values.
    person("nam", "NAM", "Namibia", "Africa", "2024-04-10T10:00:00Z", ratings=("5", NA), iso2=NA),
    person("xkx", "XKX", "Kosovo", "West", "2024-03-05T08:00:00Z", ratings=("3",), iso2=NA),
    person("kwt", "KWT", "Kuwait", "Asia", "2024-01-15T12:00:00Z", ratings=("2", "2")),
    # Exactly at the paper's cutoff (inclusive), and one second after it.
    person(
        "cut",
        "USA",
        "United States",
        "West",
        "2024-02-29T23:00:00Z",
        att=0,
        ratings=("1", "6", "4"),
    ),
    person("late", "USA", "United States", "West", "2024-02-29T23:00:01Z"),
    person(
        "item",
        "DEU",
        "Germany",
        "West",
        "2023-10-01T09:00:00Z",
        items_missing=True,
        ratings=("5", "5"),
    ),
    person("none", "DEU", "Germany", "West", "2023-10-02T09:00:00Z", ratings=(NA, NA)),
    person(
        "tto",
        "TTO",
        "Caribbean",
        "Latin America",
        "2023-09-01T09:00:00Z",
        gender=None,
        ratings=("6",),
    ),
)

SITUATION_COLUMNS = (
    "site", "country", "iso2", "StartDate", "ResponseId", "UserLanguage", "gender", "student",
    *raw.IND_BIND_ITEMS, "rating", "behavior", "situation", "att_check_commit", "code", "region",
    "Longitude_average", "Latitude_average",
)  # fmt: skip

# Society-level map positions; Kosovo has none in the GSN files.
PLACES = {"XKX": (NA, NA)}


def place(code: str) -> tuple[str, str]:
    """A made-up but stable (lon, lat) for a code, as the GSN files store whole degrees."""
    if code in PLACES:
        return PLACES[code]
    return str(sum(map(ord, code)) % 180 - 90), str(sum(map(ord, code)) % 120 - 60)


def write_situations(raw_dir: Path, people: tuple[Person, ...] = PEOPLE) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    with (raw_dir / raw.SITUATIONS).open("w", newline="") as f:
        out = csv.writer(f)
        out.writerow(SITUATION_COLUMNS)
        for p in people:
            items = [NA if p.items_missing and i == 0 else "3" for i in range(9)]
            for i, rating in enumerate(p.ratings):
                out.writerow(
                    [
                        f"{p.country}_SiteA",
                        p.country,
                        p.iso2,
                        p.start,
                        p.rid,
                        p.language,
                        p.gender or NA,
                        p.student,
                        *items,
                        rating,
                        raw.BEHAVIORS[i % len(raw.BEHAVIORS)],
                        raw.SITUATIONS_IDS[i % len(raw.SITUATIONS_IDS)],
                        p.att,
                        p.code,
                        p.region,
                        *place(p.code),
                    ]
                )


def write_id_list(raw_dir: Path, file: str, rids: list[str]) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    with (raw_dir / file).open("w", newline="") as f:
        out = csv.writer(f)
        out.writerow(["country", "ResponseId", "age_sc"])
        out.writerows(["Somewhere", rid, "0.1"] for rid in rids)


def rid(name: str) -> str:
    return f"{SENTINEL}-{name}"


PREREG_IDS = [rid("cut")]
ATTENTION_IDS = [rid(n) for n in ("xkx", "kwt", "late", "item", "tto")]


def write_all(raw_dir: Path) -> Path:
    write_situations(raw_dir)
    write_id_list(raw_dir, raw.PREREG_LIST, PREREG_IDS)
    write_id_list(raw_dir, raw.ATTENTION_LIST, ATTENTION_IDS)
    return raw_dir


def rating_set(
    societies: tuple[str, ...], cells: int, rows: Sequence[tuple[int, ...]]
) -> RatingSet:
    """A RatingSet from (society, respondent, cell, value[, group]) rows, for estimator tests."""
    a = np.array([(*r, 0)[:5] for r in rows], dtype=np.int64).reshape(-1, 5)
    respondents = np.zeros(len(societies), dtype=np.int64)
    np.maximum.at(respondents, a[:, 0], a[:, 1] + 1)
    return RatingSet(societies, cells, respondents, a[:, 0], a[:, 1], a[:, 2], a[:, 3], a[:, 4])


# A small full-grid population for end-to-end builds: (code, country, region, respondents,
# start, att_check_commit). Kuwait's survey has no kiss or flirt items, as in the real data.
POPULATION = (
    ("CHL", "Chile", "Latin America", 30, "2023-11-0{d}T10:00:00Z", 1),
    ("JPN", "Japan", "Asia", 24, "2023-12-1{d}T10:00:00Z", 1),
    ("KWT", "Kuwait", "Asia", 14, "2024-02-0{d}T10:00:00Z", 1),
)
GELFAND_KEYS = {"Chile": 15, "Japan": 12}
LEFT_OUT = {"KWT": {"kiss", "flirt"}}


def _value(*parts: int) -> int:
    return sum((i + 3) * p for i, p in enumerate(parts)) % 6 + 1


def write_population(raw_dir: Path) -> Path:
    """Main, contexts and 2000–2003 files for POPULATION; respondent IDs carry SENTINEL."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    with (raw_dir / raw.SITUATIONS).open("w", newline="") as f:
        out = csv.writer(f)
        out.writerow(SITUATION_COLUMNS)
        for s, (code, country, region, n, start, att) in enumerate(POPULATION):
            for r in range(n):
                gender = ("Woman", "Man", "Other")[r % 3] if r % 7 else NA
                for b, behavior in enumerate(raw.BEHAVIORS):
                    if behavior in LEFT_OUT.get(code, ()):
                        continue
                    for c, situation in enumerate(raw.SITUATIONS_IDS):
                        out.writerow([
                            f"{country}_SiteA", country, "XX", start.format(d=r % 9 + 1),
                            rid(f"{code}-{r}"), "EN" if r % 4 else "ES", gender,
                            "yes" if r % 2 else "no", *["3"] * 9, _value(s, r, b, c),
                            behavior, situation, att, code, region, *place(code),
                        ])  # fmt: skip
    with (raw_dir / raw.CONTEXTS).open("w", newline="") as f:
        out = csv.writer(f)
        out.writerow(["ResponseId", "country", "behavior", "context", "rating"])
        for s, (code, country, _, n, _, _) in enumerate(POPULATION):
            for r in range(n):
                for b, behavior in enumerate(raw.BEHAVIORS):
                    if behavior in LEFT_OUT.get(code, ()):
                        continue
                    for c, context in enumerate(raw.CONTEXT_IDS):
                        out.writerow([rid(f"{code}-{r}"), country, behavior, context,
                                      _value(s, r, b, c + 1)])  # fmt: skip
        out.writerow([rid("contexts-only"), "Chile", "argue", "alone", 4])
    with (raw_dir / raw.GELFAND).open("w", newline="") as f:
        out = csv.writer(f)
        out.writerow(["country", "ResponseId", "age", "woman", "rating", "behavior", "situation"])
        for s, (country, keys) in enumerate(GELFAND_KEYS.items()):
            for k in range(1, keys + 1):
                for b, behavior in enumerate(raw.BEHAVIORS[:12]):
                    for c, situation in enumerate(raw.SITUATIONS_IDS):
                        if (country, behavior, situation) == ("Japan", "laugh", "party"):
                            continue
                        rating = _value(s, k, c, b) - 3.5
                        out.writerow([country, k, 30, k % 2, rating, behavior, situation])
    return raw_dir
