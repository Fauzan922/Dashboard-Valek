import { useState } from 'react';
import { Header } from './components/Header';
import { MapPanel } from './components/MapPanel';
import { StatsPanel } from './components/StatsPanel';
import { CalculatorPanel } from './components/CalculatorPanel';
import { MethodDialog } from './components/MethodDialog';
import { useStoredRecords } from './hooks/useStoredRecords';
import type { MapMode, SpatialRecord } from './types';

export default function App() {
  const [records, setRecords] = useStoredRecords<SpatialRecord>();
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [ecosystem, setEcosystem] = useState('Hutan');
  const [mapMode, setMapMode] = useState<MapMode>('coefficient');
  const [methodOpen, setMethodOpen] = useState(false);

  function handleAddRecord(record: SpatialRecord) {
    setRecords((current) => [record, ...current]);
    setMapMode(record.value === null ? 'area' : 'value');
  }

  function handleDeleteRecord(recordId: string) {
    setRecords((current) => current.filter((record) => record.id !== recordId));
  }

  function handleReset() {
    setSelectedProvinceId(null);
  }

  function focusCalculator() {
    window.setTimeout(() => {
      document
        .getElementById('calculator-title')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('calc-area')?.focus({ preventScroll: true });
    }, 40);
  }

  return (
    <div className="app-shell">
      <Header onOpenMethod={() => setMethodOpen(true)} />

      <main className="workspace">
        <MapPanel
          records={records}
          selectedProvinceId={selectedProvinceId}
          onSelectProvince={setSelectedProvinceId}
          onReset={handleReset}
          ecosystem={ecosystem}
          onEcosystemChange={setEcosystem}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          onFocusCalculator={focusCalculator}
        />

        <aside className="rail" aria-label="Statistik dan kalkulator">
          <StatsPanel
            records={records}
            selectedProvinceId={selectedProvinceId}
            ecosystem={ecosystem}
            onDeleteRecord={handleDeleteRecord}
            onClearRecords={() => setRecords([])}
            onFocusCalculator={focusCalculator}
          />
          <CalculatorPanel
            selectedProvinceId={selectedProvinceId}
            ecosystem={ecosystem}
            onEcosystemChange={setEcosystem}
            onSelectProvince={setSelectedProvinceId}
            onAddRecord={handleAddRecord}
          />
        </aside>
      </main>

      <footer className="site-footer">
        <span>
          Penilaian Valuasi Ekonomi Dengan Benefit Transfer Pada Tahun 2025
        </span>
        <span>
          Instrumen Ekonomi Lingkungan Hidup
        </span>
      </footer>

      <MethodDialog open={methodOpen} onClose={() => setMethodOpen(false)} />
    </div>
  );
}
