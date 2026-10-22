"""Published values and row counts the build must reproduce, or stop (NFR-51, §4.6, DR-9).

Every check returns problems as strings; an empty list means the check passed. Messages carry
aggregates and published numbers only.
"""

from collections.abc import Sequence
from dataclasses import dataclass

import numpy as np

from pipeline import cells, raw
from pipeline.cells import CellStats
from pipeline.change import Change
from pipeline.ratings import CHANGE_BEHAVIORS
from pipeline.reference import Published

# §4.6 and DR-9, All data.
SOCIETY_CELLS = 13_468
SOCIETY_CELLS_BELOW_10 = 376
CONTEXT_ROWS = 6_735
CHANGE_ROWS = {"all": 3_119, "paper": 2_639, "attention": 3_119}
CHANGE_SOCIETIES = {"all": 26, "paper": 22, "attention": 26}
# Behaviors the Kuwait and Saudi Arabia surveys left out (decision 8; paper, Methods).
NOT_ASKED = {"KWT": ("kiss", "flirt"), "SAU": ("kiss",)}


@dataclass(frozen=True)
class Table1Check:
    behavior: str
    mean: float
    sd: float
    increased: int
    societies: int


def table1(ch: Change) -> list[Table1Check]:
    return [
        Table1Check(
            behavior=b,
            mean=float(ch.behavior_mean[i]),
            sd=float(ch.behavior_sd[i]),
            increased=int(ch.behavior_increased[i]),
            societies=int(ch.behavior_n_societies[i]),
        )
        for i, b in enumerate(CHANGE_BEHAVIORS)
    ]


def published_values(paper_stats: CellStats, paper_change: Change, pub: Published) -> list[str]:
    """Table 1 within the tolerance (counts exact) and the Fig. 2 and Fig. 3 captions."""
    problems = []
    computed = {row.behavior: row for row in table1(paper_change)}
    for row in pub.table1:
        got = computed[row.behavior]
        expected_increased = round(row.increased * pub.table1_societies / 100)
        if got.societies != pub.table1_societies:
            problems.append(
                f"Table 1 {row.behavior}: {got.societies} societies, "
                f"published {pub.table1_societies}"
            )
        if abs(got.mean - row.mean) > pub.tolerance:
            problems.append(
                f"Table 1 {row.behavior}: mean change {got.mean:.3f}, published {row.mean:.2f}"
            )
        if abs(got.sd - row.sd) > pub.tolerance:
            problems.append(f"Table 1 {row.behavior}: SD {got.sd:.3f}, published {row.sd:.2f}")
        if got.increased != expected_increased:
            problems.append(
                f"Table 1 {row.behavior}: {got.increased} societies increased, "
                f"published {row.increased}% = {expected_increased}"
            )
    present = paper_stats.n[paper_stats.n > 0]
    if round(float(present.mean()), 1) != pub.cell_n_mean:
        problems.append(f"Fig. 2: mean cell n {present.mean():.2f}, published {pub.cell_n_mean}")
    if (int(present.min()), int(present.max())) != (pub.cell_n_min, pub.cell_n_max):
        problems.append(
            f"Fig. 2: cell n {present.min()}–{present.max()}, "
            f"published {pub.cell_n_min}–{pub.cell_n_max}"
        )
    societies = int((paper_stats.n.sum(axis=1) > 0).sum())
    if societies != pub.fig3_societies:
        problems.append(f"Fig. 3: {societies} societies, published {pub.fig3_societies}")
    return problems


def row_counts(
    all_stats: CellStats,
    all_contexts_n: np.ndarray,
    changes: dict[str, Change],
) -> list[str]:
    """The §4.6 row counts and DR-9's count of small society–cells."""
    problems = []
    found = {
        "society–cells with ratings (All data)": (int((all_stats.n > 0).sum()), SOCIETY_CELLS),
        "society–cells below 10 (All data)": (
            int(((all_stats.n > 0) & (all_stats.n < cells.MIN_N)).sum()),
            SOCIETY_CELLS_BELOW_10,
        ),
        "context rows with ratings (All data)": (int((all_contexts_n > 0).sum()), CONTEXT_ROWS),
        "cells per society": (all_stats.n.shape[1], 150),
    }
    for sample, ch in changes.items():
        rows = int(((ch.n0 > 0) & (ch.n1 > 0)).sum())
        found[f"change rows ({sample})"] = (rows, CHANGE_ROWS[sample])
        found[f"change societies ({sample})"] = (len(ch.societies), CHANGE_SOCIETIES[sample])
    for label, (got, expected) in found.items():
        if got != expected:
            problems.append(f"{label}: {got:,}, expected {expected:,}")
    return problems


def not_asked(status: np.ndarray, societies: Sequence[str], width: int, label: str) -> list[str]:
    """Not-asked cells must be exactly the behaviors left out of two surveys (decision 8)."""
    found: dict[str, tuple[str, ...]] = {}
    behaviors = status.reshape(len(societies), len(raw.BEHAVIORS), width)
    for s, code in enumerate(societies):
        absent = tuple(
            b for i, b in enumerate(raw.BEHAVIORS) if (behaviors[s, i] == cells.NOT_ASKED).all()
        )
        if absent:
            found[code] = absent
    expected = {c: tuple(sorted(b)) for c, b in NOT_ASKED.items() if c in societies}
    got = {c: tuple(sorted(b)) for c, b in found.items()}
    return [] if got == expected else [f"{label}: not-asked cells {got}, expected {expected}"]
