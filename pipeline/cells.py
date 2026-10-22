"""Per-society cell summaries: n, mean, SD, c1–c6, share 4–6 and status (DR-4, DR-9, DR-11).

Means are on the −2.5 to +2.5 scale (DR-2). Every array is (societies, cells). Nothing here is
suppressed; the export blanks every value of a cell below `MIN_N` (DR-9).
"""

from dataclasses import dataclass

import numpy as np

from pipeline import privacy
from pipeline.ratings import RatingSet

MIN_N = privacy.MIN_GROUP_SIZE  # 10: below this nothing is published (DR-9)
SMALL_N = 30  # 10–29 respondents carry the small-sample flag (DR-9)
MIDPOINT = 3.5  # the 1–6 scale is recoded as rating − 3.5 (DR-2)

# Cell status codes shipped with every estimate (DR-9, FR-27, decision 8).
OK, SMALL, TOO_FEW, NOT_ASKED = 0, 1, 2, 3


@dataclass(frozen=True, repr=False)
class CellStats:
    n: np.ndarray  # respondents (ratings) per cell
    total: np.ndarray  # sum of responses on the 1–6 scale
    squares: np.ndarray  # sum of squared responses
    counts: np.ndarray  # (S, C, 6) responses per scale point: c1–c6

    def __repr__(self) -> str:
        return f"CellStats({self.n.shape[0]} societies × {self.n.shape[1]} cells)"

    @property
    def mean(self) -> np.ndarray:
        with np.errstate(invalid="ignore", divide="ignore"):
            return np.where(self.n > 0, self.total / self.n - MIDPOINT, np.nan)

    @property
    def within_ss(self) -> np.ndarray:
        """Sum of squared deviations from the cell mean (0 for an empty cell)."""
        with np.errstate(invalid="ignore", divide="ignore"):
            return np.where(self.n > 0, self.squares - self.total**2 / self.n, 0.0)

    @property
    def sd(self) -> np.ndarray:
        """Sample SD (n − 1 denominator); undefined below two ratings."""
        with np.errstate(invalid="ignore", divide="ignore"):
            var = np.where(self.n > 1, self.within_ss / (self.n - 1), np.nan)
        return np.sqrt(np.maximum(var, 0.0))

    @property
    def share(self) -> np.ndarray:
        """Share of ratings of 4, 5 or 6 ("appropriate") (DR-11)."""
        with np.errstate(invalid="ignore", divide="ignore"):
            return np.where(self.n > 0, self.counts[..., 3:].sum(axis=-1) / self.n, np.nan)


def summarize(ratings: RatingSet) -> CellStats:
    shape = (len(ratings.societies), ratings.cells)
    flat = ratings.society * ratings.cells + ratings.cell
    size = shape[0] * shape[1]
    value = ratings.value.astype(np.float64)
    counts = np.bincount(flat * 6 + ratings.value - 1, minlength=size * 6).reshape(*shape, 6)
    return CellStats(
        n=counts.sum(axis=-1),
        total=np.bincount(flat, weights=value, minlength=size).reshape(shape),
        squares=np.bincount(flat, weights=value * value, minlength=size).reshape(shape),
        counts=counts,
    )


def not_asked(n: np.ndarray, behaviors: int) -> np.ndarray:
    """Cells of a behavior a society has no rating of anywhere on the grid (decision 8).

    Kuwait's survey left out kissing and flirting, and Saudi Arabia's left out kissing; a cell
    that is empty only because the society is small is "too few", not "not asked".
    """
    societies, cells = n.shape
    width = cells // behaviors
    absent = n.reshape(societies, behaviors, width).sum(axis=2) == 0
    return np.repeat(absent, width, axis=1)


def status(n: np.ndarray, behaviors: int) -> np.ndarray:
    """OK (n ≥ 30), SMALL (10–29), TOO_FEW (< 10) or NOT_ASKED for every cell."""
    codes = np.where(n >= SMALL_N, OK, np.where(n >= MIN_N, SMALL, TOO_FEW))
    return np.where(not_asked(n, behaviors), NOT_ASKED, codes)


def pooled_variance(stats: CellStats) -> np.ndarray:
    """Each cell's within-society variance, pooled over societies: (cells,).

    The shrinkage SE uses it in place of each society–cell's own SD, which is undefined for one
    rating, zero when every respondent agrees and noisy below 30 (decision 2).
    """
    df = np.maximum(stats.n - 1, 0).sum(axis=0)
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(df > 0, stats.within_ss.sum(axis=0) / df, np.nan)
