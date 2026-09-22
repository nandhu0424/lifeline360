import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import '../styles/App.css';

const Layout = () => {
  return (
    <div className="layout-wrapper" style={{ 
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      '--primary': '#008000',
      '--primary-dark': '#005000',
      '--secondary': '#228B22'
    }}>
      <Navbar />
      <main style={{ flex: 1, padding: '0 20px' }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
