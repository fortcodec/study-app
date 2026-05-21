import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AdminDashboard() {
  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Dropdown Menu Toggles (True means open by default, False means closed)
  const [showRegister, setShowRegister] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showRegistry, setShowRegistry] = useState(true); // Keep active tracking open by default

  // Form State: Student Registration
  const [fullName, setFullName] = useState('');
  const [studentDept, setStudentDept] = useState('Computer Science');
  const [studentLevel, setStudentLevel] = useState('200L');
  const [studentMessage, setStudentMessage] = useState('');
  const [generatedPin, setGeneratedPin] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State: Course Material Upload
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [materialType, setMaterialType] = useState('Past Question');
  const [courseDept, setCourseDept] = useState('Computer Science');
  const [courseLevel, setCourseLevel] = useState('200L');
  const [semester, setSemester] = useState('First');
  const [driveLink, setDriveLink] = useState('');
  const [materialMessage, setMaterialMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Registry State
  const [studentsList, setStudentsList] = useState([]);

  const CORRECT_PASSCODE = "REP-2026"; 

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStudentsList(data);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchStudents();
    }
  }, [isAdminAuthenticated]);

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPasscode === CORRECT_PASSCODE) {
      setIsAdminAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('❌ Invalid Admin Passcode.');
    }
  };

  const generateSecurePin = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Action: Create Student
  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setStudentMessage('Generating secure PIN...');
    setGeneratedPin(null);

    const newPin = generateSecurePin();

    const { error } = await supabase
      .from('students')
      .insert([{ 
        full_name: fullName, 
        department: studentDept, 
        academic_level: studentLevel, 
        access_pin: newPin 
      }]);

    setIsGenerating(false);

    if (error) {
      setStudentMessage(`❌ Database Error: ${error.message}`);
      return;
    }

    setStudentMessage('✅ Student registered successfully!');
    setGeneratedPin(newPin);
    setFullName(''); 
    fetchStudents(); 
  };

  // Action: Reset Student
  const handleResetPin = async (studentId, studentName) => {
    const confirmReset = window.confirm(`Are you sure you want to reset the PIN and device lock for ${studentName}?`);
    if (!confirmReset) return;

    const newPin = generateSecurePin();

    const { error } = await supabase
      .from('students')
      .update({ access_pin: newPin, device_fingerprint: null })
      .eq('id', studentId);

    if (error) {
      alert(`❌ Reset Failed: ${error.message}`);
      return;
    }

    alert(`✅ Success! ${studentName}'s new PIN is: ${newPin}. Device unlinked.`);
    fetchStudents(); 
  };

  // Action: Delete Student
  const handleDeleteStudent = async (studentId, studentName) => {
    const confirmDelete = window.confirm(`⚠️ WARNING: Are you sure you want to DELETE ${studentName}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      alert(`❌ Delete Failed: ${error.message}`);
      return;
    }

    alert(`🗑️ ${studentName} has been permanently removed.`);
    fetchStudents(); 
  };

  // Action: Upload Material
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setMaterialMessage('Processing link...');

    const driveIdRegex = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = driveLink.match(driveIdRegex);

    if (!match || !match[1]) {
      setMaterialMessage('❌ Invalid Google Drive URL pattern.');
      setIsUploading(false);
      return;
    }

    const extractedFileId = match[1];

    const { error } = await supabase
      .from('courses')
      .insert([{
        course_code: courseCode.toUpperCase().trim(),
        course_title: courseTitle.trim(),
        material_type: materialType,
        department: courseDept,
        academic_level: courseLevel,
        semester: semester,
        drive_file_id: extractedFileId
      }]);

    setIsUploading(false);

    if (error) {
      setMaterialMessage(`❌ Upload Failed: ${error.message}`);
      return;
    }

    setMaterialMessage('✅ Course material mapped securely!');
    setCourseCode('');
    setCourseTitle('');
    setDriveLink('');
  };

  // Reusable Component-Style Menu Header Function to maintain dry clean logic
  const renderMenuHeader = (title, isOpen, toggleFunc) => (
    <button 
      onClick={toggleFunc}
      style={{ width: '100%', padding: '15px 20px', background: '#1e293b', border: '1px solid #334155', borderRadius: isOpen ? '10px 10px 0 0' : '10px', color: '#fff', fontSize: '18px', fontWeight: 'bold', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none', transition: 'border-radius 0.2s' }}
    >
      <span>{title}</span>
      <span>{isOpen ? '▲' : '▼'}</span>
    </button>
  );

  if (!isAdminAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '10px', border: '1px solid #334155', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2>Class Rep Portal</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Enter the administrator passcode to access management tools.</p>
          <form onSubmit={handleAdminAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="password" placeholder="Enter Admin Passcode" value={adminPasscode} onChange={(e) => setAdminPasscode(e.target.value)}
              style={{ padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '16px' }}
            />
            <button type="submit" style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Verify Access
            </button>
          </form>
          {authError && <p style={{ color: '#ef4444', marginTop: '15px', fontWeight: 'bold' }}>{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '20px', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <h2 style={{ margin: '0', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>Admin Management Panel</h2>

        {/* SECTION 1: REGISTER STUDENT DROPDOWN */}
        <div>
          {renderMenuHeader("👤 Register New Student", showRegister, () => setShowRegister(!showRegister))}
          {showRegister && (
            <div style={{ background: '#111827', padding: '20px', borderRadius: '0 0 10px 10px', border: '1px solid #334155', borderTop: 'none' }}>
              <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input 
                  type="text" placeholder="Student Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={studentDept} onChange={(e) => setStudentDept(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Mass Communication">Mass Communication</option>
                  </select>
                  <select value={studentLevel} onChange={(e) => setStudentLevel(e.target.value)} style={{ width: '110px', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="100L">100L</option>
                    <option value="200L">200L</option>
                    <option value="300L">300L</option>
                    <option value="400L">400L</option>
                  </select>
                </div>
                <button type="submit" disabled={isGenerating} style={{ padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                  {isGenerating ? 'Generating...' : 'Generate Access PIN'}
                </button>
              </form>
              {studentMessage && <p style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>{studentMessage}</p>}
              {generatedPin && (
                <div style={{ marginTop: '15px', background: '#0f172a', padding: '15px', borderRadius: '6px', border: '2px dashed #10b981', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#94a3b8', fontSize: '13px' }}>Code Generated:</p>
                  <h2 style={{ margin: 0, color: '#10b981', letterSpacing: '2px' }}>{generatedPin}</h2>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: UPLOAD COURSE MATERIAL DROPDOWN */}
        <div>
          {renderMenuHeader("📚 Upload Course Material", showUpload, () => setShowUpload(!showUpload))}
          {showUpload && (
            <div style={{ background: '#111827', padding: '20px', borderRadius: '0 0 10px 10px', border: '1px solid #334155', borderTop: 'none' }}>
              <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" placeholder="Course Code (e.g. CSC 204)" required value={courseCode} onChange={(e) => setCourseCode(e.target.value)}
                    style={{ flex: 1, padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
                  />
                  <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} style={{ width: '150px', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="Past Question">Past Question</option>
                    <option value="Textbook">Textbook</option>
                    <option value="Lecture Note">Lecture Note</option>
                  </select>
                </div>

                <input 
                  type="text" placeholder="Course Title (e.g. Data Structures)" required value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <select value={courseDept} onChange={(e) => setCourseDept(e.target.value)} style={{ flex: 2, minWidth: '150px', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Mass Communication">Mass Communication</option>
                  </select>
                  <select value={courseLevel} onChange={(e) => setCourseLevel(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="100L">100L</option>
                    <option value="200L">200L</option>
                    <option value="300L">300L</option>
                    <option value="400L">400L</option>
                  </select>
                  <select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}>
                    <option value="First">1st Sem</option>
                    <option value="Second">2nd Sem</option>
                  </select>
                </div>

                <input 
                  type="url" placeholder="Paste full Google Drive link here" required value={driveLink} onChange={(e) => setDriveLink(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
                />

                <button type="submit" disabled={isUploading} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                  {isUploading ? 'Processing...' : 'Link Material'}
                </button>
              </form>
              {materialMessage && <p style={{ marginTop: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: materialMessage.includes('❌') ? '#ef4444' : '#10b981' }}>{materialMessage}</p>}
            </div>
          )}
        </div>

        {/* SECTION 3: REGISTERED REGISTRY DROPDOWN */}
        <div>
          {renderMenuHeader(`📋 Registered Students Registry (${studentsList.length})`, showRegistry, () => setShowRegistry(!showRegistry))}
          {showRegistry && (
            <div style={{ background: '#111827', padding: '20px', borderRadius: '0 0 10px 10px', border: '1px solid #334155', borderTop: 'none', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {studentsList.length === 0 ? (
                  <p style={{ color: '#94a3b8', margin: 0 }}>No students registered yet.</p>
                ) : (
                  studentsList.map((st) => (
                    <div key={st.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flexGrow: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>{st.full_name}</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{st.department} • {st.academic_level}</p>
                        {st.device_fingerprint ? (
                          <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px', fontWeight: 'bold' }}>
                            🔒 Device Linked
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px', fontWeight: 'bold' }}>
                            🔓 Unlinked (Ready)
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', color: '#3b82f6', background: '#1e293b', padding: '3px 6px', borderRadius: '4px' }}>
                          {st.access_pin}
                        </span>
                        <button 
                          onClick={() => handleResetPin(st.id, st.full_name)}
                          style={{ padding: '4px 6px', background: 'none', color: '#eab308', border: '1px solid #eab308', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', width: '90px' }}
                        >
                          Reset Access
                        </button>
                        <button 
                          onClick={() => handleDeleteStudent(st.id, st.full_name)}
                          style={{ padding: '4px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', width: '90px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
