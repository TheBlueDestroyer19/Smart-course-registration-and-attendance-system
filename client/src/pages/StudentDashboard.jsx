import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingReg, setLoadingReg] = useState(true);

  // Registration form
  const [showRegForm, setShowRegForm] = useState(false);
  const [courses, setCourses] = useState([]);
  const [semester, setSemester] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Multi-select cart: { courseId -> { courseId, courseCode, courseName, courseType, credits } }
  const [cart, setCart] = useState({});

  // Registration status summary
  const [statusSummary, setStatusSummary] = useState(null);

  // Attendance detail modal
  const [showAttModal, setShowAttModal] = useState(null);
  const [attDetail, setAttDetail] = useState([]);
  const [attDetailLoading, setAttDetailLoading] = useState(false);

  // Drop confirmation
  const [dropTarget, setDropTarget] = useState(null);

  // Print ref
  const printRef = useRef(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      const { data } = await api.get(`/lookup/student-course-details/${user.id}`);
      const seen = new Set();
      const unique = [];
      for (const row of data) {
        if (!seen.has(row.REGISTRATION_ID)) {
          seen.add(row.REGISTRATION_ID);
          unique.push(row);
        }
      }
      setRegistrations(unique);
      const pctMap = {};
      for (const reg of unique.filter((r) => r.STATUS === 'ACTIVE' && r.SECTION_ID)) {
        try {
          const res = await api.get(`/attendance/percentage/${user.id}/${reg.SECTION_ID}`);
          pctMap[reg.SECTION_ID] = res.data.percentage;
        } catch { pctMap[reg.SECTION_ID] = null; }
      }
      setAttendanceMap(pctMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReg(false);
    }
  }, [user.id]);

  const fetchStatusSummary = useCallback(async () => {
    try {
      const { data } = await api.get(`/registration/status-summary/${user.id}`);
      setStatusSummary(data);
    } catch (err) {
      console.error(err);
    }
  }, [user.id]);

  useEffect(() => { fetchRegistrations(); fetchStatusSummary(); }, [fetchRegistrations, fetchStatusSummary]);

  // Load active semester (admin-controlled)
  useEffect(() => {
    api.get('/lookup/active-semester').then(({ data }) => {
      setSemester(data.semester || '');
    }).catch(console.error);
  }, []);

  // Load courses filtered by student's semester
  useEffect(() => {
    if (showRegForm && user.id) {
      api.get(`/lookup/courses?studentId=${user.id}`).then(({ data }) => setCourses(data)).catch(console.error);
    }
  }, [showRegForm, user.id]);

  // Cart management — keyed by courseId
  const addToCart = (course) => {
    setCart(prev => ({
      ...prev,
      [course.COURSE_ID]: {
        courseId: course.COURSE_ID,
        courseCode: course.COURSE_CODE,
        courseName: course.COURSE_NAME,
        courseType: course.COURSE_TYPE,
        credits: course.CREDITS,
      }
    }));
  };

  const removeFromCart = (courseId) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
  };

  const isCourseInCart = (courseId) => {
    return !!cart[courseId];
  };

  // Count by type
  const cartTheory = Object.values(cart).filter(c => c.courseType === 'THEORY').length;
  const cartPractical = Object.values(cart).filter(c => c.courseType === 'PRACTICAL').length;
  const existingTheory = statusSummary?.theoryCount || 0;
  const existingPractical = statusSummary?.practicalCount || 0;

  const handleBulkRegister = async () => {
    const courseIds = Object.keys(cart).map(Number);
    if (courseIds.length === 0) return;

    setRegError(''); setRegSuccess(''); setRegLoading(true);
    try {
      const { data } = await api.post('/registration/bulk', { courseIds });
      setRegSuccess(data.message);
      setCart({});
      setShowRegForm(false);
      fetchRegistrations();
      fetchStatusSummary();
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed.');
    } finally { setRegLoading(false); }
  };

  const handleDrop = async () => {
    if (!dropTarget) return;
    try {
      await api.delete(`/registration/${dropTarget}`);
      setDropTarget(null);
      fetchRegistrations();
      fetchStatusSummary();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to drop.');
      setDropTarget(null);
    }
  };

  const openAttendanceDetail = async (sectionId) => {
    setShowAttModal(sectionId);
    setAttDetailLoading(true);
    try {
      const { data } = await api.get(`/attendance/student/${user.id}`);
      setAttDetail(data.filter((a) => a.SECTION_ID === sectionId));
    } catch (err) { console.error(err); }
    finally { setAttDetailLoading(false); }
  };

  const getPctColor = (pct) => {
    if (pct === null || pct === undefined) return 'text-text-muted';
    if (pct >= 75) return 'text-success';
    if (pct >= 50) return 'text-warning';
    return 'text-danger';
  };

  const statusBadge = (status) => {
    const map = { PRESENT: 'badge-present', ABSENT: 'badge-absent', CANCELLED: 'bg-white/10 text-white border-white/20' };
    return map[status] || '';
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Registration Form - ${user.firstName} ${user.lastName}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
        h1 { text-align: center; margin-bottom: 4px; font-size: 22px; }
        h2 { text-align: center; margin-bottom: 20px; font-size: 16px; color: #555; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
        .info div { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; font-size: 13px; }
        th { background-color: #f0f0f0; font-weight: 600; }
        .type-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
        .theory { background: #dbeafe; color: #1e40af; }
        .practical { background: #dcfce7; color: #166534; }
        .footer { margin-top: 60px; display: flex; justify-content: space-between; }
        .footer div { text-align: center; width: 200px; }
        .footer .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 13px; }
        .status { font-weight: bold; color: #16a34a; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const activeRegs = registrations.filter(r => r.STATUS === 'ACTIVE');
  const pendingRegs = registrations.filter(r => r.STATUS === 'PENDING');
  const currentSemRegs = registrations.filter(r => r.SEMESTER === semester && r.STATUS !== 'DROPPED' && r.STATUS !== 'REJECTED' && r.STATUS !== 'CANCELLED');

  // Group courses by type for display
  const theoryCourses = courses.filter(c => c.COURSE_TYPE === 'THEORY');
  const practicalCourses = courses.filter(c => c.COURSE_TYPE === 'PRACTICAL');

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* ── LEFT PANEL: Status & Quick Stats ────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Welcome Card */}
            <div className="glass-card rounded-3xl border-2">
              <div className="text-center">
                <div className="text-5xl mb-2">👋</div>
                <h2 className="text-xl font-black bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{user.firstName}!</h2>
                <p className="text-xs text-text-muted font-semibold mt-2">Welcome back to your academic portal</p>
              </div>
            </div>

            {/* Status Summary */}
            {statusSummary && statusSummary.status !== 'NOT_REGISTERED' && statusSummary.status !== 'NO_SEMESTER' && (
              <div className={`rounded-3xl border-2 p-4 animate-fade-in-up ${
                statusSummary.status === 'APPROVED' ? 'border-success/40 bg-gradient-to-br from-green-50 to-green-100/50' :
                statusSummary.status === 'PENDING' ? 'border-warning/40 bg-gradient-to-br from-yellow-50 to-orange-100/50' :
                'border-primary/40 bg-gradient-to-br from-pink-50 to-orange-50'
              }`}>
                <div className="text-center">
                  <span className="text-3xl mb-2 block">
                    {statusSummary.status === 'APPROVED' ? '✅' : statusSummary.status === 'PENDING' ? '⏳' : '📋'}
                  </span>
                  <p className={`font-bold text-sm mb-2 ${
                    statusSummary.status === 'APPROVED' ? 'text-green-700' :
                    statusSummary.status === 'PENDING' ? 'text-orange-700' : 'text-primary'
                  }`}>
                    {statusSummary.status === 'APPROVED' ? 'APPROVED' :
                      statusSummary.status === 'PENDING' ? 'PENDING' :
                      'IN PROGRESS'}
                  </p>
                  <p className="text-xs text-text-muted font-semibold">
                    {statusSummary.theoryCount}T / {statusSummary.practicalCount}P
                  </p>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="glass-card rounded-2xl border-2 p-4 text-center">
                <p className="text-2xl font-black bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">{activeRegs.length}</p>
                <p className="text-xs font-bold text-text-muted mt-1">Active Courses</p>
              </div>
              <div className="glass-card rounded-2xl border-2 p-4 text-center">
                <p className="text-2xl font-black bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">{pendingRegs.length}</p>
                <p className="text-xs font-bold text-text-muted mt-1">Pending Approval</p>
              </div>
              <div className="glass-card rounded-2xl border-2 p-4 text-center">
                <p className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
                  {activeRegs.reduce((a, r) => a + (r.CREDITS || 0), 0)}
                </p>
                <p className="text-xs font-bold text-text-muted mt-1">Total Credits</p>
              </div>
              <div className="glass-card rounded-2xl border-2 p-4 text-center">
                <p className="text-2xl font-black bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">
                  {(() => { const vals = Object.values(attendanceMap).filter(v => v !== null); return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(0) : '—'; })()}%
                </p>
                <p className="text-xs font-bold text-text-muted mt-1">Avg Attendance</p>
              </div>
            </div>

            {/* Semester Info */}
            {semester && (
              <div className="glass-card rounded-2xl border-2 p-4 text-center bg-gradient-to-br from-accent/10 to-cyan-100/10">
                <p className="text-lg font-black text-accent">📅</p>
                <p className="text-sm font-bold text-text-main mt-2">{semester}</p>
                <p className="text-xs text-text-muted font-semibold mt-1">Active Semester</p>
              </div>
            )}

            {/* Action Button */}
            <button 
              onClick={() => { setShowRegForm(!showRegForm); setRegError(''); setRegSuccess(''); setCart({}); }} 
              className={`w-full py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                showRegForm 
                  ? 'bg-danger/20 border-danger/40 text-danger hover:bg-danger/30' 
                  : 'btn-primary border-primary/40 w-full'
              }`}
              id="register-course-btn"
            >
              {showRegForm ? '✕ Cancel' : '+ Register New'}
            </button>

            {statusSummary?.status === 'APPROVED' && (
              <button onClick={handlePrint} className="w-full btn-ghost text-xs" id="print-reg-form">
                🖨️ Print Form
              </button>
            )}
          </div>

          {/* ── CENTER/RIGHT PANEL: Registration Form & Courses ─── */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Registration Form */}
            {showRegForm && (
              <div className="glass-card rounded-3xl border-2 animate-fade-in-up">
                <div className="mb-4">
                  <h4 className="font-bold text-lg text-text-main mb-2">📝 Course Registration</h4>
                  <p className="text-xs text-text-muted">Select theory and practical courses for {semester}</p>
                </div>

                {/* Instructions */}
                <div className="mb-4 rounded-2xl bg-yellow-100/50 border-2 border-warning/40 p-3 text-xs text-text-main space-y-1">
                  <p>✓ Select up to <strong>6 Theory</strong> + <strong>4 Practical</strong> courses</p>
                  <p>✓ Submit for Batch Coordinator approval</p>
                </div>

                {/* Counters */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl px-3 py-2 text-center border-2 text-xs font-bold ${
                    (existingTheory + cartTheory) > 6 ? 'border-danger/60 bg-red-100 text-red-700' : 'border-primary/40 bg-pink-50 text-primary'
                  }`}>
                    <p className="text-lg">📖</p>
                    <p className="mt-1">{existingTheory + cartTheory}/6 Theory</p>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-center border-2 text-xs font-bold ${
                    (existingPractical + cartPractical) > 4 ? 'border-danger/60 bg-red-100 text-red-700' : 'border-cyan-400/40 bg-cyan-50 text-cyan-700'
                  }`}>
                    <p className="text-lg">🔬</p>
                    <p className="mt-1">{existingPractical + cartPractical}/4 Practical</p>
                  </div>
                </div>

                {/* Theory Courses */}
                {theoryCourses.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-primary mb-2 bg-pink-50 rounded-lg p-2">📖 THEORY COURSES</p>
                    <div className="space-y-2">
                      {theoryCourses.map(course => {
                        const alreadyRegistered = currentSemRegs.some(r => r.COURSE_CODE === course.COURSE_CODE);
                        const inCart = isCourseInCart(course.COURSE_ID);
                        const disabled = alreadyRegistered || ((existingTheory + cartTheory) >= 6 && !inCart);
                        return (
                          <CourseSelectRow key={course.COURSE_ID} course={course} inCart={inCart} disabled={disabled} alreadyRegistered={alreadyRegistered} onAdd={() => addToCart(course)} onRemove={() => removeFromCart(course.COURSE_ID)} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Practical Courses */}
                {practicalCourses.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-cyan-700 mb-2 bg-cyan-50 rounded-lg p-2">🔬 PRACTICAL COURSES</p>
                    <div className="space-y-2">
                      {practicalCourses.map(course => {
                        const alreadyRegistered = currentSemRegs.some(r => r.COURSE_CODE === course.COURSE_CODE);
                        const inCart = isCourseInCart(course.COURSE_ID);
                        const disabled = alreadyRegistered || ((existingPractical + cartPractical) >= 4 && !inCart);
                        return (
                          <CourseSelectRow key={course.COURSE_ID} course={course} inCart={inCart} disabled={disabled} alreadyRegistered={alreadyRegistered} onAdd={() => addToCart(course)} onRemove={() => removeFromCart(course.COURSE_ID)} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Courses & Submit */}
                {Object.keys(cart).length > 0 && (
                  <div className="mt-4 rounded-2xl bg-pink-50 border-2 border-primary/40 p-3">
                    <p className="text-xs font-bold text-text-main mb-2">✓ SELECTED ({Object.keys(cart).length})</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {Object.values(cart).map(item => (
                        <span key={item.courseId} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-100 to-orange-100 border border-primary/30 px-2.5 py-1 text-xs font-semibold">
                          <strong>{item.courseCode}</strong>
                          <button onClick={() => removeFromCart(item.courseId)} className="text-danger hover:text-danger/80 font-bold">✕</button>
                        </span>
                      ))}
                    </div>
                    <button onClick={handleBulkRegister} className="w-full btn-primary text-xs font-bold" disabled={regLoading} id="apply-for-registration">
                      {regLoading ? '⏳ Submitting…' : '📝 APPLY FOR REGISTRATION'}
                    </button>
                  </div>
                )}

                {regError && <p className="mt-2 text-xs font-bold text-red-700 bg-red-100 rounded-lg p-2">{regError}</p>}
                {regSuccess && <p className="mt-2 text-xs font-bold text-green-700 bg-green-100 rounded-lg p-2">✅ {regSuccess}</p>}
              </div>
            )}

            {/* Courses Grid */}
            {loadingReg ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-48 rounded-3xl" />)}
              </div>
            ) : registrations.length === 0 ? (
              <div className="glass-card text-center py-12 rounded-3xl border-2">
                <p className="text-lg text-text-muted font-bold">📚 No courses yet. Register to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registrations.map((reg, i) => (
                  <div 
                    key={reg.REGISTRATION_ID} 
                    className="glass-card rounded-2xl border-2 overflow-hidden animate-fade-in-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* Top Bar */}
                    <div className={`h-1 w-full ${reg.COURSE_TYPE === 'PRACTICAL' ? 'bg-cyan-400' : 'bg-primary'}`}></div>
                    
                    <div className="p-4">
                      {/* Header */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{reg.COURSE_CODE}</h4>
                            <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${
                              reg.COURSE_TYPE === 'PRACTICAL' ? 'bg-cyan-100 text-cyan-700' : 'bg-pink-100 text-primary'
                            }`}>
                              {reg.COURSE_TYPE === 'PRACTICAL' ? 'PRAC' : 'THY'}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted font-semibold mt-1">{reg.COURSE_NAME}</p>
                        </div>
                        {reg.SEMESTER === semester && (
                          <span className={`badge text-[10px] font-bold ${
                            reg.STATUS === 'ACTIVE' ? 'badge-present' : 
                            reg.STATUS === 'PENDING' ? 'badge-pending' : 
                            'badge-absent'
                          }`}>{reg.STATUS}</span>
                        )}
                      </div>

                      {/* Info Grid */}
                      <div className="mb-3 grid grid-cols-3 gap-2 text-[10px]">
                        <div className="rounded-lg bg-pink-50 border border-primary/20 p-1.5 text-center">
                          <p className="font-bold text-text-main">{reg.SECTION_NAME || 'TBA'}</p>
                          <p className="text-text-muted">Sec</p>
                        </div>
                        <div className="rounded-lg bg-cyan-50 border border-cyan-300/20 p-1.5 text-center">
                          <p className="font-bold text-cyan-700">{reg.CREDITS}</p>
                          <p className="text-text-muted">Cred</p>
                        </div>
                        <div className="rounded-lg bg-orange-50 border border-orange-300/20 p-1.5 text-center">
                          <p className="font-bold text-orange-700">{reg.SEMESTER}</p>
                          <p className="text-text-muted">Sem</p>
                        </div>
                      </div>

                      {/* Attendance */}
                      {reg.STATUS === 'ACTIVE' && reg.SECTION_ID && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold text-text-main">Attendance</span>
                            <span className={`font-bold text-xs ${getPctColor(attendanceMap[reg.SECTION_ID])}`}>
                              {attendanceMap[reg.SECTION_ID] != null ? `${attendanceMap[reg.SECTION_ID]}%` : '—'}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-pink-500" 
                              style={{ width: `${attendanceMap[reg.SECTION_ID] || 0}%` }} 
                            />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {reg.STATUS === 'ACTIVE' && reg.SECTION_ID && (
                          <button onClick={() => openAttendanceDetail(reg.SECTION_ID)} className="flex-1 text-[10px] text-primary font-bold hover:bg-primary/10 rounded py-1.5 transition-all">
                            📋 Att
                          </button>
                        )}
                        {reg.STATUS === 'ACTIVE' && reg.SEMESTER === semester && (
                          <button onClick={() => setDropTarget(reg.REGISTRATION_ID)} className="flex-1 text-[10px] font-bold text-red-700 bg-red-100 rounded py-1.5 hover:bg-red-200 transition-all">
                            🗑️ Drop
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Printable Registration Form (hidden) ────────── */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <h1>VNIT Nagpur — Semester Course Registration Form</h1>
          <h2>{semester}</h2>
          <div className="info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
            <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
            <div><strong>Student ID:</strong> {user.id}</div>
            <div><strong>Status:</strong> <span className="status">{statusSummary?.status}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Course Code</th>
                <th>Course Name</th>
                <th>Type</th>
                <th>Section</th>
                <th>Credits</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentSemRegs.map((reg, i) => (
                <tr key={reg.REGISTRATION_ID}>
                  <td>{i + 1}</td>
                  <td>{reg.COURSE_CODE}</td>
                  <td>{reg.COURSE_NAME}</td>
                  <td><span className={`type-badge ${reg.COURSE_TYPE === 'PRACTICAL' ? 'practical' : 'theory'}`}>
                    {reg.COURSE_TYPE}
                  </span></td>
                  <td>{reg.SECTION_NAME || 'Pending'}</td>
                  <td>{reg.CREDITS}</td>
                  <td>{reg.STATUS}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '16px', fontSize: '13px' }}>
            <strong>Total Credits:</strong> {currentSemRegs.reduce((a, r) => a + (r.CREDITS || 0), 0)} &nbsp;|&nbsp;
            <strong>Theory:</strong> {currentSemRegs.filter(r => r.COURSE_TYPE === 'THEORY').length} &nbsp;|&nbsp;
            <strong>Practical:</strong> {currentSemRegs.filter(r => r.COURSE_TYPE === 'PRACTICAL').length}
          </p>
          <div className="footer" style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div className="line" style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '4px', fontSize: '13px' }}>Student Signature</div>
            </div>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div className="line" style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '4px', fontSize: '13px' }}>Batch Coordinator</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Attendance Detail Modal ─────────────────────── */}
      {showAttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAttModal(null)}>
          <div className="glass-card max-h-[80vh] w-full max-w-xl overflow-y-auto animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-main">Attendance Details</h3>
              <button onClick={() => setShowAttModal(null)} className="text-text-muted hover:text-text-main text-lg">✕</button>
            </div>
            {attDetailLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
            ) : attDetail.length === 0 ? (
              <p className="text-text-muted text-sm">No attendance records yet.</p>
            ) : (
              <>
                {/* Summary */}
                <div className="mb-4 flex gap-4 text-sm">
                  <span className="text-success">Present: <strong>{attDetail.filter(a => a.STATUS === 'PRESENT').length}</strong></span>
                  <span className="text-danger">Absent: <strong>{attDetail.filter(a => a.STATUS === 'ABSENT').length}</strong></span>
                  <span className="text-text-muted">Cancelled: <strong>{attDetail.filter(a => a.STATUS === 'CANCELLED').length}</strong></span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-text-muted">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Course</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attDetail.map((a, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 text-text-main">{new Date(a.ATTENDANCE_DATE).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-2 text-text-muted">{a.COURSE_CODE} — {a.SECTION_NAME}</td>
                        <td className="py-2 text-right"><span className={`badge ${statusBadge(a.STATUS)}`}>{a.STATUS}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Drop Confirmation Modal ─────────────────────── */}
      {dropTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm animate-fade-in-up text-center">
            <h3 className="mb-2 text-lg font-bold text-text-main">Request Drop</h3>
            <p className="mb-6 text-sm text-text-muted">Are you sure you want to request to drop this course? Batch Coordinator approval is required.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setDropTarget(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleDrop} className="rounded-xl bg-danger px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-danger/80" disabled={regLoading}>
                {regLoading ? 'Submitting…' : 'Confirm Drop Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: Course Selection Row (no section selection) ──
function CourseSelectRow({ course, inCart, disabled, alreadyRegistered, onAdd, onRemove }) {
  return (
    <div className={`rounded-xl border transition-all ${
      alreadyRegistered ? 'border-success/20 bg-success/5 opacity-60' :
      inCart ? 'border-primary/30 bg-primary/5' :
      'border-white/10 bg-white/[0.02] hover:border-white/20'
    }`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-text-main text-sm">{course.COURSE_CODE}</span>
            <span className="text-text-muted text-sm ml-2">{course.COURSE_NAME}</span>
            <span className="ml-2 text-xs text-text-muted">({course.CREDITS} cr)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {alreadyRegistered && (
            <span className="rounded-md bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">ALREADY REGISTERED</span>
          )}
          {!alreadyRegistered && inCart && (
            <button onClick={onRemove}
              className="rounded-lg bg-danger/20 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/30 transition-all">
              Remove ✕
            </button>
          )}
          {!alreadyRegistered && !inCart && (
            <button onClick={onAdd}
              disabled={disabled}
              className="rounded-lg bg-primary/20 px-3 py-1 text-xs font-semibold text-primary-light hover:bg-primary/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
