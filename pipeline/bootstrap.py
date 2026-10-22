"""Respondent bootstrap within societies (DR-5, NFR-50).

Each replicate draws, for every society, its respondents with replacement. A respondent's draw
count weights all of their ratings at once, so a respondent's ratings move together.

Determinism:
- Every society's draws come from its own generator, seeded from SHA-256 of the root seed and a
  key such as ("cells", "all", "CHL"). Results therefore depend on neither the order in which
  societies are processed nor on which other societies a sample contains.
- Weights are whole numbers and responses are 1–6, so the matrix products below are sums of
  integers, exact in float64 whatever the BLAS library or thread count.
"""

import hashlib
import warnings
from dataclasses import dataclass

import numpy as np

from pipeline.ratings import RatingSet

REPLICATES = 2000
SEED = 20251007  # the GSN paper's publication date; any fixed value would do
LEVEL = 95  # percentile intervals: 2.5th and 97.5th
MIDPOINT = 3.5


def generator(*key: str, seed: int = SEED) -> np.random.Generator:
    digest = hashlib.sha256("/".join((str(seed), *key)).encode()).digest()
    return np.random.default_rng(int.from_bytes(digest[:16], "little"))


def weights(respondents: int, replicates: int, rng: np.random.Generator) -> np.ndarray:
    """(replicates, respondents) draw counts; each row sums to `respondents`."""
    draws = rng.integers(0, respondents, size=(replicates, respondents))
    offsets = np.arange(replicates)[:, None] * respondents
    counts = np.bincount((draws + offsets).ravel(), minlength=replicates * respondents)
    return counts.reshape(replicates, respondents).astype(np.float64)


@dataclass(frozen=True, repr=False)
class Replicates:
    """Bootstrap replicates of every society–cell mean, plus what the τ correction needs."""

    mean: np.ndarray  # (B, S, C); NaN where a replicate drew nobody who rated the cell
    pooled_variance: np.ndarray  # (B, C) within-society variance pooled over societies
    inverse_n: np.ndarray  # (B, C) mean over present societies of 1 / n

    def __repr__(self) -> str:
        return f"Replicates({'×'.join(map(str, self.mean.shape))})"

    @property
    def se2_mean(self) -> np.ndarray:
        """(B, C) mean squared standard error over the societies present in each replicate."""
        se2: np.ndarray = self.pooled_variance * self.inverse_n
        return se2


def resample(ratings: RatingSet, key: tuple[str, ...], replicates: int = REPLICATES) -> Replicates:
    societies, cells = len(ratings.societies), ratings.cells
    mean = np.full((replicates, societies, cells), np.nan)
    ss = np.zeros((replicates, cells))
    df = np.zeros((replicates, cells))
    inverse = np.zeros((replicates, cells))
    present = np.zeros((replicates, cells))
    for s, code in enumerate(ratings.societies):
        size = int(ratings.respondents[s])
        if size == 0:
            continue
        rows = ratings.society == s
        index = (ratings.respondent[rows], ratings.cell[rows])
        value = ratings.value[rows].astype(np.float64)
        count = np.zeros((size, cells))
        total = np.zeros((size, cells))
        square = np.zeros((size, cells))
        np.add.at(count, index, 1.0)  # a 2000–2003 key can rate a cell twice
        np.add.at(total, index, value)
        np.add.at(square, index, value * value)
        w = weights(size, replicates, generator(*key, code))
        n, t, q = w @ count, w @ total, w @ square
        has = n > 0
        with np.errstate(invalid="ignore", divide="ignore"):
            mean[:, s] = np.where(has, t / n - MIDPOINT, np.nan)
            ss += np.where(has, q - t * t / n, 0.0)
            inverse += np.where(has, 1.0 / n, 0.0)
        df += np.maximum(n - 1, 0)
        present += has
    with np.errstate(invalid="ignore", divide="ignore"):
        pooled = np.where(df > 0, ss / df, np.nan)
        inverse_n = np.where(present > 0, inverse / present, np.nan)
    return Replicates(mean, pooled, inverse_n)


def interval(samples: np.ndarray, axis: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """95% percentile interval over `axis`, ignoring NaN replicates (NumPy's linear method)."""
    tail = (100 - LEVEL) / 2
    with quiet():
        lo, hi = np.nanpercentile(samples, [tail, 100 - tail], axis=axis)
    return lo, hi


def quiet() -> warnings.catch_warnings[None]:
    """Silence NumPy's warnings for all-NaN slices, such as cells a society never rated."""
    return warnings.catch_warnings(action="ignore", category=RuntimeWarning)
