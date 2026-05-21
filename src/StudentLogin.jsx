import { useState } from 'react';
import { supabase } from './supabaseClient'; 
import { useNavigate } from 'react-router-dom';

export default function StudentLogin() {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('Verifying your code...');

    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('*')
        .eq('access_pin', pin)
        .maybeSingle(); 

      if (error) {
        setMessage(`❌ An error occurred: ${error.message}`);
        console.error(error);
        return;
      }

      if (!student) {
        setMessage('❌ Invalid Access PIN. Please try again.');
        return;
      }

      let currentDeviceToken = localStorage.getItem('device_token');

      if (!student.device_fingerprint) {
        if (!currentDeviceToken) {
          currentDeviceToken = crypto.randomUUID();
        }

        const { updateError } = await supabase
          .from('students')
          .update({ device_fingerprint: currentDeviceToken })
          .eq('id', student.id);

        if (updateError) {
          setMessage(`❌ Failed to lock device: ${updateError.message}`);
          return;
        }

        localStorage.setItem('device_token', currentDeviceToken);
        localStorage.setItem('student_session', JSON.stringify(student));
        navigate('/dashboard'); 

      } else {
        if (student.device_fingerprint === currentDeviceToken) {
          localStorage.setItem('student_session', JSON.stringify(student));
          navigate('/dashboard');
        } else {
          setMessage('❌ Access Denied: This PIN is already locked to a different device.');
        }
      }

    } catch (err) {
      setMessage(`❌ Critical system error: ${err.message}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#0f172a', 
      color: '#e2e8f0', 
      fontFamily: 'sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#1e293b', 
        padding: '30px', 
        borderRadius: '10px', 
        width: '100%',
        maxWidth: '400px', 
        textAlign: 'center',
        border: '1px solid #334155', 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Updated Title Here */}
        <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', color: '#fff' }}>study-app</h2>
        <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '15px' }}>
          Welcome back! Enter your unique 6-character access code to securely log in.
        </p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="text"
            placeholder="e.g., CGCV4F"
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())} 
            required
            style={{
              padding: '12px',
              fontSize: '16px',
              borderRadius: '5px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#fff',
              textAlign: 'center'
            }}
          />
          <button type="submit" style={{
            padding: '12px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#3b82f6', 
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
            Login
          </button>
        </form>
        {message && (
          <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '14px', color: message.includes('❌') ? '#ef4444' : '#e2e8f0' }}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
