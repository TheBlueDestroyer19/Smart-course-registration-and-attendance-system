import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('attendance'); // 'attendance' | 'approvals'

  // Section list
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [existingAttendance, setExistingAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Approval state
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingDrops, setPendingDrops] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState(null);

  // Student detail modal
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);

  useEffect(() => {
    api.get(`/lookup/instructor-sections/${user.id}`)
      .then(({ data }) => setSections(data))
      .catch(console.error);
  }, []);

  const fetchPending = () => {
    setApprovalLoading(true);
    Promise.all([
      api.get(`/registration/pending-approvals/${user.id}`),
      api.get(`/registration/pending-drops/${user.id}`)
    ])
      .then(([approvalsRes, dropsRes]) => {
        setPendingApprovals(approvalsRes.data);
        setPendingDrops(dropsRes.data);
      })
      .catch(console.error)
      .finally(() => setApprovalLoading(false));
  };

  useEffect(() => {
    if (tab === 'approvals') fetchPending();
  }, [tab]);

  useEffect(() => {
    if (!selectedSection) { setStudents([]); return; }
    setLoading(true);
    api.get(`/lookup/section-students/${selectedSection}`)
      .then(({ data }) => {
        setStudents(data);
        const state = {};
        data.forEach((s) => { state[s.STUDENT_ID] = 'PRESENT'; });
        setAttendanceState(state);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSection]);

  useEffect(() => {
    if (!selectedSection || !date) return;
    api.get(`/attendance/section/${selectedSection}/date/${date}`)
      .then(({ data }) => {
        setExistingAttendance(data);
        if (data.length > 0) {
          const state = { ...attendanceState };
          data.forEach((a) => { state[a.STUDENT_ID] = a.STATUS; });
          setAttendanceState(state);
        }
      })
      .catch(console.error);
  }, [selectedSection, date, students]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceState((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const state = {};
    students.forEach((s) => { state[s.STUDENT_ID] = status; });
    setAttendanceState(state);
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setMessage({ type: '', text: '' });
    const records = students.map((s) => ({
      studentId: s.STUDENT_ID,
      status: attendanceState[s.STUDENT_ID] || 'PRESENT',
    }));
    try {
      const { data } = await api.post('/attendance/mark', {
        sectionId: Number(selectedSection),
        date,
        records,
      });
      setMessage({ type: 'success', text: `Attendance saved for ${data.count} students.` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save attendance.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  // ─── FA Approval Actions ──────────────────────────────
  const handleApproveStudent = async (studentId) => {
    setApprovalActionLoading(studentId);
    try {
      await api.put(`/registration/approve-student/${studentId}`);
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve.');
    } finally { setApprovalActionLoading(null); }
  };

  const handleRejectStudent = async (studentId) => {
    if (!confirm('Reject ALL pending courses for this student?')) return;
    setApprovalActionLoading(studentId);
    try {
      await api.put(`/registration/reject-student/${studentId}`);
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject.');
    } finally { setApprovalActionLoading(null); }
  };

  const handleApprove = async (regId) => {
    try {
      await api.put(`/registration/${regId}/approve`);
      fetchPending();
    } catch { alert('Failed to approve.'); }
  };

  const handleReject = async (regId) => {
    if (!confirm('Reject this registration?')) return;
    try {
      await api.put(`/registration/${regId}/reject`);
      fetchPending();
    } catch { alert('Failed to reject.'); }
  };

  const handleApproveDrop = async (regId) => {
    try {
      await api.put(`/registration/${regId}/approve-drop`);
      fetchPending();
    } catch { alert('Failed to approve drop.'); }
  };

  const handleRejectDrop = async (regId) => {
    if (!confirm('Reject this drop request?')) return;
    try {
      await api.put(`/registration/${regId}/reject-drop`);
      fetchPending();
    } catch { alert('Failed to reject drop.'); }
  };

  // Open student detail modal
  const openStudentDetail = async (studentId) => {
    setStudentDetailLoading(true);
    setStudentDetail(null);
    try {
      const [profileRes, regRes, attRes] = await Promise.all([
        api.get(`/lookup/student-profile/${studentId}`),
        api.get(`/registration/${studentId}`),
        api.get(`/attendance/student/${studentId}`),
      ]);
      setStudentDetail({
        profile: profileRes.data,
        registrations: regRes.data,
        attendance: attRes.data,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setStudentDetailLoading(false);
    }
  };

  const statusOptions = ['PRESENT', 'ABSENT', 'CANCELLED'];
  const statusColors = {
    PRESENT: 'bg-success/20 text-success border-success/40',
    ABSENT: 'bg-danger/20 text-danger border-danger/40',
    CANCELLED: 'bg-white/10 text-text-muted border-white/20',
  };

  const presentCount = Object.values(attendanceState).filter((v) => v === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter((v) => v === 'ABSENT').length;
  const selectedSectionInfo = sections.find(s => String(s.SECTION_ID) === String(selectedSection));

  // Group pending approvals by student
  const groupedApprovals = pendingApprovals.reduce((acc, p) => {
    const key = p.STUDENT_ID;
    if (!acc[key]) {
      acc[key] = {
        studentId: p.STUDENT_ID,
        firstName: p.FIRST_NAME,
        lastName: p.LAST_NAME,
        email: p.EMAIL,
        courses: [],
      };
    }
    acc[key].courses.push(p);
    return acc;
  }, {});

  const totalPendingStudents = Object.keys(groupedApprovals).length;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* ── LEFT PANEL: Navigation & Stats ─────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Header */}
            <div className="glass-card rounded-3xl border-2 text-center">
              <div className="text-4xl mb-2">🎓</div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Faculty Dashboard</h2>
              <p className="text-xs text-text-muted mt-2 font-semibold">Attendance & Approvals</p>
            </div>

            {/* Tab Navigation - Vertical */}
            <div className="glass-card rounded-3xl border-2 p-0 overflow-hidden">
              <button
                onClick={() => setTab('attendance')}
                className={`w-full text-left px-6 py-4 text-sm font-bold border-b transition-all ${
                  tab === 'attendance'
                    ? 'bg-gradient-to-r from-primary via-pink-500 to-orange-400 text-white'
                    : 'text-text-main hover:bg-primary/5'
                }`}
                id="attendance-tab"
              >
                📝 Mark Attendance
              </button>
              <button
                onClick={() => setTab('approvals')}
                className={`w-full text-left px-6 py-4 text-sm font-bold transition-all ${
                  tab === 'approvals'
                    ? 'bg-gradient-to-r from-primary via-pink-500 to-orange-400 text-white'
                    : 'text-text-main hover:bg-primary/5'
                }`}
                id="approvals-tab"
              >
                ✅ Approvals
                {(totalPendingStudents + pendingDrops.length) > 0 && (
                  <span className="ml-2 inline-block bg-danger px-2 py-0.5 rounded-full text-xs text-white">
                    {totalPendingStudents + pendingDrops.length}
                  </span>
                )}
              </button>
            </div>

            {/* Attendance Mode Stats */}
            {tab === 'attendance' && (
              <div className="space-y-3">
                <div className="glass-card rounded-2xl border-2 p-4">
                  <p className="text-xs font-bold text-text-muted mb-3">SECTION</p>
                  <select className="input-field text-sm" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} id="faculty-section-select">
                    <option value="">Select section</option>
                    {sections.map((s) => (
                      <option key={s.SECTION_ID} value={s.SECTION_ID}>
                        {s.COURSE_CODE} — Sec {s.SECTION_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="glass-card rounded-2xl border-2 p-4">
                  <p className="text-xs font-bold text-text-muted mb-3">DATE</p>
                  <input type="date" className="input-field text-sm" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} id="faculty-date-input" />
                </div>

                {students.length > 0 && (
                  <div className="space-y-2">
                    <div className="glass-card rounded-2xl border-2 p-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-success">{presentCount}</p>
                        <p className="text-xs font-bold text-text-muted mt-1">Present</p>
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl border-2 p-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-danger">{absentCount}</p>
                        <p className="text-xs font-bold text-text-muted mt-1">Absent</p>
                      </div>
                    </div>
                    <div className="glass-card rounded-2xl border-2 p-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-cyan-700">{students.length}</p>
                        <p className="text-xs font-bold text-text-muted mt-1">Total</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSectionInfo && (
                  <div className="glass-card rounded-2xl border-2 p-3 bg-cyan-50/50 border-cyan-300/40">
                    <p className="text-[11px] font-bold text-text-muted mb-2 uppercase">📍 Section Info</p>
                    <p className="text-xs font-bold text-text-main mb-1">{selectedSectionInfo.COURSE_NAME}</p>
                    <p className="text-[10px] text-text-muted">Room: {selectedSectionInfo.ROOM}</p>
                    <p className="text-[10px] text-text-muted">📅 {selectedSectionInfo.SCHEDULE}</p>
                  </div>
                )}

                <button onClick={() => markAll('PRESENT')} className="w-full btn-primary text-xs" id="mark-all-present">
                  ✓ All Present
                </button>
                <button onClick={() => markAll('ABSENT')} className="w-full bg-danger/20 border-2 border-danger/40 text-danger font-bold text-xs rounded-2xl py-2.5 hover:bg-danger/30 transition-all" id="mark-all-absent">
                  ✕ All Absent
                </button>
              </div>
            )}

            {/* Approvals Mode Stats */}
            {tab === 'approvals' && (
              <div className="space-y-3">
                <div className="glass-card rounded-2xl border-2 p-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-primary">{totalPendingStudents}</p>
                    <p className="text-xs font-bold text-text-muted mt-2">Students Pending</p>
                  </div>
                </div>
                <div className="glass-card rounded-2xl border-2 p-4">
                  <div className="text-center">
                    <p className="text-3xl font-black text-danger">{pendingDrops.length}</p>
                    <p className="text-xs font-bold text-text-muted mt-2">Drop Requests</p>
                  </div>
                </div>
                {approvalLoading && (
                  <div className="glass-card rounded-2xl border-2 p-4 text-center">
                    <p className="text-sm font-bold text-text-muted">Loading...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL: Main Content ───────────────────────── */}
          <div className="lg:col-span-3">
            
            {/* ── ATTENDANCE TAB ─────────────────────────────────── */}
            {tab === 'attendance' && (
              <>
                {loading ? (
                  <div className="space-y-3">
                    {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                  </div>
                ) : students.length === 0 && selectedSection ? (
                  <div className="glass-card text-center py-12 rounded-3xl border-2">
                    <p className="text-lg text-text-muted font-bold">No students registered in this section.</p>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-2">
                    {/* Bulk Actions */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button onClick={() => markAll('CANCELLED')} className="bg-warning/20 border-2 border-warning/40 text-warning font-bold text-xs rounded-lg py-2 hover:bg-warning/30">
                        ⊘ Mark Cancelled
                      </button>
                      <button onClick={handleSubmit} className="btn-primary text-xs" disabled={submitLoading} id="submit-attendance-btn">
                        {submitLoading ? 'Saving…' : 'Save Attendance'}
                      </button>
                    </div>

                    {/* Student List */}
                    {students.map((stu, i) => (
                      <div key={stu.STUDENT_ID} className="glass-card rounded-2xl border-2 p-3 animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {stu.FIRST_NAME?.[0]}{stu.LAST_NAME?.[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-text-main">{stu.FIRST_NAME} {stu.LAST_NAME}</p>
                              <p className="text-xs text-text-muted">{stu.STUDENT_ID}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {statusOptions.map((opt) => (
                              <button 
                                key={opt} 
                                onClick={() => handleStatusChange(stu.STUDENT_ID, opt)}
                                className={`rounded px-2 py-1.5 text-[11px] font-bold border transition-all ${
                                  attendanceState[stu.STUDENT_ID] === opt 
                                    ? statusColors[opt] + ' border-current' 
                                    : 'border-white/20 text-text-muted hover:border-white/40'
                                }`}
                              >
                                {opt === 'PRESENT' ? '✓' : opt === 'ABSENT' ? '✕' : '⊘'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {message.text && (
                      <div className={`p-3 rounded-2xl text-sm font-bold text-center ${
                        message.type === 'success' 
                          ? 'bg-success/20 text-success border-2 border-success/40' 
                          : 'bg-danger/20 text-danger border-2 border-danger/40'
                      }`}>
                        {message.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card text-center py-12 rounded-3xl border-2">
                    <p className="text-lg text-text-muted font-bold">📝 Select a section to mark attendance</p>
                  </div>
                )}
              </>
            )}

            {/* ── APPROVALS TAB ──────────────────────────────────── */}
            {tab === 'approvals' && (
              <>
                {approvalLoading ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                  </div>
                ) : totalPendingStudents === 0 && pendingDrops.length === 0 ? (
                  <div className="glass-card text-center py-12 rounded-3xl border-2">
                    <p className="text-lg text-text-muted font-bold">✅ No pending requests!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Registration Requests */}
                    {totalPendingStudents > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-text-main mb-3">Registration Requests ({totalPendingStudents})</h3>
                        <div className="space-y-3">
                          {Object.values(groupedApprovals).map((group) => {
                            const theoryCount = group.courses.filter(c => c.COURSE_TYPE === 'THEORY').length;
                            const practicalCount = group.courses.filter(c => c.COURSE_TYPE === 'PRACTICAL').length;
                            const isActionLoading = approvalActionLoading === group.studentId;

                            return (
                              <div key={group.studentId} className="glass-card rounded-2xl border-2 p-4 animate-fade-in-up">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                                      {group.firstName?.[0]}{group.lastName?.[0]}
                                    </div>
                                    <div>
                                      <p className="font-bold text-text-main">{group.firstName} {group.lastName}</p>
                                      <p className="text-xs text-text-muted">{group.email}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => openStudentDetail(group.studentId)} className="text-primary hover:text-primary/80 text-sm font-bold">
                                    👁 View
                                  </button>
                                </div>

                                <div className="mb-3 flex gap-2 text-xs font-bold">
                                  <span className="bg-primary/20 text-primary rounded px-2 py-1">📖 {theoryCount}T</span>
                                  <span className="bg-cyan-200/20 text-cyan-700 rounded px-2 py-1">🔬 {practicalCount}P</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {group.courses.map((c) => (
                                    <div key={c.REGISTRATION_ID} className="bg-white/5 rounded-lg p-2 border border-white/10">
                                      <p className="font-bold text-text-main">{c.COURSE_CODE}</p>
                                      <p className="text-[10px] text-text-muted">{c.COURSE_NAME}</p>
                                      <div className="mt-1 flex gap-1">
                                        <button onClick={() => handleApprove(c.REGISTRATION_ID)} className="flex-1 bg-success/30 text-success text-[10px] font-bold py-0.5 rounded hover:bg-success/40">✓</button>
                                        <button onClick={() => handleReject(c.REGISTRATION_ID)} className="flex-1 bg-danger/30 text-danger text-[10px] font-bold py-0.5 rounded hover:bg-danger/40">✕</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-3 flex gap-2">
                                  <button onClick={() => handleApproveStudent(group.studentId)} disabled={isActionLoading} className="flex-1 bg-success/20 text-success font-bold text-xs py-2 rounded-lg hover:bg-success/30">
                                    ✓ Approve All
                                  </button>
                                  <button onClick={() => handleRejectStudent(group.studentId)} disabled={isActionLoading} className="flex-1 bg-danger/20 text-danger font-bold text-xs py-2 rounded-lg hover:bg-danger/30">
                                    ✕ Reject All
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Drop Requests */}
                    {pendingDrops.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-text-main mb-3">Drop Requests ({pendingDrops.length})</h3>
                        <div className="space-y-2">
                          {pendingDrops.map((p) => (
                            <div key={p.REGISTRATION_ID} className="glass-card rounded-2xl border-2 border-danger/30 p-3 animate-fade-in-up">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/20 text-xs font-bold text-danger">
                                    {p.FIRST_NAME?.[0]}{p.LAST_NAME?.[0]}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-text-main">{p.FIRST_NAME} {p.LAST_NAME}</p>
                                    <p className="text-xs text-text-muted">{p.COURSE_CODE} — Sec {p.SECTION_NAME}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => handleApproveDrop(p.REGISTRATION_ID)} className="bg-danger/30 text-danger font-bold text-xs px-2 py-1 rounded hover:bg-danger/40">✓</button>
                                  <button onClick={() => handleRejectDrop(p.REGISTRATION_ID)} className="bg-white/10 text-text-muted font-bold text-xs px-2 py-1 rounded hover:bg-white/20">✕</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── Student Detail Modal ──────────────────────────── */}
      {(studentDetail || studentDetailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setStudentDetail(null)}>
          <div className="glass-card max-h-[85vh] w-full max-w-2xl overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main">Student Profile</h3>
              <button onClick={() => setStudentDetail(null)} className="text-text-muted hover:text-text-main text-lg">✕</button>
            </div>

            {studentDetailLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-6 rounded" />)}</div>
            ) : studentDetail ? (
              <>
                {/* Basic Info */}
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xl font-bold text-white">
                    {studentDetail.profile.FIRST_NAME?.[0]}{studentDetail.profile.LAST_NAME?.[0]}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-text-main">{studentDetail.profile.FIRST_NAME} {studentDetail.profile.LAST_NAME}</h4>
                    <p className="text-sm text-text-muted">{studentDetail.profile.EMAIL}</p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Enrollment Number', value: studentDetail.profile.ENROLLMENT_NUMBER || '—' },
                    { label: 'Department', value: studentDetail.profile.DEPT_NAME },
                    { label: 'Admission Year', value: studentDetail.profile.ADMISSION_YEAR },
                    { label: 'Current Semester', value: studentDetail.profile.SEMESTER },
                    { label: 'Batch Coordinator', value: studentDetail.profile.FA_NAME || '—' },
                    { label: 'Phone', value: studentDetail.profile.PHONE || '—' },
                  ].map((item, i) => (
                    <div key={i} className="rounded-xl bg-white/5 p-3">
                      <p className="text-xs text-text-muted">{item.label}</p>
                      <p className="text-sm font-semibold text-text-main">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Registered Courses */}
                <h5 className="mb-2 text-sm font-semibold text-text-main">Registered Courses ({studentDetail.registrations.length})</h5>
                <div className="mb-4 space-y-1">
                  {studentDetail.registrations.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${r.COURSE_TYPE === 'PRACTICAL' ? 'bg-accent' : 'bg-primary'}`}></span>
                        <span className="text-text-main">{r.COURSE_CODE} — {r.COURSE_NAME} (Sec {r.SECTION_NAME})</span>
                      </div>
                      <span className={`badge ${r.STATUS === 'ACTIVE' ? 'badge-present' : r.STATUS === 'PENDING' ? 'badge-pending' : 'badge-absent'}`}>
                        {r.STATUS}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Attendance Summary */}
                <h5 className="mb-2 text-sm font-semibold text-text-main">Recent Attendance ({studentDetail.attendance.length} records)</h5>
                {studentDetail.attendance.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {studentDetail.attendance.slice(0, 20).map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                        <span className="text-text-muted">
                          {new Date(a.ATTENDANCE_DATE).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {a.COURSE_CODE}
                        </span>
                        <span className={`badge ${a.STATUS === 'PRESENT' ? 'badge-present' : a.STATUS === 'ABSENT' ? 'badge-absent' : 'bg-white/10 text-white border-white/20'}`}>
                          {a.STATUS}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">No attendance records yet.</p>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
