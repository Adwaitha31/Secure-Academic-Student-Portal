
import React, { useState, useEffect } from 'react';
import { User, Assignment } from '../../types';
import { api } from '../../frontend/api';

const FacultyDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [submissions, setSubmissions] = useState<Assignment[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [selectedIsBinary, setSelectedIsBinary] = useState(false);

  const refresh = async () => {
    try {
      const response = await api.assignments.getAll();
      const allAssignments = response.assignments || [];
      // Filter pending and completed
      const pending = allAssignments.filter((a: Assignment) => !a.grade);
      const completed = allAssignments.filter((a: Assignment) => a.grade);
      setSubmissions(pending);
      setCompletedAssignments(completed);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSelectAssignment = async (assignment: Assignment) => {
    setSelected(assignment);
    setSelectedIsBinary(!!assignment.isBinary);
    setDecryptedContent('Loading...');
    // Fetch decrypted content from backend
    try {
      const response = await api.assignments.decrypt(assignment.id);
      if (response.success) {
        setDecryptedContent(response.decryptedContent);
        setSelectedIsBinary(!!response.isBinary);
      } else {
        setDecryptedContent('Failed to load content');
      }
    } catch (err: any) {
      console.error('Failed to decrypt content:', err);
      setDecryptedContent('Error: ' + (err.message || 'Failed to load content'));
    }
  };

  const handleDownload = async () => {
    if (!selected) return;
    try {
      console.log('Starting download for:', selected.id);
      const { blob, filename } = await api.assignments.download(selected.id);
      console.log('Got blob:', blob.size, 'bytes, filename:', filename);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename || selected.filename || 'download';
      
      // Append to body and trigger click
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a short delay
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Download triggered successfully');
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Download failed: ' + (err.message || 'Unknown error'));
    }
  };

  const handleGrade = async () => {
    if (!selected) return;
    try {
      await api.assignments.grade(selected.id, grade, feedback);
      setSelected(null);
      setGrade('');
      setFeedback('');
      await refresh();
    } catch (err: any) {
      alert('Error grading: ' + (err.message || 'Failed'));
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Pending Submissions ({submissions.length})</h2>
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <p className="text-sm text-slate-400">No pending submissions</p>
            ) : (
              submissions.map(s => (
                <div key={s.id} onClick={() => handleSelectAssignment(s)} className={`p-4 rounded-xl border cursor-pointer ${selected?.id === s.id ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`}>
                  <p className="font-bold">{s.studentName}</p>
                  <p className="text-xs text-slate-500">{s.filename}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          {selected && !selected.grade ? (
            <div className="bg-white p-8 rounded-2xl border animate-fadeIn">
              <h3 className="text-2xl font-bold mb-4">Reviewing: {selected.filename}</h3>
              <p className="text-sm text-slate-600 mb-2"><strong>Student:</strong> {selected.studentName}</p>
              <p className="text-sm text-slate-600 mb-4"><strong>Signature:</strong> <span className="font-mono text-xs">{selected.digitalSignature}</span></p>
              <div className="mb-6">
                <h4 className="font-bold mb-2">Submitted Content:</h4>
                {selectedIsBinary ? (
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-slate-600">📄 Binary file ({selected.filename})</p>
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Download to view</span>
                    </div>
                    <button onClick={handleDownload} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download File
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Text Content</span>
                      <button onClick={handleDownload} className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-medium">⬇ Download</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {decryptedContent ? (
                        <pre className="text-sm whitespace-pre-wrap font-mono">{decryptedContent}</pre>
                      ) : (
                        <p className="text-slate-400">Loading content...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <input value={grade} onChange={e => setGrade(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Enter Grade (e.g., A, B+, 85%)" />
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="Feedback (optional)" rows={3} />
                <button onClick={handleGrade} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Post Grade</button>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-2xl text-slate-400">Select a pending assignment to grade</div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4">Completed Assignments ({completedAssignments.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">File</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Feedback</th>
                <th className="p-4">Graded At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {completedAssignments.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-slate-400">No completed assignments yet</td></tr>
              ) : (
                completedAssignments.map(a => (
                  <tr key={a.id} className="text-sm">
                    <td className="p-4 font-medium">{a.studentName}</td>
                    <td className="p-4">{a.filename}</td>
                    <td className="p-4 font-bold text-indigo-600">{a.grade}</td>
                    <td className="p-4 text-slate-600">{a.feedback || '-'}</td>
                    <td className="p-4 text-slate-500">{a.gradedAt ? new Date(a.gradedAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
