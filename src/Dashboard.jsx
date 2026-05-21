import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

export default function Dashboard() {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFileId, setActiveFileId] = useState(null);
  
  // === AI COMPANION STATE ===
  const [aiCourse, setAiCourse] = useState(null); // Tracks which course the AI is talking about
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const sessionData = localStorage.getItem('student_session');
      if (!sessionData) {
        navigate('/');
        return;
      } 
      
      const parsedStudent = JSON.parse(sessionData);
      setStudent(parsedStudent);

      const { data: courseData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('department', parsedStudent.department)
        .eq('academic_level', parsedStudent.academic_level);

      if (error) {
        console.error("Error fetching courses:", error);
      } else if (courseData) {
        setCourses(courseData);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [navigate]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      return newMode;
    });
  };

  // === NATIVE HTTP FETCH CALL TO GEMINI ===
  const handleOpenAiCompanion = async (course) => {
    setAiCourse(course);
    setIsAiTyping(true);
    setChatHistory([]); // Clear past chat

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    // System prompt defining the witty, flexible peer mentor persona
    const systemInstruction = `You are "Chuks AI", a brilliant, witty, and highly communicative peer tutor at Federal University, Lokoja. Your tone is casual, supportive, and engaging—never robotic. You are explaining the course ${course.course_code}: ${course.course_title}. First, give a highly concrete, fun explanation of what this course entails and why it matters in the real world. Keep it brief but engaging, then invite the student to ask questions.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemInstruction }] }]
        })
      });

      const data = await response.json();
      const aiReply = data.candidates[0].content.parts[0].text;
      setChatHistory([{ role: 'model', text: aiReply }]);
    } catch (err) {
      setChatHistory([{ role: 'model', text: "❌ Connection timeout. Check your VITE_GEMINI_API_KEY configuration or network baseline!" }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;

    const userMessage = { role: 'user', text: chatInput };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsAiTyping(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Map conversation array history into the structure Google expects
    const apiContents = updatedHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Inject system instructions as the foundational baseline context
    apiContents.unshift({
      role: 'user',
      parts: [{ text: `CONTEXT PROTOCOL: Remember, you are Chuks AI, tutoring me on ${aiCourse.course_code}. Keep it fun and highly interactive.` }]
    });

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: apiContents })
      });

      const data = await response.json();
      const aiReply = data.candidates[0].content.parts[0].text;
      setChatHistory([...updatedHistory, { role: 'model', text: aiReply }]);
    } catch (err) {
      setChatHistory([...updatedHistory, { role: 'model', text: "❌ Failed to reach AI engine. Check network latency." }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const theme = isDarkMode 
    ? { bg: '#0f172a', cardBg: '#1e293b', itemBg: '#334155', text: '#e2e8f0', textMuted: '#94a3b8', border: '#334155' }
    : { bg: '#f1f5f9', cardBg: '#ffffff', itemBg: '#e2e8f0', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1' };

  if (loading) return <p style={{ padding: '20px', color: theme.text, background: theme.bg, height: '100vh', margin: 0 }}>Loading secure portal...</p>;

  // === INTERFACE LAYER 1: SECURE FILE VIEWER ===
  if (activeFileId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: theme.bg, padding: '20px', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1000px', display: 'flex' }}>
          <button onClick={() => setActiveFileId(null)} style={{ padding: '12px 20px', background: theme.cardBg, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: '5px', marginBottom: '15px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back to Courses
          </button>
        </div>
        <div style={{ width: '100%', maxWidth: '1000px', flexGrow: 1, borderRadius: '8px', overflow: 'hidden', background: '#000' }} onContextMenu={(e) => e.preventDefault()}>
          <iframe src={`https://drive.google.com/file/d/${activeFileId}/preview`} style={{ width: '100%', height: '100%', border: 'none' }} title="Course Material" allow="autoplay"></iframe>
        </div>
      </div>
    );
  }

  // === MAIN STUDENT PORTAL SCREEN ===
  return (
    <div style={{ minHeight: '100vh', background: theme.bg, padding: '20px', transition: 'background 0.3s ease', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', color: theme.text }}>
        
        {/* Profile Grid */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', gap: '20px' }}>
          <div style={{ background: theme.cardBg, padding: '20px', borderRadius: '8px', border: `1px solid ${theme.border}`, flexGrow: 1, maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Welcome back, {student?.full_name}</h2>
            <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Department:</strong> {student?.department}</p>
            <p style={{ margin: '5px 0', fontSize: '15px' }}><strong>Level:</strong> {student?.academic_level}</p>
          </div>
          <button onClick={toggleTheme} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '10px 15px', borderRadius: '20px', cursor: 'pointer', color: theme.text }}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <h3 style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px', fontSize: '22px' }}>Your Course Materials</h3>
        
        {/* Dynamic Responsive Matrix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {courses.length === 0 ? (
            <p>No materials uploaded for your level yet.</p>
          ) : (
            courses.map((course) => (
              <div key={course.id} style={{ background: theme.cardBg, padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{course.course_code}</h4>
                  <p style={{ margin: '0', fontSize: '15px', color: theme.textMuted }}>{course.course_title}</p>
                  <span style={{ display: 'inline-block', marginTop: '12px', background: theme.itemBg, padding: '5px 10px', borderRadius: '4px', fontSize: '13px' }}>
                    {course.material_type}
                  </span>
                </div>
                
                {/* BUTTON RIG: SPLIT ACTIONS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => setActiveFileId(course.drive_file_id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                    Study Material
                  </button>
                  <button onClick={() => handleOpenAiCompanion(course)} style={{ background: 'transparent', color: '#10b981', border: '1px solid #10b981', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                    💡 Know More About Course
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <button onClick={() => { localStorage.removeItem('student_session'); navigate('/'); }} style={{ width: '100%', maxWidth: '300px', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Log Out
          </button>
        </div>
      </div>

      {/* === INTERFACE LAYER 2: CHUKS AI SLIDING SIDE DRAWER === */}
      {aiCourse && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: '100%', maxWidth: '450px', height: '100vh', background: '#1e293b', borderLeft: '1px solid #334155', boxShadow: '-10px 0 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', zIndex: 2000, boxSizing: 'border-box' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff' }}>🤖 Chuks AI Companion</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>Course context: {aiCourse.course_code}</p>
            </div>
            <button onClick={() => setAiCourse(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>

          {/* Dialog Log */}
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px', background: '#111827' }}>
            {chatHistory.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', background: msg.role === 'user' ? '#3b82f6' : '#1f2937', padding: '12px 16px', borderRadius: '12px', maxWidth: '85%', color: '#fff', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', border: msg.role === 'model' ? '1px solid #334155' : 'none' }}>
                {msg.text}
              </div>
            ))}
            {isAiTyping && <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0, italic: 'true' }}>⚡ Chuks AI is brainstorming...</p>}
          </div>

          {/* Interactive Chat Form Input */}
          <form onSubmit={handleSendAiMessage} style={{ padding: '15px', borderTop: '1px solid #334155', display: 'flex', gap: '10px', background: '#0f172a' }}>
            <input type="text" placeholder={`Ask about ${aiCourse.course_code}...`} value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isAiTyping} style={{ flexGrow: 1, padding: '12px', borderRadius: '6px', border: '1px solid #334155', background: '#111827', color: '#fff', fontSize: '14px' }} />
            <button type="submit" disabled={isAiTyping} style={{ padding: '12px 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>Send</button>
          </form>
        </div>
      )}

    </div>
  );
}
