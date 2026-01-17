
import React, { useState, useEffect } from 'react';
import { User, Assignment } from '../../types';
import { api } from '../../frontend/api';

const StudentDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [fileContent, setFileContent] = useState('');
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');
  const [myWork, setMyWork] = useState<Assignment[]>([]);
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('text');
  const [contentType, setContentType] = useState<string>('text/plain');
  const [isBinary, setIsBinary] = useState(false);

  const refreshData = async () => {
    try {
      const response = await api.assignments.getAll();
      setMyWork(response.assignments || []);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  useEffect(() => { refreshData(); }, [user.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setContentType(file.type || 'application/octet-stream');
    setIsBinary(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result;
      if (buffer instanceof ArrayBuffer) {
        const base64String = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        setFileContent(base64String);
      } else if (typeof buffer === 'string') {
        // Fallback
        setFileContent(buffer);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus('Encrypting & Sending to Backend...');
      await api.assignments.submit(filename, fileContent, { contentType, isBinary });
      setStatus('Submission Successful!');
      setFilename(''); setFileContent(''); setIsBinary(false); setContentType('text/plain');
      await refreshData();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus('Error: ' + (err.message || 'Failed to submit'));
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-6">Secure Submission</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setUploadMethod('text')} className={`flex-1 py-2 rounded-lg font-medium ${uploadMethod === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Type Text</button>
          <button onClick={() => setUploadMethod('file')} className={`flex-1 py-2 rounded-lg font-medium ${uploadMethod === 'file' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Upload File</button>
        </div>
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadMethod === 'text' ? (
            <>
              <input required value={filename} onChange={e => setFilename(e.target.value)} className="w-full px-3 py-2 rounded-lg border" placeholder="Assignment Title" />
              <textarea required value={fileContent} onChange={e => { setFileContent(e.target.value); setIsBinary(false); setContentType('text/plain'); }} className="w-full px-3 py-2 h-40 rounded-lg border font-mono text-sm" placeholder="Content..." />
            </>
          ) : (
            <>
              <input type="file" onChange={handleFileChange} className="w-full px-3 py-2 rounded-lg border" accept=".txt,.pdf,.doc,.docx,.js,.py,.java,.cpp,.html,.css" required />
              {filename && <p className="text-sm text-slate-600">Selected: {filename}</p>}
            </>
          )}
          <button type="submit" disabled={!fileContent} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">Encrypt & Submit</button>
          {status && <p className="text-center text-green-600 text-sm">{status}</p>}
        </form>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold mb-6">My Grades</h2>
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr><th className="p-4">File</th><th className="p-4">Grade</th><th className="p-4">Digital Signature</th></tr>
            </thead>
            <tbody className="divide-y">
              {myWork.map(a => (
                <tr key={a.id} className="text-sm">
                  <td className="p-4 font-medium">{a.filename}</td>
                  <td className="p-4 font-bold text-indigo-600">{a.grade || 'Pending'}</td>
                  <td className="p-4 font-mono text-[10px] text-slate-400">{a.digitalSignature}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
