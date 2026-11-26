// ClientSphere CSV Lead Import & Deduplication Wizard (Assessment 05)
// Developer: Nitin Sharma

'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  CopyCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadSample = () => {
    const csvContent =
      'firstName,lastName,email,phone,companyName,jobTitle\n' +
      'Eleanor,Rigby,e.rigby@abbeyroad.io,+14155550181,Abbey Road Studios,Chief Executive Officer\n' +
      'Arthur,Dent,a.dent@galaxyhitchhike.org,+12125550192,Galaxy Hitchhikers Inc,VP of Infrastructure\n' +
      'Victoria,Sterling,v.sterling@apexcloud.io,+14155550192,Apex Global Cloud Solutions,Chief Technology Officer\n' + // Known duplicate email
      'Sarah,Connor,s.connor@cyberdyne.ai,+12025550144,Cyberdyne Dynamics,Director of Security\n' +
      'Wade,Wilson,w.wilson@mercwithmouth.com,+13125550166,Deadpool Logistics,Operations Lead\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'clientsphere_sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      setIsProcessing(true);
      return await api.uploadFile('/imports/upload', selectedFile);
    },
    onSuccess: (res) => {
      setIsProcessing(false);
      setReport(res.data.report);
      queryClient.invalidateQueries({ queryKey: ['leadsList'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
    onError: (err: any) => {
      setIsProcessing(false);
      alert(`Import error: ${err.message}`);
    }
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
            <FileSpreadsheet className="text-violet-600" /> Lead Import Engine & Deduplication
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Assessment 05: CSV ingestion, RFC email normalization, E.164 phone formatting, exact & fuzzy collision detection.
          </p>
        </div>

        <button
          onClick={handleDownloadSample}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-white dark:bg-[#111B38] text-gray-700 dark:text-gray-200 hover:bg-[#F4F1E4] transition-colors"
        >
          <Download size={14} /> Download Sample CSV
        </button>
      </div>

      {/* Upload Box */}
      <div className="p-8 rounded-2xl bg-white dark:bg-[#111B38] border-2 border-dashed border-[#E2DCBF] dark:border-[#233464] text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
          <Upload size={28} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#070C1B] dark:text-[#FAF9F0]">
            {file ? file.name : 'Select or drag your CSV file here'}
          </h3>
          <p className="text-xs text-gray-400 mt-1">Accepts standard .csv files up to 10MB.</p>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
          className="hidden"
          id="csv-file-input"
        />

        <div className="flex items-center justify-center gap-3">
          <label
            htmlFor="csv-file-input"
            className="px-4 py-2 text-xs font-bold rounded-xl border border-[#E2DCBF] dark:border-[#233464] bg-[#FAF9F0] dark:bg-[#070C1B] hover:bg-[#EAE4CF] cursor-pointer transition-colors"
          >
            Browse Files
          </label>
          {file && (
            <button
              onClick={() => uploadMutation.mutate(file)}
              disabled={isProcessing}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all"
            >
              {isProcessing ? 'Normalizing & Scoring...' : 'Start Ingestion Pipeline'}
            </button>
          )}
        </div>
      </div>

      {/* Validation & Scoring Results Report */}
      {report && (
        <div className="p-6 rounded-2xl bg-white dark:bg-[#111B38] border border-[#E2DCBF] dark:border-[#233464] shadow-sm space-y-5 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2DCBF] dark:border-[#233464]">
            <h3 className="font-bold text-base text-[#070C1B] dark:text-[#FAF9F0] flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Ingestion & Deduplication Report
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Completed
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-gray-500">Imported & Scored</span>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">{report.successCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-gray-500">Duplicates Flagged</span>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">{report.duplicateCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <span className="text-[10px] uppercase font-bold text-gray-500">Total Rows</span>
              <div className="text-2xl font-extrabold text-blue-600 mt-1">{report.totalProcessed}</div>
            </div>
          </div>

          {report.duplicates?.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <CopyCheck size={14} className="text-amber-500" /> Duplicate Collision Log:
              </span>
              <div className="space-y-1.5">
                {report.duplicates.map((dup: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[#FAF9F0] dark:bg-[#070C1B] border border-[#E2DCBF] dark:border-[#233464] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-gray-900 dark:text-gray-100">Row {dup.row}: {dup.email}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">{dup.reason}</p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-white">
                      {(dup.confidence * 100).toFixed(0)}% MATCH
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
