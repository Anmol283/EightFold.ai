'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface TransformUploaderProps {
  onSubmit: (data: any) => void;
  loading: boolean;
  error: string | null;
}

export default function TransformUploader({
  onSubmit,
  loading,
  error,
}: TransformUploaderProps) {
  const [csvContent, setCsvContent] = useState('');
  const [recruiterNotes, setRecruiterNotes] = useState('');
  const [configMode, setConfigMode] = useState<'default' | 'custom'>('default');
  const [customConfig, setCustomConfig] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const notesFileInputRef = useRef<HTMLInputElement>(null);

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleNotesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRecruiterNotes(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // At least one data source must be provided
    if (!csvContent.trim() && !recruiterNotes.trim()) {
      alert('Please provide at least one data source: CSV file or Recruiter Notes');
      return;
    }

    let config = undefined;
    if (configMode === 'custom' && customConfig.trim()) {
      try {
        config = JSON.parse(customConfig);
      } catch {
        alert('Invalid JSON in custom configuration');
        return;
      }
    }

    onSubmit({
      csv_data: csvContent || undefined,
      recruiter_notes: recruiterNotes || undefined,
      config,
    });
  };

  const loadSampleCSV = () => {
    const sample = `candidate_id,name,email,phone,current_company,title,location,years_experience,skills,education
C001,John Smith,john.smith@email.com,+1 (555) 123-4567,TechCorp,Senior Software Engineer,"San Francisco, CA, USA",8,"JavaScript, React, Node.js, Python",UC Berkeley - BS Computer Science
C002,Sarah Johnson,sarah.johnson@email.com,555-987-6543,DataSystems,Data Scientist,"New York, NY, USA",5,"Python, SQL, Machine Learning, Spark",MIT - MS Data Science`;
    setCsvContent(sample);
  };

  return (
    <div className="space-y-6">
      {/* Info Section */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">How it works</h2>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Provide at least one data source: Recruiter CSV or Recruiter Notes</li>
          <li>✓ Use CSV for structured candidate data with multiple records</li>
          <li>✓ Use Recruiter Notes to add unstructured observations and details</li>
          <li>✓ The transformer merges data from all provided sources with conflict resolution</li>
          <li>✓ Output includes confidence scores and data provenance tracking</li>
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800 font-medium">Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CSV Upload Section */}
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            1. Recruiter CSV (Optional - Structured Data)
          </h3>

          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Choose CSV File
              </button>
              <button
                type="button"
                onClick={loadSampleCSV}
                className="px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition"
              >
                Load Sample
              </button>
            </div>

            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />

            {csvContent && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">
                  <strong>CSV loaded:</strong> {csvContent.split('\n').length - 1} records
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:underline">
                    Preview
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto max-h-32">
                    {csvContent.split('\n').slice(0, 3).join('\n')}...
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Recruiter Notes Section */}
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            2. Recruiter Notes (Optional - Unstructured Data)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Recruiter Notes (.txt)
              </label>
              <button
                type="button"
                onClick={() => notesFileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Choose Notes File
              </button>
              <input
                ref={notesFileInputRef}
                type="file"
                accept=".txt"
                onChange={handleNotesUpload}
                className="hidden"
              />
              <p className="mt-2 text-xs text-slate-500">
                Or paste notes directly below
              </p>
            </div>

            <textarea
              placeholder="Paste recruiter notes here or upload a .txt file. Notes can include emails, phone numbers, skills, companies, and experience details."
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-black placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            />

            {recruiterNotes && (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-black">
                  <strong>Notes loaded:</strong> {recruiterNotes.length} characters
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="rounded-lg border border-slate-300 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            3. Configuration (Optional)
          </h3>

          <div className="space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={configMode === 'default'}
                  onChange={() => setConfigMode('default')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Use Default Configuration</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={configMode === 'custom'}
                  onChange={() => setConfigMode('custom')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">Use Custom Configuration</span>
              </label>
            </div>

            {configMode === 'custom' && (
              <textarea
                placeholder={`{
  "fields": [...],
  "merge_strategy": "source_priority",
  "on_missing": "null"
}`}
                value={customConfig}
                onChange={(e) => setCustomConfig(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
              />
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || (!csvContent && !recruiterNotes)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Transforming...' : 'Transform Data'}
          </Button>
        </div>
      </form>

      {/* Info Box */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">About This Tool</h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          This tool implements a candidate data transformer that merges information
          from CSV files (structured recruiter data) and recruiter notes (unstructured observations). 
          It handles normalization, conflict resolution, confidence scoring, and data provenance tracking.
        </p>
      </div>
    </div>
  );
}
