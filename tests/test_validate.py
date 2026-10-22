"""NFR-51, §4.6 and decision 8: the build's published-value and row-count checks."""

import numpy as np
import synthetic

from pipeline import bootstrap, cells, change, ratings, raw, reference, validate
from pipeline.reference import Published, Table1Row

CELLS = ratings.CHANGE_CELLS


def two_societies() -> tuple[cells.CellStats, change.Change]:
    old_rows = [(s, r, c, 3) for s in (0, 1) for r in range(10) for c in range(CELLS)]
    old = synthetic.rating_set(("A", "B"), CELLS, old_rows)
    rows = [(0, r, c, 4) for r in range(12) for c in range(CELLS)]
    rows += [(1, r, c, 3) for r in range(10) for c in range(CELLS)]
    new = synthetic.rating_set(("A", "B"), ratings.SITUATION_CELLS, rows)
    stats = cells.summarize(new)
    reps = bootstrap.resample(new, ("cells", "t"), 20)
    return stats, change.compare(old, stats, reps, new.societies, 20)


def published(mean: float, sd: float, increased: float, n_mean: float = 11.0) -> Published:
    rows = tuple(Table1Row(b, mean, sd, increased) for b in ratings.CHANGE_BEHAVIORS)
    return Published(0.02, "paper", 2, rows, "paper", n_mean, 10, 12, "paper", 2)


def test_nfr51_matching_values_pass() -> None:
    stats, ch = two_societies()
    sd = float(np.std([1.0, 0.0], ddof=1))
    assert validate.published_values(stats, ch, published(0.5, sd, 50.0)) == []


def test_nfr51_values_outside_the_tolerance_fail() -> None:
    stats, ch = two_societies()
    sd = float(np.std([1.0, 0.0], ddof=1))
    problems = validate.published_values(stats, ch, published(0.53, sd, 100.0, n_mean=11.5))
    assert "Table 1 argue: mean change 0.500, published 0.53" in problems
    assert "Table 1 argue: 1 societies increased, published 100.0% = 2" in problems
    assert "Fig. 2: mean cell n 11.00, published 11.5" in problems
    assert len(problems) == 2 * 12 + 1


def test_nfr51_the_published_file_matches_the_check_inputs() -> None:
    pub = reference.load_published()
    assert (pub.table1_sample, pub.fig2_sample, pub.fig3_sample) == ("paper",) * 3
    assert pub.tolerance == 0.02


def test_section_4_6_row_counts_report_mismatches() -> None:
    stats, ch = two_societies()
    problems = validate.row_counts(stats, np.ones((2, 75)), {"paper": ch})
    assert "society–cells with ratings (All data): 240, expected 13,468" in problems
    assert "change rows (paper): 240, expected 2,639" in problems
    assert "change societies (paper): 2, expected 22" in problems


def test_decision8_not_asked_cells_must_be_the_known_ones() -> None:
    n = np.full((2, 150), 40)
    n[0, 30:40] = 0  # KWT: kiss (behavior 3)
    n[0, 70:80] = 0  # KWT: flirt (behavior 7)
    status = cells.status(n, len(raw.BEHAVIORS))
    assert validate.not_asked(status, ["KWT", "USA"], 10, "cells") == []
    n[1, 0:10] = 0  # USA: argue, unexpected
    status = cells.status(n, len(raw.BEHAVIORS))
    assert validate.not_asked(status, ["KWT", "USA"], 10, "cells") == [
        "cells: not-asked cells {'KWT': ('flirt', 'kiss'), 'USA': ('argue',)}, "
        "expected {'KWT': ('flirt', 'kiss')}"
    ]
