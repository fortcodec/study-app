import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudentLogin from './StudentLogin';
import Dashboard from './Dashboard';
import AdminDashboard from './AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StudentLogin />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
