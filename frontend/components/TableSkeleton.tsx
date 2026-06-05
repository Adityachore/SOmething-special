'use client';

export default function TableSkeleton({ cols = 5, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="skeleton" style={{ height: 12, width: i === 0 ? 120 : 70 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div 
                    className="skeleton" 
                    style={{ 
                      height: c === 0 ? 16 : 14, 
                      width: c === 0 ? '75%' : (c === cols - 1 ? 40 : '50%'),
                      margin: '2px 0' 
                    }} 
                  />
                  {c === 0 && (
                    <div className="skeleton" style={{ height: 10, width: '35%', marginTop: 6 }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
