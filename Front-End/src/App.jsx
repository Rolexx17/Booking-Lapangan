import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import FieldDetail from './pages/FieldDetail';
import Auth from './pages/Auth';
import BookingForm from './pages/BookingForm';
import Dashboard from './pages/Dashboard';
import Matchmaking from './pages/Matchmaking';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="field/:id" element={<FieldDetail />} />
            <Route path="booking-form" element={<BookingForm />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="matchmaking" element={<Matchmaking />} />
            <Route path="login" element={<Auth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}