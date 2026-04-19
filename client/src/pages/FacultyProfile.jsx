import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

export default function FacultyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/lookup/faculty-profile/${user.id}`)
      .then(({ data }) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-pink-50 to-orange-50">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="glass-card animate-fade-in-up text-center rounded-3xl border-2">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-pink-500 to-orange-400 text-4xl font-bold text-white shadow-lg animate-pulse-glow">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton mx-auto h-5 w-48 rounded-lg" />)}
            </div>
          ) : profile ? (
            <>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">{profile.FIRST_NAME} {profile.LAST_NAME}</h2>
              <p className="text-sm text-text-muted font-semibold mt-1">{profile.EMAIL}</p>
              <span className="mt-3 inline-block rounded-full bg-gradient-to-r from-pink-100 to-orange-100 border-2 border-primary/40 px-4 py-1.5 text-xs font-bold text-primary">{profile.DESIGNATION}</span>

              <div className="mt-8 grid grid-cols-2 gap-4 text-left">
                {[
                  { label: 'Faculty ID', value: profile.INSTRUCTOR_ID },
                  { label: 'Department', value: profile.DEPT_NAME },
                  { label: 'College', value: 'VNIT — Visvesvaraya National Institute of Technology' },
                  { label: 'Phone', value: profile.PHONE || '—' },
                  { label: 'Hire Date', value: profile.HIRE_DATE ? new Date(profile.HIRE_DATE).toLocaleDateString('en-IN') : '—' },
                  { label: 'Sections', value: profile.SECTION_COUNT || 0 },
                ].map((item, i) => (
                  <div key={i} className={`rounded-2xl border p-4 ${i % 2 === 0 ? 'border-primary/30 bg-gradient-to-br from-pink-100 to-pink-50' : 'border-cyan-400/30 bg-gradient-to-br from-cyan-100 to-blue-50'}`}>
                    <p className="text-xs text-text-muted font-bold">{item.label}</p>
                    <p className="font-bold text-text-main mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-text-muted">Could not load profile.</p>
          )}
        </div>
      </main>
    </div>
  );
}
