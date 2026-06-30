'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import TransformUploader from '@/components/TransformUploader';
import ResultsView from '@/components/ResultsView';

export default function Page() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTransform = async (data: any) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const result = await response.json();
      setResults(result);
    } catch (err: any) {
      setError(err.message || 'Failed to transform data');
      console.error('[HomePage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Multi-Source Candidate Data Transformer
          </h1>
          <p className="mt-2 text-slate-600">
            Transform candidate data from multiple sources into a unified profile
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!results ? (
          <TransformUploader onSubmit={handleTransform} loading={loading} error={error} />
        ) : (
          <div>
            <Button
              onClick={handleReset}
              variant="outline"
              className="mb-6"
            >
              ← New Transformation
            </Button>
            <ResultsView results={results} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-600">
            <p>Eightfold Candidate Data Transformer • Built with Next.js + Express</p>
            <p className="mt-2">
              For questions or issues, check the{' '}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                documentation
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
