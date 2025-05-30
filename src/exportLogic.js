export function exportPnLToCSV({ buyCounts, sellCounts, profit }) {
  const headers = ['Group', 'Trades', 'Profit(SOL)', 'ROI(%)'];
  const rows = ['A', 'B', 'C', 'D'].map((g, i) => {
    const trades = buyCounts[i] + sellCounts[i];
    const p = profit[i].toFixed(4);
    const roi = trades === 0 ? 0 : ((profit[i] / (trades * 0.005)) * 100).toFixed(1);
    return [g, trades, p, roi];
  });

  let csvContent = headers.join(',') + '\n';
  rows.forEach(r => {
    csvContent += r.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `pnl_export_${Date.now()}.csv`;
  link.click();
}
