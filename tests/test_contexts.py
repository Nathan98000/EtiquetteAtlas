"""DR-12: context aggregates per society, globally and globally by respondent gender."""

import numpy as np
import pytest
import synthetic

from pipeline import cells, contexts, ratings

WOMAN, MAN, OTHER = (ratings.GENDERS.index(g) for g in ("Woman", "Man", "Other"))
CELLS = ratings.CONTEXT_CELLS


def rows_for(
    society: int, respondents: int, value: int, gender: int, start: int = 0
) -> list[tuple[int, ...]]:
    return [(society, start + r, 0, value, gender) for r in range(respondents)]


def test_dr12_global_values_weight_societies_equally() -> None:
    rows = rows_for(0, 40, 6, WOMAN) + rows_for(1, 10, 1, MAN)
    agg = contexts.aggregate(synthetic.rating_set(("A", "B"), CELLS, rows), "all", 50)
    assert agg.overall.mean[0] == 0.0
    assert (agg.overall.n[0], agg.overall.n_societies[0]) == (50, 2)
    assert agg.societies.mean[:, 0].tolist() == [2.5, -2.5]
    assert agg.overall.share[0] == 0.5


def test_dr12_respondent_gender_splits_are_global_and_exclude_other() -> None:
    rows = (
        rows_for(0, 20, 6, WOMAN)
        + rows_for(0, 20, 2, MAN, start=20)
        + rows_for(0, 15, 4, OTHER, start=40)
        + rows_for(1, 30, 5, WOMAN)
    )
    agg = contexts.aggregate(synthetic.rating_set(("A", "B"), CELLS, rows), "all", 50)
    assert set(agg.by_gender) == {"Woman", "Man"}
    women, men = agg.by_gender["Woman"], agg.by_gender["Man"]
    assert women.mean[0] == pytest.approx((2.5 + 1.5) / 2)
    assert (women.n[0], women.n_societies[0]) == (50, 2)
    assert (men.mean[0], men.n[0], men.n_societies[0]) == (-1.5, 20, 1)
    assert agg.overall.n[0] == 85  # "Other" still counts in the overall summary


def test_dr12_gender_splits_resample_the_same_respondents() -> None:
    rows = [(0, r, 0, 1 + r % 6, WOMAN if r % 2 else MAN) for r in range(60)]
    rs = synthetic.rating_set(("A",), CELLS, rows)
    agg = contexts.aggregate(rs, "all", 200)
    # A women's interval comes from the same draws: it brackets the women's mean.
    women = agg.by_gender["Woman"]
    assert women.lo[0] <= women.mean[0] <= women.hi[0]


def test_dr12_cells_of_a_behavior_never_rated_are_not_asked() -> None:
    rows = [(0, r, c, 3) for r in range(12) for c in range(5, CELLS)]  # behavior 0 absent
    agg = contexts.aggregate(synthetic.rating_set(("KWT",), CELLS, rows), "all", 20)
    assert set(agg.status[0, :5].tolist()) == {cells.NOT_ASKED}
    assert set(agg.status[0, 5:].tolist()) == {cells.SMALL}
    assert np.isnan(agg.overall.mean[0])
