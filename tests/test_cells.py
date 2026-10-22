"""DR-4, DR-9 and DR-11 on hand-computed cells: n, mean, SD, response counts, share, status."""

import math
from pathlib import Path

import numpy as np
import pytest
import synthetic

from pipeline import cells, ratings, raw, samples

# Two societies, two cells. Society 0: respondent 0 rates 1 and 6, respondent 1 rates 3 in cell 0.
ROWS = [(0, 0, 0, 1), (0, 0, 1, 6), (0, 1, 0, 3), (1, 0, 1, 4)]


def test_dr4_counts_means_and_sds_by_hand() -> None:
    stats = cells.summarize(synthetic.rating_set(("AAA", "BBB"), 2, ROWS))
    assert stats.n.tolist() == [[2, 1], [0, 1]]
    assert stats.mean[0].tolist() == [-1.5, 2.5]  # (1 + 3) / 2 − 3.5 and 6 − 3.5 (DR-2)
    assert math.isnan(stats.mean[1, 0])
    assert stats.sd[0, 0] == pytest.approx(math.sqrt(2))
    assert np.isnan(stats.sd[0, 1])  # one rating: undefined
    assert stats.counts[0, 0].tolist() == [1, 0, 1, 0, 0, 0]  # c1–c6
    assert stats.counts.sum() == len(ROWS)


def test_dr11_share_counts_ratings_of_four_to_six() -> None:
    stats = cells.summarize(synthetic.rating_set(("AAA", "BBB"), 2, ROWS))
    assert stats.share[0].tolist() == [0.0, 1.0]
    assert stats.share[1, 1] == 1.0


def test_dr9_status_bands_and_not_asked_cells() -> None:
    # Three behaviors × two situations. Behavior 2 is never rated by society 1 (not asked);
    # society 0 has one empty cell of a behavior it rated elsewhere (too few).
    n = np.array([[9, 10, 29, 30, 0, 5], [40, 40, 12, 3, 0, 0]])
    assert cells.status(n, behaviors=3).tolist() == [
        [cells.TOO_FEW, cells.SMALL, cells.SMALL, cells.OK, cells.TOO_FEW, cells.TOO_FEW],
        [cells.OK, cells.OK, cells.SMALL, cells.TOO_FEW, cells.NOT_ASKED, cells.NOT_ASKED],
    ]


def test_decision2_pooled_variance_by_hand() -> None:
    # Cell 0: society 0 has ratings 1, 3 (SS 2, df 1); society 1 has 2, 4, 6 (SS 8, df 2).
    rows = [(0, 0, 0, 1), (0, 1, 0, 3), (1, 0, 0, 2), (1, 1, 0, 4), (1, 2, 0, 6), (1, 0, 1, 5)]
    stats = cells.summarize(synthetic.rating_set(("AAA", "BBB"), 2, rows))
    pooled = cells.pooled_variance(stats)
    assert pooled[0] == pytest.approx(10 / 3)
    assert np.isnan(pooled[1])  # a single rating has no within-society spread


def test_dr16_reprs_show_counts_not_values() -> None:
    rs = synthetic.rating_set(("AAA", "BBB"), 2, ROWS)
    assert repr(rs) == "RatingSet(2 societies, 2 cells, 4 ratings)"
    assert repr(cells.summarize(rs)) == "CellStats(2 societies × 2 cells)"


def test_dr4_situation_ratings_use_dense_respondents_and_behavior_major_cells(
    tmp_path: Path,
) -> None:
    synthetic.write_situations(tmp_path)
    con = raw.connect()
    raw.load_situations(con, tmp_path)
    samples.add_membership(con)
    codes = ("DEU", "KWT", "NAM", "TTO", "USA", "XKX")
    rs = ratings.situations(con, "all", codes)
    assert rs.respondents.tolist() == [1, 1, 1, 1, 2, 1]  # Germany's "none" has no rating
    assert rs.value.size == 11
    # The i-th rating of a synthetic person is behavior i × situation i.
    assert sorted(set(rs.cell.tolist())) == [0, 11, 22]
    usa = codes.index("USA")
    assert sorted(set(rs.respondent[rs.society == usa].tolist())) == [0, 1]
