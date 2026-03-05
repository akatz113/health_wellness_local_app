import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TestResults from './pages/TestResults';
import Appointments from './pages/Appointments';
import Notes from './pages/Notes';
import Nutrition from './pages/Nutrition';
import Goals from './pages/Goals';
import Exercise from './pages/Exercise';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/test-results" element={<TestResults />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/nutrition" element={<Nutrition />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/exercise" element={<Exercise />} />
      </Routes>
    </Layout>
  );
}
