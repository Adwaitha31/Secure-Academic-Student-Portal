
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../frontend/api';

interface AssignmentTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
  createdByName: string;
}

interface Submission {
  id: string;
  assignmentTaskId: string;
  assignmentTaskTitle: string;
  filename: string;
  isLate: boolean;
  submittedAt: string;
  grade: string | null;
  feedback: string | null;
  digitalSignature: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  postedByName: string;
  priority: string;
  createdAt: string;
}

const StudentDashboard: React.FC<{ user: User; onShowProfile: () => void }> = ({ user, onShowProfile }) => {
  const [assignmentTasks, setAssignmentTasks] = useState<AssignmentTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedTask, setSelectedTask] = useState<AssignmentTask | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [filename, setFilename] = useState('');
  const [status, setStatus] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'text' | 'file'>('text');
  const [contentType, setContentType] = useState<string>('text/plain');
  const [isBinary, setIsBinary] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions' | 'announcements'>('assignments');

  const refreshData = async () => {
    try {
      const [tasksRes, subsRes, announcementsRes] = await Promise.all([
        api.assignmentTasks.getAll(),
        api.submissions.getAll(),
        api.announcements.getAll()
      ]);
      setAssignmentTasks(tasksRes.tasks || []);
      setSubmissions(subsRes.submissions || []);
      setAnnouncements(announcementsRes.announcements || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
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
      const result = event.target?.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] || result;
        setFileContent(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      setStatus('Encrypting & Submitting...');
      await api.submissions.submit(selectedTask.id, filename, fileContent, { contentType, isBinary });
      setStatus('Submitted Successfully!');
      setSelectedTask(null);
      setFilename(''); setFileContent(''); setIsBinary(false); setContentType('text/plain');
      await refreshData();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus('Error: ' + (err.message || 'Failed to submit'));
      setTimeout(() => setStatus(''), 5000);
    }
  };

  const isDeadlinePassed = (deadline: string) => new Date(deadline) < new Date();
  const hasSubmitted = (taskId: string) => submissions.some(s => s.assignmentTaskId === taskId);

  const formatDate = (date: string) => new Date(date).toLocaleString();
  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diff < 0) return <span className="text-red-600 font-medium">Deadline Passed</span>;
    if (days > 0) return <span className="text-green-600">{days}d {hours}h remaining</span>;
    return <span className="text-amber-600">{hours}h remaining</span>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {user.username}!</h1>
          <p className="text-slate-500">Student Dashboard</p>
        </div>
        <button onClick={onShowProfile} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border hover:bg-slate-50">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
            {user.username[0].toUpperCase()}
          </div>
          <span className="font-medium">Profile</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl border w-fit">
        <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'assignments' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📚 Assignments ({assignmentTasks.length})
        </button>
        <button onClick={() => setActiveTab('submissions')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📝 My Submissions ({submissions.length})
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'announcements' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📢 Announcements ({announcements.length})
        </button>
      </div>

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold mb-4">Available Assignments</h2>
            {assignmentTasks.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border text-center text-slate-400">
                No assignments posted yet
              </div>
            ) : (
              <div className="space-y-4">
                {assignmentTasks.map(task => {
                  const submitted = hasSubmitted(task.id);
                  const passed = isDeadlinePassed(task.deadline);
                  return (
                    <div key={task.id} className={`bg-white p-6 rounded-xl border ${selectedTask?.id === task.id ? 'border-indigo-500 ring-2 ring-indigo-100' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{task.title}</h3>
                          <p className="text-sm text-slate-500">By {task.createdByName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatDeadline(task.deadline)}</p>
                          <p className="text-xs text-slate-400">{formatDate(task.deadline)}</p>
                        </div>
                      </div>
                      {task.description && <p className="text-slate-600 text-sm mb-4">{task.description}</p>}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">Max Marks: {task.maxMarks}</span>
                        {submitted ? (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">✓ Submitted</span>
                        ) : passed ? (
                          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">Deadline Passed</span>
                        ) : (
                          <button onClick={() => setSelectedTask(task)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                            Submit Assignment
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Panel */}
          <div className="lg:col-span-1">
            {selectedTask ? (
              <div className="bg-white p-6 rounded-xl border sticky top-6">
                <h3 className="font-bold mb-2">Submit: {selectedTask.title}</h3>
                <p className="text-sm text-slate-500 mb-4">Deadline: {formatDate(selectedTask.deadline)}</p>
                
                <div className="flex gap-2 mb-4">
                  <button onClick={() => setUploadMethod('text')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${uploadMethod === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Type Text</button>
                  <button onClick={() => setUploadMethod('file')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${uploadMethod === 'file' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Upload File</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {uploadMethod === 'text' ? (
                    <>
                      <input required value={filename} onChange={e => setFilename(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" placeholder="File name (e.g., solution.txt)" />
                      <textarea required value={fileContent} onChange={e => { setFileContent(e.target.value); setIsBinary(false); setContentType('text/plain'); }} className="w-full px-3 py-2 h-32 rounded-lg border font-mono text-sm" placeholder="Your answer..." />
                    </>
                  ) : (
                    <>
                      <input type="file" onChange={handleFileChange} className="w-full px-3 py-2 rounded-lg border text-sm" accept=".txt,.pdf,.doc,.docx,.js,.py,.java,.cpp,.html,.css" required />
                      {filename && <p className="text-xs text-slate-500">Selected: {filename}</p>}
                    </>
                  )}
                  <button type="submit" disabled={!fileContent} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">
                    🔐 Encrypt & Submit
                  </button>
                  <button type="button" onClick={() => setSelectedTask(null)} className="w-full bg-slate-100 text-slate-600 font-medium py-2 rounded-lg">
                    Cancel
                  </button>
                  {status && <p className={`text-center text-sm ${status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{status}</p>}
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed text-center text-slate-400">
                Select an assignment to submit
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-4">Assignment</th>
                <th className="p-4">File</th>
                <th className="p-4">Submitted</th>
                <th className="p-4">Status</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {submissions.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No submissions yet</td></tr>
              ) : submissions.map(s => (
                <tr key={s.id} className="text-sm">
                  <td className="p-4 font-medium">{s.assignmentTaskTitle}</td>
                  <td className="p-4">{s.filename}</td>
                  <td className="p-4 text-slate-500">{formatDate(s.submittedAt)}</td>
                  <td className="p-4">
                    {s.isLate && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Late</span>}
                    {!s.isLate && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">On Time</span>}
                  </td>
                  <td className="p-4 font-bold text-indigo-600">{s.grade || <span className="text-slate-400 font-normal">Pending</span>}</td>
                  <td className="p-4 text-slate-600">{s.feedback || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border text-center text-slate-400">
              No announcements yet
            </div>
          ) : announcements.map(a => (
            <div key={a.id} className="bg-white p-6 rounded-xl border">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(a.priority)}`}>
                    {a.priority}
                  </span>
                  <h3 className="font-bold">{a.title}</h3>
                </div>
                <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
              </div>
              <p className="text-slate-600">{a.content}</p>
              <p className="text-xs text-slate-400 mt-2">— {a.postedByName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
