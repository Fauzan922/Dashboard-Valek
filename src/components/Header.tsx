interface HeaderProps {
  onOpenMethod: () => void;
}

export function Header({ onOpenMethod }: HeaderProps) {
  return (
    <header className="masthead">
      <div className="brand">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/cf/Logo_Kementerian_Lingkungan_Hidup_-_Badan_Pengendalian_Lingkungan_Hidup_%282024%29.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=original"
          alt="Logo"
          className="brand-logo"
          width={48}
          height={48}
        />
        <div className="brand-text">
          <h1>Valuasi Ekonomi Jasa Ekosistem Indonesia</h1>
          <p>Valuasi berbasis benefit transfer dengan data tahun 2025</p>
        </div>
      </div>
      <div className="masthead-meta">
        <button type="button" className="text-button" onClick={onOpenMethod}>
          Metode &amp; sumber
        </button>
      </div>
    </header>
  );
}
