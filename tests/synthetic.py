"""Synthetic stand-ins for the OSF files, with the columns the pipeline reads.

Respondent IDs carry a SENTINEL prefix so tests can assert that no ID reaches any output.
"""

import csv
from dataclasses import dataclass
from pathlib import Path

from pipeline import raw

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
    "site", "country", "iso2", "StartDate", "ResponseId", "gender", *raw.IND_BIND_ITEMS,
    "rating", "behavior", "situation", "att_check_commit", "code", "region",
)  # fmt: skip


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
                        p.gender or NA,
                        *items,
                        rating,
                        raw.BEHAVIORS[i % len(raw.BEHAVIORS)],
                        raw.SITUATIONS_IDS[i % len(raw.SITUATIONS_IDS)],
                        p.att,
                        p.code,
                        p.region,
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
