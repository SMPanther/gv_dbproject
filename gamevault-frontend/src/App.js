import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar      from './components/Navbar';
import Games       from './pages/Games';
import Collection  from './pages/Collection';
import Marketplace from './pages/Marketplace';
import Reviews     from './pages/Reviews';
import Login       from './pages/Login';
import Register    from './pages/Register';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/"            element={<Games />} />
          <Route path="/collection"  element={<Collection />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/reviews"     element={<Reviews />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
