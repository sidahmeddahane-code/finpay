/**
 * Utility: export any array of objects to a downloadable CSV file
 * @param {Object[]} data - array of flat objects
 * @param {string} filename - file name without extension
 */
export const exportToCSV = (data, filename = 'export') => {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(';'), // header row (semicolon for Excel FR locale)
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
        // Escape quotes and wrap in quotes if contains semicolon or newline
        return `"${val.replace(/"/g, '""')}"`;
      }).join(';')
    )
  ];

  const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
