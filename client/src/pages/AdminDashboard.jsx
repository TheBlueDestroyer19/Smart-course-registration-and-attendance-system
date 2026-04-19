import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview'); // 'overview' | 'people' | 'fa-assignment' | 'section-assignment'
  
  // Semester State
  const [activeSemester, setActiveSemester] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [newSemesterStr, setNewSemesterStr] = useState('');
  const [showAddSemester, setShowAddSemester] = useState(false);
  
  // Data State
  const [courses, setCourses] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [adminInstructors, setAdminInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Course Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    courseCode: '',
    courseName: '',
    deptId: '',
    credits: 3,
    description: '',
    courseType: 'THEORY',
    targetSemester: 1
  });

  // Section Modal State
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newSection, setNewSection] = useState({
    courseId: '',
    sectionName: 'A',
    semester: '',
    capacity: 60,
    room: '',
    schedule: '',
    coordinatorId: ''
  });

  // People Management Modal State
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [newInstructor, setNewInstructor] = useState({
    firstName: '',
    lastName: '',
    email: '',
    deptId: '',
    designation: 'Assistant Professor',
    phone: '',
  });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    deptId: '',
    admissionYear: '',
    phone: '',
    dob: '',
  });

  // Section Assignment
  const [unassignedRegs, setUnassignedRegs] = useState([]);
  const [sectionOptions, setSectionOptions] = useState({});  // keyed by courseId
  const [assignLoading, setAssignLoading] = useState(null);

  // FA Assignment
  const [faFilter, setFaFilter] = useState({ dept: '', unassignedOnly: false });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedFA, setSelectedFA] = useState('');
  const [faActionLoading, setFaActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [semListRes, semRes, dptRes, crsRes, regRes, instrRes, adminInstrRes, stuRes] = await Promise.all([
        api.get('/admin/semester-list').catch(() => ({ data: [] })),
        api.get('/admin/semester').catch(() => ({ data: {} })),
        api.get('/lookup/departments').catch(() => ({ data: [] })),
        api.get('/admin/courses').catch(() => ({ data: [] })),
        api.get('/admin/registrations').catch(() => ({ data: [] })),
        api.get('/lookup/instructors').catch(() => ({ data: [] })),
        api.get('/admin/instructors'),
        api.get('/admin/students').catch(() => ({ data: [] })),
      ]);
      
      setSemesters(semListRes.data);
      setActiveSemester(semRes.data.SEMESTER || '');
      setDepartments(dptRes.data);
      setCourses(crsRes.data);
      setRegistrations(regRes.data);
      setInstructors(instrRes.data);
      setAdminInstructors(adminInstrRes.data);
      setStudents(stuRes.data);
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || 'Failed to load admin data.');
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSemester) {
      setNewSection(prev => ({ ...prev, semester: activeSemester }));
    }
  }, [activeSemester]);

  const handleSetSemester = async (sem) => {
    try {
      await api.put('/admin/semester', { semester: sem });
      setActiveSemester(sem);
      setMessage(`Active semester updated to ${sem}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update active semester.');
    }
  };

  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!newSemesterStr.trim()) return;
    try {
      await api.post('/admin/semester-list', { semester: newSemesterStr });
      setMessage(`Semester ${newSemesterStr.toUpperCase()} added.`);
      setNewSemesterStr('');
      setShowAddSemester(false);
      fetchData(); // refresh list
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add semester.');
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const courseData = {
        ...newCourse,
        credits: Number(newCourse.credits),
        targetSemester: Number(newCourse.targetSemester)
      };
      await api.post('/admin/courses', courseData);
      setMessage(`Course ${newCourse.courseCode.toUpperCase()} added.`);
      setShowCourseModal(false);
      setNewCourse({ courseCode: '', courseName: '', deptId: '', credits: 3, description: '', courseType: 'THEORY', targetSemester: 1 });
      fetchData(); // refresh courses
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add course.');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/sections', newSection);
      setMessage(`Section ${newSection.sectionName} added.`);
      setShowSectionModal(false);
      setNewSection({ ...newSection, sectionName: 'A', room: '', schedule: '', coordinatorId: '' });
      fetchData(); // refresh courses
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add section.');
    }
  };

  const handleDeleteCourse = async (courseId, courseCode) => {
    if (!courseId) return;
    const ok = window.confirm(`Delete course ${courseCode}? This will also delete its sections/registrations/attendance.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/courses/${courseId}`);
      setMessage(`Course ${courseCode} deleted.`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course.');
    }
  };

  const handleDeleteSection = async (sectionId, courseCode, sectionName) => {
    if (!sectionId) return;
    const ok = window.confirm(`Delete section ${courseCode} - ${sectionName}? This will also delete registrations/attendance for this section.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/sections/${sectionId}`);
      setMessage(`Section ${courseCode}-${sectionName} deleted.`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete section.');
    }
  };

  const handleAddInstructor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/instructors', newInstructor);
      setMessage(`Instructor ${newInstructor.firstName} added.`);
      setShowInstructorModal(false);
      setNewInstructor({ firstName: '', lastName: '', email: '', deptId: '', designation: 'Assistant Professor', phone: '' });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add instructor.');
    }
  };

  const handleDeleteInstructor = async (instructorId, name) => {
    const ok = window.confirm(`Delete instructor ${name}? This is blocked if they are referenced in sections/FA/attendance.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/instructors/${instructorId}`);
      setMessage(`Instructor ${name} deleted.`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete instructor.');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students', newStudent);
      setMessage(`Student ${newStudent.firstName} added.`);
      setShowStudentModal(false);
      setNewStudent({ firstName: '', lastName: '', email: '', deptId: '', admissionYear: '', phone: '', dob: '' });
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add student.');
    }
  };

  const handleDeleteStudent = async (studentId, name) => {
    const ok = window.confirm(`Delete student ${name}? This is blocked if they have registrations/attendance.`);
    if (!ok) return;
    try {
      await api.delete(`/admin/students/${studentId}`);
      setMessage(`Student ${name} deleted.`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete student.');
    }
  };

  // FA Assignment
  const handleAssignFA = async () => {
    if (selectedStudents.length === 0 || !selectedFA) return;
    setFaActionLoading(true);
    try {
      await api.put('/admin/bulk-assign-fa', { studentIds: selectedStudents, instructorId: Number(selectedFA) });
      setMessage(`FA assigned to ${selectedStudents.length} student(s).`);
      setSelectedStudents([]);
      setSelectedFA('');
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign FA.');
    } finally { setFaActionLoading(false); }
  };

  // Fetch unassigned registrations for section assignment tab
  const fetchUnassignedRegs = async () => {
    try {
      const { data } = await api.get('/admin/unassigned-registrations');
      setUnassignedRegs(data);
      // Prefetch sections for each unique course
      const courseIds = [...new Set(data.map(r => r.COURSE_ID))];
      for (const cid of courseIds) {
        if (!sectionOptions[cid]) {
          try {
            const secRes = await api.get(`/lookup/sections?courseId=${cid}&semester=${activeSemester}`);
            setSectionOptions(prev => ({ ...prev, [cid]: secRes.data }));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Fetch unassigned registrations error:', err);
    }
  };

  const handleAssignSection = async (registrationId, sectionId) => {
    if (!sectionId) return;
    setAssignLoading(registrationId);
    try {
      await api.put('/admin/assign-section', { registrationId, sectionId: Number(sectionId) });
      setMessage('Section assigned successfully.');
      fetchUnassignedRegs();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign section.');
    } finally {
      setAssignLoading(null);
    }
  };

  useEffect(() => {
    if (tab === 'section-assignment') fetchUnassignedRegs();
  }, [tab]);

  const toggleStudent = (sid) => {
    setSelectedStudents(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);
  };

  const selectAllFiltered = () => {
    const ids = filteredStudents.map(s => s.STUDENT_ID);
    setSelectedStudents(ids);
  };

  // Filter students for FA assignment tab
  const filteredStudents = students.filter(s => {
    if (faFilter.dept && s.DEPT_NAME !== faFilter.dept) return false;
    if (faFilter.unassignedOnly && s.FA_ID) return false;
    return true;
  });

  // Group courses by course_code
  const courseGroups = courses.reduce((acc, row) => {
    const key = row.COURSE_CODE;
    if (!acc[key]) acc[key] = { code: row.COURSE_CODE, name: row.COURSE_NAME, credits: row.CREDITS, dept: row.DEPT_NAME, courseType: row.COURSE_TYPE, sections: [] };
    if (row.SECTION_ID) acc[key].sections.push(row);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main className="px-4 py-8 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* ── LEFT PANEL: Nav & Quick Stats ──────────────────── */}
          <div className="lg:col-span-1 space-y-6">
            {/* Header */}
            <div className="glass-card rounded-3xl border-2 text-center">
              <div className="text-4xl mb-2">⚙️</div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">Admin Control</h2>
              <p className="text-xs text-text-muted mt-2 font-semibold">System Management</p>
            </div>

            {/* Tab Navigation - Vertical */}
            <div className="glass-card rounded-3xl border-2 p-0 overflow-hidden space-y-0">
              {[
                { key: 'overview', label: '📊 Overview' },
                { key: 'people', label: '👥 People' },
                { key: 'fa-assignment', label: '🎯 Coordinators' },
                { key: 'section-assignment', label: '📋 Sections' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full text-left px-4 py-3 text-sm font-bold border-b transition-all last:border-b-0 ${
                    tab === t.key
                      ? 'bg-gradient-to-r from-primary via-pink-500 to-orange-400 text-white'
                      : 'text-text-main hover:bg-primary/5'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Semester Control */}
            <div className="glass-card rounded-2xl border-2 p-4">
              <p className="text-xs font-bold text-text-muted mb-2 uppercase">Active Semester</p>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-lg font-black text-primary">{activeSemester || '—'}</span>
                {showAddSemester && (
                  <button onClick={() => setShowAddSemester(false)} className="text-xs text-text-muted hover:text-text-main">✕</button>
                )}
              </div>
              {showAddSemester ? (
                <form onSubmit={handleAddSemester} className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="e.g. SUMMER-2026" 
                    value={newSemesterStr} 
                    onChange={(e) => setNewSemesterStr(e.target.value)}
                    className="input-field !text-xs !py-2 !mb-0"
                    required
                  />
                  <button type="submit" className="w-full btn-primary text-xs !py-2">Add</button>
                </form>
              ) : (
                <button onClick={() => setShowAddSemester(true)} className="w-full btn-ghost text-xs !py-2">+ New Semester</button>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="glass-card rounded-2xl border-2 p-3">
                <p className="text-2xl font-black text-primary">{Object.keys(courseGroups).length}</p>
                <p className="text-xs font-bold text-text-muted mt-1">Courses</p>
              </div>
              <div className="glass-card rounded-2xl border-2 p-3">
                <p className="text-2xl font-black text-cyan-700">{adminInstructors.length}</p>
                <p className="text-xs font-bold text-text-muted mt-1">Faculty</p>
              </div>
              <div className="glass-card rounded-2xl border-2 p-3">
                <p className="text-2xl font-black text-orange-600">{students.length}</p>
                <p className="text-xs font-bold text-text-muted mt-1">Students</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button onClick={() => setShowCourseModal(true)} className="w-full btn-primary text-xs !py-2 flex justify-center items-center gap-1">
                <span>+</span> Add Course
              </button>
              <button onClick={() => setShowInstructorModal(true)} className="w-full bg-cyan-500/20 border-2 border-cyan-500/40 text-cyan-700 font-bold text-xs rounded-2xl py-2 hover:bg-cyan-500/30 transition-all">
                + Add Faculty
              </button>
              <button onClick={() => setShowStudentModal(true)} className="w-full bg-orange-500/20 border-2 border-orange-500/40 text-orange-700 font-bold text-xs rounded-2xl py-2 hover:bg-orange-500/30 transition-all">
                + Add Student
              </button>
            </div>
          </div>

          {/* ── RIGHT PANEL: Content ───────────────────────────── */}
          <div className="lg:col-span-3">
            
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
            ) : tab === 'overview' ? (
              <div className="space-y-6 animate-fade-in-up">
                {/* Semesters */}
                <div className="glass-card rounded-2xl border-2 p-4">
                  <p className="text-sm font-bold text-text-main mb-3">Available Semesters</p>
                  <div className="flex flex-wrap gap-2">
                    {semesters.length === 0 ? (
                      <span className="text-xs text-text-muted">No semesters configured</span>
                    ) : (
                      semesters.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleSetSemester(s.value)}
                          className={`rounded-lg text-xs font-bold px-3 py-1.5 border-2 transition-all ${
                            activeSemester === s.value
                              ? 'border-primary bg-primary/20 text-primary-light'
                              : 'border-white/20 text-text-muted hover:border-primary/40'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Courses Grid */}
                <div>
                  <h3 className="text-lg font-bold text-text-main mb-3">Courses & Sections ({Object.keys(courseGroups).length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.values(courseGroups).length === 0 ? (
                      <div className="col-span-full text-center text-text-muted py-8">No courses</div>
                    ) : (
                      Object.values(courseGroups).map((cg) => (
                        <div key={cg.code} className="glass-card rounded-2xl border-2 p-3 animate-fade-in-up">
                          <div className="mb-2">
                            <p className="font-bold text-text-main text-sm">{cg.code}</p>
                            <p className="text-xs text-text-muted">{cg.name}</p>
                          </div>
                          <div className="flex gap-2 mb-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              cg.courseType === 'PRACTICAL' ? 'bg-cyan-200/30 text-cyan-700' : 'bg-pink-200/30 text-primary'
                            }`}>
                              {cg.courseType === 'PRACTICAL' ? '🔬 PRAC' : '📖 THY'}
                            </span>
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">{cg.credits}cr</span>
                          </div>
                          <p className="text-[10px] text-text-muted mb-2">{cg.sections.length} section(s)</p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const anyRow = cg.sections[0] || courses.find(c => c.COURSE_CODE === cg.code);
                                handleDeleteCourse(anyRow?.COURSE_ID, cg.code);
                              }}
                              className="flex-1 bg-danger/20 text-danger text-[10px] font-bold py-1 rounded hover:bg-danger/30"
                            >
                              🗑 Delete
                            </button>
                            <button 
                              onClick={() => {
                                setNewSection({...newSection, courseId: cg.sections[0]?.COURSE_ID || courses.find(c => c.COURSE_CODE === cg.code).COURSE_ID, semester: activeSemester});
                                setShowSectionModal(true);
                              }}
                              className="flex-1 bg-primary/20 text-primary text-[10px] font-bold py-1 rounded hover:bg-primary/30"
                            >
                              + Sec
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Registrations */}
                <div>
                  <h3 className="text-lg font-bold text-text-main mb-3">Latest Registrations</h3>
                  <div className="glass-card rounded-2xl border-2 p-3 max-h-96 overflow-y-auto">
                    <div className="space-y-2">
                      {registrations.slice(0, 15).map((r, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/10 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-text-main">{r.STUDENT_NAME}</p>
                              <p className="text-text-muted">{r.COURSE_CODE}</p>
                            </div>
                            <span className={`badge text-[10px] ${r.STATUS === 'ACTIVE' ? 'badge-present' : 'badge-pending'}`}>
                              {r.STATUS}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : tab === 'people' ? (
              <div className="space-y-6 animate-fade-in-up">
                {/* Faculty Table */}
                <div>
                  <h3 className="text-lg font-bold text-text-main mb-3">Faculty ({adminInstructors.length})</h3>
                  <div className="glass-card rounded-2xl border-2 overflow-hidden">
                    <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                      {adminInstructors.length === 0 ? (
                        <div className="p-4 text-center text-text-muted text-sm">No faculty</div>
                      ) : (
                        adminInstructors.map((i) => (
                          <div key={i.INSTRUCTOR_ID} className="p-3 hover:bg-white/5 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-text-main">{i.FIRST_NAME} {i.LAST_NAME}</p>
                              <p className="text-xs text-text-muted">{i.EMAIL}</p>
                              <p className="text-[10px] text-text-muted">{i.DESIGNATION}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteInstructor(i.INSTRUCTOR_ID, `${i.FIRST_NAME} ${i.LAST_NAME}`)}
                              className="text-danger hover:bg-danger/20 px-2 py-1 rounded text-xs font-bold"
                            >
                              🗑
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Students Table */}
                <div>
                  <h3 className="text-lg font-bold text-text-main mb-3">Students ({students.length})</h3>
                  <div className="glass-card rounded-2xl border-2 overflow-hidden">
                    <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                      {students.length === 0 ? (
                        <div className="p-4 text-center text-text-muted text-sm">No students</div>
                      ) : (
                        students.map((s) => (
                          <div key={s.STUDENT_ID} className="p-3 hover:bg-white/5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-text-main">{s.FIRST_NAME} {s.LAST_NAME}</p>
                              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">{s.ENROLLMENT_NUMBER || '-'}</span>
                            </div>
                            <p className="text-text-muted">{s.EMAIL}</p>
                            <button
                              onClick={() => handleDeleteStudent(s.STUDENT_ID, `${s.FIRST_NAME} ${s.LAST_NAME}`)}
                              className="mt-1 text-danger hover:bg-danger/20 px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : tab === 'fa-assignment' ? (
              <div className="animate-fade-in-up">
                <h3 className="text-lg font-bold text-text-main mb-4">Batch Coordinator Assignment</h3>
                
                {/* Filters */}
                <div className="glass-card rounded-2xl border-2 p-3 mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select className="input-field !text-sm" value={faFilter.dept} onChange={(e) => setFaFilter(prev => ({ ...prev, dept: e.target.value }))}>
                      <option value="">All Departments</option>
                      {[...new Set(students.map(s => s.DEPT_NAME))].sort().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select className="input-field !text-sm" value={selectedFA} onChange={(e) => setSelectedFA(e.target.value)}>
                      <option value="">Select Coordinator</option>
                      {instructors.map(inst => (
                        <option key={inst.INSTRUCTOR_ID} value={inst.INSTRUCTOR_ID}>
                          {inst.INSTRUCTOR_NAME}
                        </option>
                      ))}
                    </select>
                    <button onClick={handleAssignFA} disabled={faActionLoading || selectedStudents.length === 0} className="btn-primary !text-xs !py-2">
                      Assign ({selectedStudents.length})
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={faFilter.unassignedOnly}
                      onChange={(e) => setFaFilter(prev => ({ ...prev, unassignedOnly: e.target.checked }))}
                      className="w-3 h-3 rounded" />
                    <span className="font-semibold">Unassigned Only</span>
                  </label>
                </div>

                {/* Students List */}
                <div className="glass-card rounded-2xl border-2 overflow-hidden">
                  <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
                    {filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-text-muted text-sm">No students match filter</div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button key={s.STUDENT_ID} onClick={() => toggleStudent(s.STUDENT_ID)} className={`w-full p-3 hover:bg-white/5 text-left text-xs transition-colors ${selectedStudents.includes(s.STUDENT_ID) ? 'bg-primary/20' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <input type="checkbox" checked={selectedStudents.includes(s.STUDENT_ID)} readOnly className="w-3 h-3 rounded accent-primary cursor-pointer" />
                            <p className="font-bold text-text-main flex-1">{s.FIRST_NAME} {s.LAST_NAME}</p>
                            {s.FA_NAME && <span className="bg-success/30 text-success px-1.5 py-0.5 rounded text-[10px] font-bold">{s.FA_NAME}</span>}
                          </div>
                          <p className="text-text-muted">{s.EMAIL}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : tab === 'section-assignment' ? (
              <div className="animate-fade-in-up">
                <h3 className="text-lg font-bold text-text-main mb-4">Section Assignment</h3>
                
                {unassignedRegs.length === 0 ? (
                  <div className="glass-card text-center py-12 rounded-3xl border-2">
                    <p className="text-lg text-text-muted font-bold">✅ All registrations assigned!</p>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl border-2 overflow-hidden">
                    <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
                      {unassignedRegs.map((reg) => (
                        <div key={reg.REGISTRATION_ID} className="p-3 hover:bg-white/5 text-xs">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-text-main">{reg.FIRST_NAME} {reg.LAST_NAME}</p>
                              <p className="text-text-muted">{reg.COURSE_CODE}</p>
                            </div>
                            <span className={`badge ${reg.STATUS === 'ACTIVE' ? 'badge-present' : 'badge-pending'}`}>{reg.STATUS}</span>
                          </div>
                          <select
                            className="input-field !text-xs !py-1.5"
                            defaultValue=""
                            onChange={(e) => handleAssignSection(reg.REGISTRATION_ID, e.target.value)}
                            disabled={assignLoading === reg.REGISTRATION_ID}
                          >
                            <option value="">Select section</option>
                            {(sectionOptions[reg.COURSE_ID] || []).map(sec => (
                              <option key={sec.SECTION_ID} value={sec.SECTION_ID}>Sec {sec.SECTION_NAME} - {sec.ROOM || 'TBA'}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {message && (
              <div className="mt-4 p-3 rounded-2xl bg-success/20 text-success text-sm font-bold border-2 border-success/40 animate-fade-in-up">
                ✅ {message}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">Add New Course</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-text-muted hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Course Code</label>
                <input type="text" className="input-field" placeholder="e.g. CSL401 (Theory) or CSP401 (Practical)" value={newCourse.courseCode} onChange={(e) => setNewCourse({...newCourse, courseCode: e.target.value})} required maxLength={20} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Course Name</label>
                <input type="text" className="input-field" placeholder="e.g. Advanced Databases" value={newCourse.courseName} onChange={(e) => setNewCourse({...newCourse, courseName: e.target.value})} required maxLength={200} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Department</label>
                <select className="input-field appearance-none bg-surface" value={newCourse.deptId} onChange={(e) => setNewCourse({...newCourse, deptId: e.target.value})} required>
                  <option value="" disabled>Select a department</option>
                  {departments.map(d => <option key={d.DEPT_ID} value={d.DEPT_ID}>{d.DEPT_NAME}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Credits (1-6)</label>
                  <input type="number" min="1" max="6" className="input-field" value={newCourse.credits} onChange={(e) => setNewCourse({...newCourse, credits: e.target.value})} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Course Type</label>
                  <div className="flex gap-2 mt-1">
                    <button type="button"
                      onClick={() => setNewCourse({...newCourse, courseType: 'THEORY'})}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                        newCourse.courseType === 'THEORY'
                          ? 'border-primary bg-primary/20 text-primary-light'
                          : 'border-white/15 text-text-muted hover:border-white/30'
                      }`}>
                      📖 Theory
                    </button>
                    <button type="button"
                      onClick={() => setNewCourse({...newCourse, courseType: 'PRACTICAL'})}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                        newCourse.courseType === 'PRACTICAL'
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-white/15 text-text-muted hover:border-white/30'
                      }`}>
                      🔬 Practical
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Target Semester (Academic Semester 1-8)</label>
                <input type="number" min="1" max="8" className="input-field" value={newCourse.targetSemester} onChange={(e) => setNewCourse({...newCourse, targetSemester: e.target.value})} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Description (Optional)</label>
                <textarea className="input-field min-h-[80px] resize-none" placeholder="Course overview..." value={newCourse.description} onChange={(e) => setNewCourse({...newCourse, description: e.target.value})} maxLength={1000}></textarea>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowCourseModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Course</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">Add New Section</h3>
              <button onClick={() => setShowSectionModal(false)} className="text-text-muted hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleAddSection} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Section Name</label>
                  <input type="text" className="input-field" placeholder="e.g. A" value={newSection.sectionName} onChange={(e) => setNewSection({...newSection, sectionName: e.target.value})} required maxLength={10} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Semester</label>
                  <select className="input-field appearance-none bg-surface" value={newSection.semester} onChange={(e) => setNewSection({...newSection, semester: e.target.value})} required>
                    <option value="">Select Semester</option>
                    {semesters.map(sem => <option key={sem.value} value={sem.value}>{sem.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Capacity</label>
                  <input type="number" min="1" className="input-field" value={newSection.capacity} onChange={(e) => setNewSection({...newSection, capacity: e.target.value})} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Room</label>
                  <input type="text" className="input-field" placeholder="e.g. LH-101" value={newSection.room} onChange={(e) => setNewSection({...newSection, room: e.target.value})} maxLength={30} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Schedule</label>
                <input type="text" className="input-field" placeholder="e.g. Mon/Wed/Fri 09:00-10:00" value={newSection.schedule} onChange={(e) => setNewSection({...newSection, schedule: e.target.value})} maxLength={100} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Section Coordinator / Faculty</label>
                <select className="input-field appearance-none bg-surface" value={newSection.coordinatorId} onChange={(e) => setNewSection({...newSection, coordinatorId: e.target.value})}>
                  <option value="">No coordinator currently assigned</option>
                  {instructors.map(inst => <option key={inst.INSTRUCTOR_ID} value={inst.INSTRUCTOR_ID}>{inst.INSTRUCTOR_NAME}</option>)}
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowSectionModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Instructor Modal */}
      {showInstructorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">Add New Faculty</h3>
              <button onClick={() => setShowInstructorModal(false)} className="text-text-muted hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddInstructor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">First Name</label>
                  <input type="text" className="input-field" value={newInstructor.firstName} onChange={(e) => setNewInstructor({ ...newInstructor, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Last Name</label>
                  <input type="text" className="input-field" value={newInstructor.lastName} onChange={(e) => setNewInstructor({ ...newInstructor, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Email (optional)</label>
                <input type="email" className="input-field" placeholder="firstname@unitrack.edu" value={newInstructor.email} onChange={(e) => setNewInstructor({ ...newInstructor, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Department</label>
                <select className="input-field appearance-none bg-surface" value={newInstructor.deptId} onChange={(e) => setNewInstructor({ ...newInstructor, deptId: e.target.value })} required>
                  <option value="" disabled>Select a department</option>
                  {departments.map(d => <option key={d.DEPT_ID} value={d.DEPT_ID}>{d.DEPT_NAME}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Designation</label>
                  <input type="text" className="input-field" value={newInstructor.designation} onChange={(e) => setNewInstructor({ ...newInstructor, designation: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Phone (optional)</label>
                  <input type="text" className="input-field" value={newInstructor.phone} onChange={(e) => setNewInstructor({ ...newInstructor, phone: e.target.value })} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowInstructorModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Faculty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-text-main">Add New Student</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-text-muted hover:text-white text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">First Name</label>
                  <input type="text" className="input-field" value={newStudent.firstName} onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Last Name</label>
                  <input type="text" className="input-field" value={newStudent.lastName} onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Email (optional)</label>
                <input type="email" className="input-field" placeholder="firstname@unitrack.edu" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Department</label>
                <select className="input-field appearance-none bg-surface" value={newStudent.deptId} onChange={(e) => setNewStudent({ ...newStudent, deptId: e.target.value })} required>
                  <option value="" disabled>Select a department</option>
                  {departments.map(d => <option key={d.DEPT_ID} value={d.DEPT_ID}>{d.DEPT_NAME}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-muted">Admission Year</label>
                <input type="number" min="2000" max="2100" className="input-field" value={newStudent.admissionYear} onChange={(e) => setNewStudent({ ...newStudent, admissionYear: e.target.value })} required />
                <p className="text-xs text-text-muted mt-1">📌 Enrollment number (e.g. BT23CSE001) will be auto-generated</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">Phone (optional)</label>
                  <input type="text" className="input-field" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-muted">DOB (optional)</label>
                  <input type="date" className="input-field" value={newStudent.dob} onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
                <button type="button" onClick={() => setShowStudentModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Create Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
