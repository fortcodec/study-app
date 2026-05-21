import { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const generateDeviceToken = () => crypto.randomUUID();

export default function StudentLogin() {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('Checking PIN...');

    try {
      // 1. Fetch the student from Supabase using maybeSingle() to handle invalid PINs gracefully
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('access_pin', pin)
        .maybeSingle();

      if (fetchError) {
        setMessage(`❌ DB Error: ${fetchError.message}`);
        console.error(fetchError);
        return;
      }

      if (!student) {
        setMessage('❌ PIN not found in database.');
        return;
      }

      if (!student.is_active) {
        setMessage('❌ This account is deactivated.');
        return;
      }

      // 2. Device Fingerprint Logic
      let localToken = localStorage.getItem('device_token');

      if (!student.device_fingerprint) {
        localToken = generateDeviceToken();
        
        const { error: updateError } = await supabase
          .from('students')
          .update({ device_fingerprint: localToken })
          .eq('id', student.id);

        if (updateError) {
          setMessage(`❌ Update Error: ${updateError.message}`);
          return;
        }
        localStorage.setItem('device_token', localToken);
        
      } else if (student.device_fingerprint !== localToken) {
        setMessage('❌ Access Denied: This PIN is locked to another device.');
        return;
      }

      // 3. Success & Redirect
      localStorage.setItem('student_session', JSON.stringify(student));
      navigate('/dashboard');

    } catch (err) {
      setMessage(`❌ System Error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '10px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#fff', textAlign: 'center' }}>Student Portal Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="Enter your Access PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            style={{ padding: '12px', fontSize: '16px', borderRadius: '5px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
          />
<button 
            type="submit" 
            style={{ padding: '12px', fontSize: '16px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
          >
            Access Study Materials
          </button>
        </form>
        {message && (
          <p style={{ marginTop: '20px', fontWeight: 'bold', textAlign: 'center', color: message.includes('❌') ? '#ef4444' : '#e2e8f0' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}