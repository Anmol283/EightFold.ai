'use client';

import { useState } from 'react';

interface ResultsViewProps {
  results: {
    success: boolean;
    total: number;
    processed: number;
    failed: number;
    results: any[];
  };
}

export default function ResultsView({ results }: ResultsViewProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'details' | 'raw'>('overview');

  const successResults = results.results.filter((r) => r.status === 'success');
  const failedResults = results.results.filter((r) => r.status === 'error');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <p className="text-sm text-slate-600 font-medium">Total Records</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{results.total}</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700 font-medium">Successfully Processed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{results.processed}</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700 font-medium">Failed</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{results.failed}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {(['overview', 'details', 'raw'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
              selectedTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'details' ? 'Details' : 'Raw JSON'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-4">
          {failedResults.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <h3 className="font-semibold text-red-900 mb-3">Failed Records</h3>
              <div className="space-y-2">
                {failedResults.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="text-sm text-red-800">
                    <strong>Record {item.index}:</strong> {item.error}
                  </div>
                ))}
              </div>
              {failedResults.length > 5 && (
                <p className="mt-2 text-sm text-red-700">
                  +{failedResults.length - 5} more failures
                </p>
              )}
            </div>
          )}

          {successResults.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">
                  Successful Transformations ({successResults.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-200">
                {successResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.data.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">{item.email}</p>
                        {item.data.headline && (
                          <p className="text-sm text-slate-600">{item.data.headline}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100">
                          <span className="text-xs font-semibold text-slate-700">
                            {Math.round(item.data.overall_confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {expandedIndex === idx && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 text-sm">
                        {item.data.location && (
                          <div>
                            <span className="font-medium text-slate-900">Location: </span>
                            <span className="text-slate-600">
                              {[
                                item.data.location.city,
                                item.data.location.region,
                                item.data.location.country,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}
                        {item.data.years_experience && (
                          <div>
                            <span className="font-medium text-slate-900">Experience: </span>
                            <span className="text-slate-600">{item.data.years_experience} years</span>
                          </div>
                        )}
                        {item.data.skills && item.data.skills.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-900 block mb-1">Skills:</span>
                            <div className="flex flex-wrap gap-2">
                              {item.data.skills.slice(0, 8).map((skill: string, sidx: number) => (
                                <span
                                  key={sidx}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {item.data.skills.length > 8 && (
                                <span className="text-slate-600 text-xs pt-1">
                                  +{item.data.skills.length - 8} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Details Tab */}
      {selectedTab === 'details' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {successResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-600">{item.index + 1}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {item.data.full_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate">{item.email}</td>
                    <td className="px-4 py-3 text-slate-600">{item.data.current_company || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.data.headline || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {Math.round(item.data.overall_confidence * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw JSON Tab */}
      {selectedTab === 'raw' && (
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-slate-100 text-xs font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(successResults, null, 2)}
          </pre>
        </div>
      )}

      {/* Download Button */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            const json = JSON.stringify(successResults, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transformed-candidates-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
        >
          Download JSON
        </button>
        <button
          onClick={() => {
            const csv = convertToCSV(successResults);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transformed-candidates-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = ['full_name', 'emails', 'phones', 'headline', 'current_company', 'skills', 'overall_confidence'];
  const rows = data.map((item) =>
    headers
      .map((header) => {
        const value = item.data[header];
        if (Array.isArray(value)) return `"${value.join('; ')}"`;
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        return `"${value || ''}"`;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
