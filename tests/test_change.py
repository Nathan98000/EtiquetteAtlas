"""DR-13 and C-6: GSN against the 2000–2003 survey, from society–cell aggregates."""

import numpy as np
import pytest
import synthetic

from pipeline import bootstrap, cells, change, ratings
from pipeline.ratings import RatingSet

CELLS = ratings.CHANGE_CELLS  # 120 shared cells: behavior b, situation s -> b * 10 + s


def wave(societies: tuple[str, ...], values: dict[tuple[int, int], int], per: int) -> RatingSet:
    rows = [(s, r, c, v) for (s, c), v in values.items() for r in range(per)]
    return synthetic.rating_set(societies, CELLS, rows)


def compare(old: RatingSet, new: RatingSet, replicates: int = 100) -> change.Change:
    stats = cells.summarize(new)
    reps = bootstrap.resample(new, ("cells", "test"), replicates)
    return change.compare(old, stats, reps, new.societies, replicates)


def full(society: int, value: int) -> dict[tuple[int, int], int]:
    return {(society, c): value for c in range(CELLS)}


def test_dr13_differences_by_society_cell_and_globally() -> None:
    old = wave(("AAA", "BBB"), full(0, 3) | full(1, 4), per=12)
    new = wave(("AAA", "BBB", "CCC"), full(0, 4) | full(1, 4) | full(2, 6), per=15)
    result = compare(old, new)
    assert result.societies == ("AAA", "BBB")  # only societies in both waves
    assert result.diff[:, 0].tolist() == [1.0, 0.0]
    assert (result.n0[0, 0], result.n1[0, 0]) == (12, 15)
    assert result.cell_diff[0] == 0.5
    assert result.cell_n_societies[0] == 2
    assert result.society_diff.tolist() == [1.0, 0.0]
    assert result.respondents0.tolist() == [12, 12]


def test_dr13_a_cell_missing_from_one_wave_is_left_out() -> None:
    values = full(0, 3)
    del values[(0, 29)]  # behavior 2, situation 9
    old = wave(("AAA",), values, per=10)
    new = wave(("AAA",), full(0, 5), per=10)
    result = compare(old, new)
    assert np.isnan(result.diff[0, 29])
    assert result.society_cells[0] == 119
    assert result.behavior_mean[2] == 2.0  # mean over the nine remaining situations


def test_nfr51_behavior_summaries_follow_table_1() -> None:
    # Three societies change by +1, −1 and +0.5 on every cell.
    old = wave(("A", "B", "C"), full(0, 3) | full(1, 4) | full(2, 3), per=10)
    rows = [(0, r, c, 4) for r in range(10) for c in range(CELLS)]
    rows += [(1, r, c, 3) for r in range(10) for c in range(CELLS)]
    rows += [(2, r, c, 3 + r % 2) for r in range(10) for c in range(CELLS)]
    result = compare(old, synthetic.rating_set(("A", "B", "C"), CELLS, rows))
    assert result.behavior_mean[0] == pytest.approx(0.5 / 3)
    assert result.behavior_sd[0] == pytest.approx(np.std([1.0, -1.0, 0.5], ddof=1))
    assert (result.behavior_increased[0], result.behavior_n_societies[0]) == (2, 3)


def test_dr13_intervals_bracket_the_differences() -> None:
    old_rows = [(0, r, c, 1 + (r + c) % 6) for r in range(40) for c in range(CELLS)]
    new_rows = [(0, r, c, 1 + (r * 2 + c) % 6) for r in range(40) for c in range(CELLS)]
    old = synthetic.rating_set(("AAA",), CELLS, old_rows)
    result = compare(old, synthetic.rating_set(("AAA",), CELLS, new_rows), 300)
    assert np.all(result.diff_lo <= result.diff)
    assert np.all(result.diff <= result.diff_hi)
    assert result.society_lo[0] <= result.society_diff[0] <= result.society_hi[0]
    assert repr(result) == "Change(1 societies × 120 cells)"
