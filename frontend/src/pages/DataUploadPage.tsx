import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, Database, RefreshCw, Check } from 'lucide-react';
import { api } from '../api/client';
import { CSVPreview, CSVImportResult } from '../types';

export const DataUploadPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datasetType, setDatasetType] = useState<string>('case_reports');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (f: File) => {
    setFile(f);
    setErrorMsg(null);
    setImportResult(null);
    setIsUploading(true);

    try {
      const res = await api.uploadCSVFile(datasetType, f);
      setPreview(res);
      setMapping(res.suggested_mapping || {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file preview');
    } finally {
      setIsUploading(false);
    }
  };

  const handleMappingChange = (targetField: string, sourceCol: string) => {
    setMapping((prev) => ({ ...prev, [targetField]: sourceCol }));
  };

  const handleCommit = async () => {
    if (!preview) return;
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const result = await api.commitImport({
        dataset_type: datasetType,
        column_mapping: mapping,
        raw_data: preview.preview_rows,
        auto_balance_matrix: true,
      });
      setImportResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit import into database');
    } finally {
      setIsUploading(false);
    }
  };

  // Target schema fields per dataset
  const targetFields: Record<string, string[]> = {
    case_reports: ['day', 'reported_cases', 'reported_deaths', 'hospital_admissions'],
    populations: ['name', 'count', 'initial_immunity', 'hospitalisation_rate', 'ifr'],
  };

  return (
    <div className="max-w-6xl mx-auto pt-8 pb-32 px-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-signal" />
            <h1 className="font-sora text-2xl font-bold text-text">Data Ingestion Hub</h1>
          </div>
          <p className="text-xs font-mono text-text-3 mt-1">
            Upload custom CSV / Excel surveillance datasets or population pyramids directly to MongoDB Atlas
          </p>
        </div>

        {/* Dataset Type Picker */}
        <div className="flex items-center gap-1.5 bg-surface-2 p-1.5 rounded-full border border-border">
          {[
            { id: 'case_reports', label: 'Case Reports' },
            { id: 'populations', label: 'Populations' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setDatasetType(item.id);
                setPreview(null);
                setFile(null);
                setImportResult(null);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all ${
                datasetType === item.id ? 'bg-primary text-white font-semibold shadow-xs' : 'text-text-3 hover:text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Drop Zone */}
      {!preview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-border hover:border-primary bg-white rounded-3xl p-16 text-center transition-all shadow-soft hover:shadow-elevated group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.json"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 rounded-3xl bg-primary-soft text-primary group-hover:scale-110 flex items-center justify-center mx-auto mb-4 transition-transform">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-sora text-lg font-bold text-text mb-1">
            Drop your {datasetType.replace('_', ' ')} file here
          </h3>
          <p className="text-xs font-mono text-text-3 max-w-sm mx-auto mb-4">
            Supports CSV, TSV, or plain text tables. Automatic header detection and schema verification will be performed.
          </p>
          <button
            type="button"
            className="px-5 py-2.5 rounded-full bg-surface-2 hover:bg-border text-text font-mono text-xs border border-border inline-flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Browse Local File
          </button>
        </div>
      )}

      {/* Step 2: Mapping & Preview Table */}
      {preview && !importResult && (
        <div className="space-y-6">
          {/* File summary pill */}
          <div className="bg-white p-4 rounded-2xl border border-border shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-sora font-semibold text-sm text-text">{preview.filename}</div>
                <div className="text-[11px] font-mono text-text-3">
                  {preview.total_rows} rows detected • {preview.headers.length} columns found
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="px-3 py-1.5 rounded-full bg-surface-2 hover:bg-border text-xs font-mono text-text"
            >
              Change File
            </button>
          </div>

          {/* Column Mapping Selector */}
          <div className="bg-white p-6 rounded-3xl border border-border shadow-soft space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h3 className="font-sora text-sm font-bold text-text">Step 2: Map File Headers to Schema</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {(targetFields[datasetType] || []).map((target) => (
                <div key={target} className="bg-surface-2/60 p-3 rounded-2xl border border-border">
                  <label className="text-[11px] font-mono text-text-3 uppercase block mb-1.5">{target}</label>
                  <select
                    value={mapping[target] || ''}
                    onChange={(e) => handleMappingChange(target, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl border border-border bg-white text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">(Select column)</option>
                    {preview.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Rows Preview Table */}
          <div className="bg-white rounded-3xl border border-border shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-sora text-sm font-bold text-text">File Sample Preview</h3>
              <span className="text-xs font-mono text-text-3">Showing top rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-surface-2/50 border-b border-border">
                    {preview.headers.map((h) => (
                      <th key={h} className="p-3 font-semibold text-text-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.preview_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-2/30">
                      {preview.headers.map((h) => (
                        <td key={h} className="p-3 text-text">
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end gap-4 pt-2">
            <button
              onClick={handleCommit}
              disabled={isUploading}
              className="px-6 py-3 rounded-full bg-primary hover:bg-primary-hover text-white font-sora font-semibold text-xs shadow-soft flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Validating & Committing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Validate & Commit to MongoDB
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Import Result & Error Table */}
      {importResult && (
        <div className="bg-white p-8 rounded-3xl border border-border shadow-elevated space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-sora text-lg font-bold text-text">Ingestion Completed!</h3>
              <p className="text-xs font-mono text-text-3">
                Committed to MongoDB Atlas with document ID: <span className="font-bold text-primary">{importResult.committed_id}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-surface-2 border border-border">
              <span className="text-text-3 block mb-1">Total Rows</span>
              <span className="font-sora font-bold text-base text-text">{importResult.total_rows}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-700 block mb-1">Valid Rows Saved</span>
              <span className="font-sora font-bold text-base text-emerald-700">{importResult.valid_rows}</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-rose-700 block mb-1">Validation Issues</span>
              <span className="font-sora font-bold text-base text-rose-700">{importResult.invalid_rows}</span>
            </div>
          </div>

          {importResult.issues.length > 0 && (
            <div className="border border-rose-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-rose-50/50 border-b border-rose-200 text-xs font-mono font-bold text-rose-800">
                Row-Level Validation Exceptions ({importResult.issues.length})
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-rose-100 text-xs font-mono">
                {importResult.issues.map((iss, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-900">Row {iss.row_number}:</span>{' '}
                      <span className="text-rose-700">{iss.error}</span> ({iss.field})
                    </div>
                    <span className="text-text-3 font-mono">Raw: "{String(iss.raw_value)}"</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
                setImportResult(null);
              }}
              className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white font-sora text-xs font-semibold shadow-soft"
            >
              Upload Another Dataset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
