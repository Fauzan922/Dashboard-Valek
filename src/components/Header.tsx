import { meta } from '../data/reference';

interface HeaderProps {
  onOpenMethod: () => void;
}

export function Header({ onOpenMethod }: HeaderProps) {
  return (
    <header className="masthead">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          VE
        </span>
        <div className="brand-text">
          <h1>Valuasi Ekosistem Indonesia</h1>
          <p>Dashboard spasial · benefit transfer 2025</p>
        </div>
      </div>
      <div className="masthead-meta">
        <span className="data-chip">{meta.studyCount} studi</span>
        <span className="data-chip">38 provinsi</span>
        <span className="data-chip data-chip-muted">Workbook 2025</span>
        <button type="button" className="text-button" onClick={onOpenMethod}>
          Metode &amp; sumber
        </button>
      </div>
    </header>
  );
}
