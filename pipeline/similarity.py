"""Most similar societies (DR-14, FR-32).

Similarity is the Pearson correlation of two societies' fingerprints: their shrunken estimates
minus the global cell means, over the cells both can publish (n ≥ 10), when they share at least
120 such cells (decision 16). Correlating the estimates themselves would rank on noise: every
pair of societies shares the same strong situation effects, so raw profiles all correlate at
about 0.9. Centering by a per-society constant (DR-10) would not change a Pearson correlation.
"""

from dataclasses import dataclass

import numpy as np

TOP = 5
MIN_SHARED = 120


@dataclass(frozen=True)
class Match:
    other: int  # society index
    r: float
    shared: int  # cells the correlation is computed over


def pearson(x: np.ndarray, y: np.ndarray) -> float:
    dx, dy = x - x.mean(), y - y.mean()
    denominator = float(np.sqrt((dx * dx).sum() * (dy * dy).sum()))
    return float((dx * dy).sum()) / denominator if denominator > 0 else float("nan")


def most_similar(
    fingerprint: np.ndarray, usable: np.ndarray, top: int = TOP, min_shared: int = MIN_SHARED
) -> list[list[Match]]:
    """For each society, up to `top` others by descending r; ties go to the lower index."""
    societies = fingerprint.shape[0]
    matches: list[list[tuple[float, int, int]]] = [[] for _ in range(societies)]
    for a in range(societies):
        for b in range(a + 1, societies):
            both = usable[a] & usable[b]
            shared = int(both.sum())
            if shared < min_shared:
                continue
            r = pearson(fingerprint[a, both], fingerprint[b, both])
            if np.isfinite(r):
                matches[a].append((-r, b, shared))
                matches[b].append((-r, a, shared))
    return [[Match(b, -neg_r, k) for neg_r, b, k in sorted(m)[:top]] for m in matches]
