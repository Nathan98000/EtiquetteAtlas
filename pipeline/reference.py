"""Hand-reviewed reference data: society names and languages (DR-15), published values (NFR-51)."""

import tomllib
from dataclasses import dataclass
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
SOCIETIES_PATH = PIPELINE_DIR / "societies.toml"
PUBLISHED_PATH = PIPELINE_DIR / "published.toml"


class ReferenceDataError(Exception):
    """A reference file is malformed or disagrees with the GSN files."""


@dataclass(frozen=True)
class Society:
    code: str
    country: str  # spelling in the GSN files
    name: str  # display name


@dataclass(frozen=True)
class Coordinates:
    lat: float
    lon: float


@dataclass(frozen=True)
class Reference:
    societies: dict[str, Society]
    coordinates: dict[str, Coordinates]  # positions the GSN files lack
    languages: dict[str, str]  # Qualtrics code -> language name

    def check_societies(self, found: dict[str, str], *, complete: bool = True) -> list[str]:
        """Compare `code -> country` from the GSN files with the reviewed names.

        With `complete`, every reviewed code must also occur in the files.
        """
        problems = [
            f"{c} is in the GSN files but not in societies.toml"
            for c in sorted(found)
            if c not in self.societies
        ]
        problems += [
            f"{c}: societies.toml says {self.societies[c].country!r}, "
            f"the GSN files say {found[c]!r}"
            for c in sorted(found)
            if c in self.societies and self.societies[c].country != found[c]
        ]
        if complete:
            problems += [
                f"{c} is in societies.toml but not in the GSN files"
                for c in sorted(self.societies)
                if c not in found
            ]
        return problems

    def language(self, code: str) -> str:
        try:
            return self.languages[code]
        except KeyError:
            raise ReferenceDataError(
                f"interface language {code!r} has no name in societies.toml"
            ) from None


def load_reference(path: Path = SOCIETIES_PATH) -> Reference:
    with path.open("rb") as f:
        doc = tomllib.load(f)
    societies = {
        code: Society(code, entry["country"], entry["name"])
        for code, entry in doc["societies"].items()
    }
    coordinates = {
        code: Coordinates(float(entry["lat"]), float(entry["lon"]))
        for code, entry in doc.get("coordinates", {}).items()
    }
    names = [s.name for s in societies.values()]
    if len(set(names)) != len(names):
        raise ReferenceDataError("societies.toml: two societies share a display name")
    unknown = sorted(set(coordinates) - set(societies))
    if unknown:
        raise ReferenceDataError(f"societies.toml: coordinates for unknown codes {unknown}")
    return Reference(societies, coordinates, dict(doc["languages"]))


@dataclass(frozen=True)
class Table1Row:
    behavior: str
    mean: float
    sd: float
    increased: float  # percent of societies


@dataclass(frozen=True)
class Published:
    tolerance: float
    table1_sample: str
    table1_societies: int
    table1: tuple[Table1Row, ...]
    fig2_sample: str
    cell_n_mean: float
    cell_n_min: int
    cell_n_max: int
    fig3_sample: str
    fig3_societies: int


def load_published(path: Path = PUBLISHED_PATH) -> Published:
    with path.open("rb") as f:
        doc = tomllib.load(f)
    t1, f2, f3 = doc["table1"], doc["fig2"], doc["fig3"]
    return Published(
        tolerance=float(doc["tolerance"]),
        table1_sample=t1["sample"],
        table1_societies=int(t1["societies"]),
        table1=tuple(
            Table1Row(r["behavior"], float(r["mean"]), float(r["sd"]), float(r["increased"]))
            for r in t1["rows"]
        ),
        fig2_sample=f2["sample"],
        cell_n_mean=float(f2["cell_n_mean"]),
        cell_n_min=int(f2["cell_n_min"]),
        cell_n_max=int(f2["cell_n_max"]),
        fig3_sample=f3["sample"],
        fig3_societies=int(f3["societies"]),
    )
