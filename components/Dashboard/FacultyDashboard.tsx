
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../frontend/api';

interface AssignmentTask {
  id: string;
  title: string;
  description: string;
  deadline: string;
  maxMarks: number;
  submissionCount: number;
  createdAt: string;
}

interface Submission {
  id: string;
  assignmentTaskId: string;
  assignmentTaskTitle: string;
  studentId: string;
  studentName: string;
  filename: string;
  contentType: string;
  isBinary: boolean;
  isLate: boolean;
  submittedAt: string;
  grade: string | null;
  gradedBy: string | null;
  feedback: string | null;
  gradedAt: string | null;
  digitalSignature: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
}

const FacultyDashboard: React.FC<{ user: User; onShowProfile: () => void }> = ({ user, onShowProfile }) => {
  const [assignmentTasks, setAssignmentTasks] = useState<AssignmentTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'submissions' | 'announcements'>('assignments');
  
  // Create Assignment Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newMaxMarks, setNewMaxMarks] = useState('100');
  
  // Create Announcement Form
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('MEDIUM');
  
  // Grading
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');

  const refresh = async () => {
    try {
      const [tasksRes, subsRes, annRes] = await Promise.all([
        api.assignmentTasks.getAll(),
        api.submissions.getAll(),
        api.announcements.getAll()
      ]);
      setAssignmentTasks(tasksRes.tasks || []);
      setSubmissions(subsRes.submissions || []);
      setAnnouncements(annRes.announcements || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.assignmentTasks.create(newTitle, newDescription, newDeadline, parseInt(newMaxMarks));
      setShowCreateForm(false);
      setNewTitle(''); setNewDescription(''); setNewDeadline(''); setNewMaxMarks('100');
      await refresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.announcements.create(annTitle, annContent, annPriority);
      setShowAnnouncementForm(false);
      setAnnTitle(''); setAnnContent(''); setAnnPriority('MEDIUM');
      await refresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSelectSubmission = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade('');
    setFeedback('');
    if (!submission.isBinary) {
      try {
        const res = await fetch(`http://localhost:5000/api/submissions/${submission.id}/download`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        const text = await res.text();
        setDecryptedContent(text);
      } catch (err) {
        setDecryptedContent('Failed to load content');
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedSubmission) return;
    try {
      const { blob, filename } = await api.submissions.download(selectedSubmission.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || selectedSubmission.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission || !grade) return;
    try {
      await api.submissions.grade(selectedSubmission.id, grade, feedback);
      setSelectedSubmission(null);
      setGrade(''); setFeedback('');
      await refresh();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleString();
  const pendingSubmissions = submissions.filter(s => !s.grade);
  const gradedSubmissions = submissions.filter(s => s.grade);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome, {user.username}!</h1>
          <p className="text-slate-500">Faculty Dashboard</p>
        </div>
        <button onClick={onShowProfile} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border hover:bg-slate-50">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
            {user.username[0].toUpperCase()}
          </div>
          <span className="font-medium">Profile</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold text-indigo-600">{assignmentTasks.length}</p>
          <p className="text-sm text-slate-500">Assignments</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold text-amber-600">{pendingSubmissions.length}</p>
          <p className="text-sm text-slate-500">Pending Review</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold text-green-600">{gradedSubmissions.length}</p>
          <p className="text-sm text-slate-500">Graded</p>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <p className="text-2xl font-bold text-purple-600">{announcements.length}</p>
          <p className="text-sm text-slate-500">Announcements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl border w-fit">
        <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'assignments' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📚 Assignments
        </button>
        <button onClick={() => setActiveTab('submissions')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'submissions' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📝 Submissions ({pendingSubmissions.length} pending)
        </button>
        <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'announcements' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
          📢 Announcements
        </button>
      </div>

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">My Assignments</h2>
            <button onClick={() => setShowCreateForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              + Create Assignment
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-white p-6 rounded-xl border mb-6">
              <h3 className="font-bold mb-4">Create New Assignment</h3>
              <form onSubmit={handleCreateAssignment} className="grid grid-cols-2 gap-4">
                <input required value={newTitle} onChange={e => setNewTitle(e.target.value)} className="px-3 py-2 rounded-lg border" placeholder="Assignment Title" />
                <input required type="datetime-local" value={newDeadline} onChange={e => setNewDeadline(e.target.value)} className="px-3 py-2 rounded-lg border" />
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} className="px-3 py-2 rounded-lg border col-span-2" placeholder="Description (optional)" rows={2} />
                <input type="number" value={newMaxMarks} onChange={e => setNewMaxMarks(e.target.value)} className="px-3 py-2 rounded-lg border" placeholder="Max Marks" />
                <div className="flex gap-2">
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} className="bg-slate-100 px-4 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignmentTasks.map(task => (
              <div key={task.id} className="bg-white p-5 rounded-xl border">
                <h3 className="font-bold text-lg mb-2">{task.title}</h3>
                {task.description && <p className="text-sm text-slate-600 mb-3">{task.description}</p>}
                <div className="flex justify-between text-sm text-slate-500 mb-3">
                  <span>Deadline: {formatDate(task.deadline)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Max: {task.maxMarks} marks</span>
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">{task.submissionCount} submissions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold">Pending ({pendingSubmissions.length})</h3>
            {pendingSubmissions.length === 0 ? (
              <p className="text-slate-400 text-sm">No pending submissions</p>
            ) : pendingSubmissions.map(s => (
              <div key={s.id} onClick={() => handleSelectSubmission(s)} className={`bg-white p-4 rounded-xl border cursor-pointer hover:border-indigo-300 ${selectedSubmission?.id === s.id ? 'border-indigo-500 ring-2 ring-indigo-100' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{s.studentName}</p>
                  {s.isLate && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Late</span>}
                </div>
                <p className="text-sm text-slate-500">{s.assignmentTaskTitle}</p>
                <p className="text-xs text-slate-400">{s.filename}</p>
              </div>
            ))}

            <h3 className="font-bold pt-4">Graded ({gradedSubmissions.length})</h3>
            {gradedSubmissions.slice(0, 5).map(s => (
              <div key={s.id} className="bg-slate-50 p-4 rounded-xl border">
                <div className="flex justify-between">
                  <p className="font-medium text-sm">{s.studentName}</p>
                  <p className="font-bold text-indigo-600">{s.grade}</p>
                </div>
                <p className="text-xs text-slate-500">{s.assignmentTaskTitle}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedSubmission ? (
              <div className="bg-white p-6 rounded-xl border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{selectedSubmission.studentName}</h3>
                    <p className="text-slate-500">{selectedSubmission.assignmentTaskTitle}</p>
                  </div>
                  {selectedSubmission.isLate && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">Late Submission</span>}
                </div>

                <div className="mb-4 text-sm text-slate-600">
                  <p><strong>File:</strong> {selectedSubmission.filename}</p>
                  <p><strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}</p>
                  <p><strong>Signature:</strong> <span className="font-mono text-xs">{selectedSubmission.digitalSignature?.slice(0, 40)}...</span></p>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold mb-2">Content</h4>
                  {selectedSubmission.isBinary ? (
                    <div className="bg-slate-50 p-4 rounded-lg border">
                      <p className="text-sm text-slate-600 mb-3">📄 Binary file - Download to view</p>
                      <button onClick={handleDownload} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">
                        ⬇ Download {selectedSubmission.filename}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border max-h-48 overflow-y-auto">
                      <pre className="text-sm font-mono whitespace-pre-wrap">{decryptedContent || 'Loading...'}</pre>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <input value={grade} onChange={e => setGrade(e.target.value)} className="w-full px-4 py-2 rounded-lg border" placeholder="Grade (e.g., A+, 95/100)" />
                  <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="w-full px-4 py-2 rounded-lg border" placeholder="Feedback (optional)" rows={2} />
                  <button onClick={handleGrade} disabled={!grade} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold disabled:opacity-50">
                    Submit Grade
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-xl text-slate-400">
                Select a submission to grade
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Announcements</h2>
            <button onClick={() => setShowAnnouncementForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
              + Post Announcement
            </button>
          </div>

          {showAnnouncementForm && (
            <div className="bg-white p-6 rounded-xl border mb-6">
              <h3 className="font-bold mb-4">Post New Announcement</h3>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <input required value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border" placeholder="Title" />
                <textarea required value={annContent} onChange={e => setAnnContent(e.target.value)} className="w-full px-3 py-2 rounded-lg border" placeholder="Content" rows={3} />
                <div className="flex gap-4 items-center">
                  <label className="text-sm font-medium">Priority:</label>
                  {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                    <label key={p} className="flex items-center gap-1">
                      <input type="radio" name="priority" value={p} checked={annPriority === p} onChange={() => setAnnPriority(p)} />
                      <span className="text-sm">{p}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">Post</button>
                  <button type="button" onClick={() => setShowAnnouncementForm(false)} className="bg-slate-100 px-4 py-2 rounded-lg">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {announcements.map(a => (
              <div key={a.id} className="bg-white p-5 rounded-xl border">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${a.priority === 'HIGH' ? 'bg-red-100 text-red-700' : a.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {a.priority}
                    </span>
                    <h3 className="font-bold">{a.title}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(a.createdAt)}</span>
                </div>
                <p className="text-slate-600">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
