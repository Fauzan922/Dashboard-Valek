# Notice and Attribution

## Province boundaries

The province boundary dataset bundled at
`src/data/indonesia-38-provinces.json` is:

> “Indonesia GeoJSON & TopoJSON Maps (38 Provinces)” by **denyherianto**,
> available at
> <https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces>.

The dataset is licensed under the **Creative Commons Attribution 4.0
International (CC BY 4.0)** license:
<https://creativecommons.org/licenses/by/4.0/>.

Changes made for this application:

- The file extension was changed from `.geojson` to `.json` so that
  Vite/Vitest can import it as a JSON module.
- At runtime, polygon ring orientation is normalized before projection for
  `d3-geo`. The source geometry coordinates are not otherwise edited.
- The upstream file is otherwise byte-for-byte identical. Its SHA-256 is
  `97F23F738C7AA66836B971D76381C009A34C6AAEFE9C982E85F060E678402027`.

**Caveat:** This is a community dataset, not an official map from Badan
Informasi Geospasial (BIG) or another government authority. Province
boundaries, names, and counts can differ between sources. The map is used for
visualization and selection only; it is not a legal, jurisdictional, or
official spatial reference. See `docs/DATA_SOURCES.md` for provenance details.

## Workbook data

The valuation coefficients, UMP values, categories, and study components are
derived from the workbook `Perhitungan Valuasi Ekonomi Lingkungan Hidup.xlsx`.
The workbook is not redistributed in this folder. See
`docs/METHODOLOGY.md` and `docs/DATA_SOURCES.md` for the method, counts, and
caveats.

## Fonts

The application uses the Inter variable font, self-hosted through the
`@fontsource-variable/inter` npm package (SIL Open Font License 1.1). No font is
loaded from a third-party CDN at runtime.
