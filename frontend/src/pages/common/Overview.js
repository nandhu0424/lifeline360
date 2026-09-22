import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import Login from './Login';
import '../../styles/App.css';

const Overview = () => {
  const [activeSection, setActiveSection] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // ─── Grievance Form State ────────────────────────────────────────────────
  const [gForm, setGForm] = useState({ name: '', phone: '', email: '', category: '', district: '', message: '' });
  const [gCaptcha, setGCaptcha] = useState({ num1: 1, num2: 1, answer: '' });
  const [gErrors, setGErrors] = useState({});
  const [gSubmitting, setGSubmitting] = useState(false);
  const [gSuccess, setGSuccess] = useState(null);   // reference_id after success
  const [gShowModal, setGShowModal] = useState(false);
  const [gToast, setGToast] = useState(false);

  // ─── Tracking State ──────────────────────────────────────────────────────
  const [trackId, setTrackId] = useState('');
  const [trackResult, setTrackResult] = useState(null); // Array of grievances
  const [trackErr, setTrackErr] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // ─── Public Feedback Showcase State ──────────────────────────
  const [publicFeedbacks, setPublicFeedbacks] = useState([]);
  const [currentFeedbackIdx, setCurrentFeedbackIdx] = useState(0);

  const generateCaptcha = (currentNum1 = 0, currentNum2 = 0) => {
    let num1, num2;
    do {
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
    } while (num1 === currentNum1 && num2 === currentNum2);
    setGCaptcha({ num1, num2, answer: '' });
  };

  useEffect(() => {
    const fetchPublicFeedback = async () => {
      try {
        const res = await fetch('/api/feedback/public');
        const data = await res.json();
        if (res.ok && data.success) {
          setPublicFeedbacks(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch public feedback', err);
      }
    };
    fetchPublicFeedback();
    generateCaptcha();
  }, []);

  const showToast = () => {
    setGToast(true);
    setTimeout(() => setGToast(false), 2500);
  };

  const handleGSubmit = async (e) => {
    e.preventDefault();
    setGErrors({});

    // Captcha Validation
    if (parseInt(gCaptcha.answer) !== gCaptcha.num1 + gCaptcha.num2) {
      setGErrors({ captcha: 'Incorrect CAPTCHA answer. Please try again.' });
      generateCaptcha(gCaptcha.num1, gCaptcha.num2);
      return;
    }

    setGSubmitting(true);
    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGSuccess(data.reference_id);
        setGForm({ name: '', phone: '', email: '', category: '', district: '', message: '' });
        generateCaptcha(gCaptcha.num1, gCaptcha.num2);   // always different numbers
        setGShowModal(true);
      } else if (res.status === 400 && data.errors) {
        setGErrors(data.errors);
      } else {
        alert(data.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      alert('Server error. Please try again later.');
    } finally {
      setGSubmitting(false);
    }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) { setTrackErr('Please enter a Reference ID or Email.'); return; }
    setTrackErr('');
    setTrackLoading(true);
    try {
      // Removing email from URL params, trackId is now either ID or email
      const res = await fetch(`/api/grievances/track/${encodeURIComponent(trackId.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTrackResult(data.data);
      } else {
        setTrackResult(null);
        setTrackErr(data.message || 'No grievances found.');
      }
    } catch {
      setTrackErr('Connection error. Try again later.');
    } finally {
      setTrackLoading(false);
    }
  };

  const stepOrder = ['received', 'in_review', 'resolved'];
  const stepIdx = (status) => {
    if (status === 'rejected') return 2;
    return stepOrder.indexOf(status);
  };


  const phcImagePath = "/assets/phc_building_v2.png";
  const aboutUsPath = "/assets/about_us.png";
  const howItWorksPath = "/assets/workflow_simplified.png";

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 992);
      if (window.innerWidth >= 992) setShowMobileMenu(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Email tracking links open the landing page and prefill the Contact tracker.
  useEffect(() => {
    const referenceId = new URLSearchParams(window.location.search).get('track');
    const qEmail = new URLSearchParams(window.location.search).get('email');
    const term = (referenceId || qEmail)?.trim();
    if (!term) return;

    const loadTrackingResult = async () => {
      setTrackId(term);
      setTrackLoading(true);
      try {
        const res = await fetch(`/api/grievances/track/${encodeURIComponent(term)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setTrackResult(data.data);
        } else {
          setTrackErr(data.message || 'No grievances found.');
        }
      } catch {
        setTrackErr('Connection error. Try again later.');
      } finally {
        setTrackLoading(false);
      }
    };

    loadTrackingResult();
    requestAnimationFrame(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: "-90px 0px 0px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          if (entry.target.id) {
            setActiveSection(entry.target.id);
          }
        } else {
          // Re-trigger animation on every scroll
          entry.target.classList.remove('active');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal, section[id]');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { name: 'Home', id: 'home' },
    { name: 'About Us', id: 'aboutus' },
    { name: 'Features', id: 'features' },
    { name: 'How It Works', id: 'howitworks' },
    { name: 'Impact', id: 'impact' },
    { name: 'Contact', id: 'contact' }
  ];

  const gInputStyle = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
    padding: '13px 15px', borderRadius: '8px', color: 'white',
    fontSize: '0.95rem', width: '100%', outline: 'none', fontFamily: 'inherit'
  };
  const gLabelStyle = {
    display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem',
    fontWeight: 500, marginBottom: '7px'
  };
  const gErrStyle = { color: '#ef4444', fontSize: '0.78rem', marginTop: '4px' };

  return (
    <div className="overview-container" style={{ scrollBehavior: 'smooth' }}>
      {/* Dynamic Header */}
      <header style={{
        height: '80px', padding: isMobile ? '0 20px' : '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(15px)', borderBottom: '1px solid #f1f5f9',
        position: 'sticky', top: 0, zIndex: 2000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: isMobile ? '35px' : '45px', height: isMobile ? '35px' : '45px', background: 'var(--primary)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="material-symbols-rounded" style={{ color: 'white', fontSize: isMobile ? '1.4rem' : '1.8rem' }}>ecg</span>
          </div>
          <div>
            <h1 style={{ fontSize: isMobile ? '1.1rem' : '1.4rem', fontWeight: 850, color: 'var(--primary)', margin: 0 }}>Lifeline360</h1>
          </div>
        </div>

        {!isMobile ? (
          <>
            <nav className="desktop-nav" style={{ display: 'flex', gap: '30px' }}>
              {navItems.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`nav-link ${activeSection === item.id ? 'active-nav' : ''}`}
                  style={{
                    textDecoration: 'none',
                    color: activeSection === item.id ? 'var(--primary)' : '#1e293b',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.name}
                </a>
              ))}
            </nav>
            <button
              onClick={() => setShowLogin(true)}
              className="btn btn-primary"
              style={{ padding: '10px 25px', borderRadius: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>person</span> Login
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{ background: 'none', border: 'none', color: '#1e293b', padding: '10px' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '2.2rem' }}>{showMobileMenu ? 'close' : 'menu'}</span>
          </button>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && showMobileMenu && (
        <div style={{
          position: 'fixed', top: '80px', left: 0, width: '100%', background: 'white',
          zIndex: 1500, padding: '20px', borderBottom: '2px solid var(--primary)',
          display: 'flex', flexDirection: 'column', gap: '5px', boxShadow: '0 15px 30px rgba(0,0,0,0.1)'
        }}>
          {navItems.map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              style={{ textDecoration: 'none', color: '#1e293b', fontWeight: 700, fontSize: '1.1rem', padding: '12px 15px', borderRadius: '10px' }}
              onClick={() => {
                setActiveSection(item.id);
                setShowMobileMenu(false);
              }}
            >
              {item.name}
            </a>
          ))}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>
          <button
            onClick={() => {
              setShowLogin(true);
              setShowMobileMenu(false);
            }}
            style={{
              textAlign: 'left', background: 'var(--primary)', color: 'white', border: 'none',
              padding: '15px', borderRadius: '12px', fontWeight: 700, fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}
          >
            <span className="material-symbols-rounded">person</span> Login to Portal
          </button>
        </div>
      )}

      <main style={{ flex: 1, zoom: '0.72' }}>
        {/* Hero Section */}
        <section id="home" style={{
          padding: isMobile ? '40px 20px' : '80px 5%',
          display: 'flex',
          flexDirection: isMobile ? 'column-reverse' : 'row',
          alignItems: 'center',
          gap: isMobile ? '30px' : '60px',
          background: 'linear-gradient(135deg, #fffaf5 0%, #ffffff 100%)',
          minHeight: isMobile ? 'auto' : '750px'
        }}>
          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }} className="reveal">
            <h1 style={{ fontSize: isMobile ? '2.2rem' : '4.5rem', fontWeight: 900, color: '#0f172a', lineHeight: '1.2', marginBottom: '25px' }}>
              Empowering Primary <br />
              <span style={{ color: 'var(--primary)' }}>Healthcare.</span> <br />
              Strengthening <br />
              <span style={{ color: 'var(--primary)' }}>Communities.</span>
            </h1>
            <p style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', color: '#64748b', lineHeight: '1.7', marginBottom: '35px', maxWidth: '650px', margin: isMobile ? '0 auto 35px' : '0 0 45px' }}>
              Lifeline360 is a smart, centralized monitoring system for Primary Health Centers. It helps PHCs record data seamlessly and enables DDHS to monitor performance in real-time.
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <button onClick={() => setShowLogin(true)} className="btn btn-primary" style={{ padding: isMobile ? '15px 30px' : '18px 40px', borderRadius: '14px', fontSize: isMobile ? '1rem' : '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <span className="material-symbols-rounded">rocket_launch</span> Get Started
              </button>
              <Link to="/docs/manual" className="btn btn-outline" style={{ padding: isMobile ? '15px 30px' : '18px 40px', borderRadius: '14px', fontSize: isMobile ? '1rem' : '1.1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <span className="material-symbols-rounded">info</span> Learn More
              </Link>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '35px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>verified</span> Secure</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>verified</span> Reliable</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>verified</span> Real-time</span>
            </div>
          </div>

          <div style={{ flex: 1.2, position: 'relative', width: '100%', maxWidth: isMobile ? '450px' : 'none' }} className="reveal">
            <div style={{
              width: '100%', height: isMobile ? '280px' : '600px', borderRadius: isMobile ? '30px' : '30% 70% 70% 30% / 30% 30% 70% 70%',
              overflow: 'hidden', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.15)',
              border: isMobile ? '4px solid white' : '8px solid white'
            }}>
              <img src={phcImagePath} alt="Healthcare Center" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </section>

        <section id="aboutus" style={{ padding: isMobile ? '50px 20px' : '120px 5%', background: '#ffffff' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: isMobile ? '30px' : '100px' }}>
            <div style={{ flex: 1 }} className="reveal">
              <img src={aboutUsPath} alt="Medical Team" style={{ width: '100%', borderRadius: isMobile ? '25px' : '40px' }} />
            </div>
            <div style={{ flex: 1.2, textAlign: isMobile ? 'center' : 'left' }} className="reveal">
              <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '2px' }}>OUR MISSION</span>
              <h2 style={{ fontSize: isMobile ? '2rem' : '3.5rem', fontWeight: 850, color: '#0f172a', margin: '15px 0', lineHeight: '1.2' }}>Dedicated to <span style={{ color: 'var(--primary)' }}>Digital Excellence</span> in Healthcare.</h2>
              <p style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: '#64748b', lineHeight: '1.8', marginBottom: '25px' }}>
                Lifeline360 was built with a single goal: to bridge the gap between rural health centers and district administration. By providing doctors and nurses with intuitive digital tools, we ensure that every patient interaction is recorded, every medicine is tracked, and every staff member is supported.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', textAlign: 'left' }}>
                <div style={{ background: isMobile ? '#f8fafc' : 'transparent', padding: isMobile ? '20px' : '0', borderRadius: '15px' }}>
                  <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Visionary Tech</h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Leveraging cloud architecture for seamless state-wide connectivity.</p>
                </div>
                <div style={{ background: isMobile ? '#f8fafc' : 'transparent', padding: isMobile ? '20px' : '0', borderRadius: '15px' }}>
                  <h4 style={{ fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Officer First</h4>
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Designed specifically for DDHS and PHC administrative staff.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" style={{ padding: '100px 5%', textAlign: 'center', background: '#f8fafc' }}>
          <div className="reveal">
            <h2 style={{ fontSize: '2.5rem', fontWeight: 850, marginBottom: '60px' }}>Why <span style={{ color: 'var(--primary)' }}>Lifeline360?</span></h2>
          </div>

          <div className="grid reveal" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
            {[
              { icon: 'dvr', title: 'Centralized Monitoring', desc: 'All PHC data in one place for better visibility and control.' },
              { icon: 'fingerprint', title: 'Biometric Integration', desc: 'Accurate attendance tracking with biometric verification.' },
              { icon: 'cloud_sync', title: 'Offline to Online Sync', desc: 'Works offline and syncs automatically when connected.' },
              { icon: 'analytics', title: 'Real-time Dashboards', desc: 'DDHS gets real-time insights and performance analytics.' },
              { icon: 'notifications_active', title: 'Smart Alerts', desc: 'Instant alerts for absenteeism, low stock and outbreaks.' }
            ].map((feature, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '60px', height: '60px', background: 'white', borderRadius: '15px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.05)'
                }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '2rem' }}>{feature.icon}</span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '10px' }}>{feature.title}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="howitworks" style={{ padding: isMobile ? '50px 20px' : '100px 5%', background: '#ffffff' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', alignItems: 'center', gap: isMobile ? '40px' : '80px' }}>
            <div style={{ flex: 1.2 }} className="reveal">
              <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px' }}>THE WORKING</span>
              <h2 style={{ fontSize: '3rem', fontWeight: 850, margin: '20px 0' }}>How It <span style={{ color: 'var(--primary)' }}>Works?</span></h2>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '30px' : '40px 60px', marginTop: '40px' }}>
                {[
                  { step: '1', title: 'Data Entry at PHC', desc: 'Staff at PHC and Sub Centers enter daily details like attendance, visits, and stock.' },
                  { step: '2', title: 'Works Even Without Internet', desc: 'System saves information safely even if there is no internet connection.' },
                  { step: '3', title: 'Automatic Update', desc: 'Information is sent automatically when internet becomes available.' },
                  { step: '4', title: 'Safe & Verified', desc: 'All data is time-stamped and verified to avoid errors or changes.' },
                  { step: '5', title: 'Monitoring by DDHS', desc: 'District officers view all PHC performance and services in one central place.' },
                  { step: '6', title: 'Alerts for Action', desc: 'Quick alerts for absence or low stock help officers take immediate action.' }
                ].map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                    <div>
                      <h4 style={{ fontWeight: 800, marginBottom: '5px' }}>{s.title}</h4>
                      <p style={{ color: '#64748b', fontSize: '0.95rem' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 0.8 }} className="reveal">
              <img src={howItWorksPath} alt="How it works" style={{ width: '100%', borderRadius: '40px' }} />
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section id="impact" style={{
          padding: isMobile ? '80px 5%' : '150px 5%',
          background: `linear-gradient(rgba(248, 250, 252, 0.95), rgba(248, 250, 252, 0.95)), url('/assets/impact_bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          textAlign: 'center',
          minHeight: isMobile ? 'auto' : '800px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div className="reveal" style={{ maxWidth: '800px', margin: isMobile ? '0 auto 40px' : '0 auto 80px' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '2px' }}>OUR IMPACT</span>
            <h2 style={{ fontSize: isMobile ? '2.5rem' : '3.5rem', fontWeight: 850, margin: '20px 0', lineHeight: '1.2' }}>Transforming Healthcare <br /> <span style={{ color: 'var(--primary)' }}>Across the State.</span></h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', lineHeight: '1.6' }}>
              From remote tribal hamlets to busy urban centers, Lifeline360 provides the digital backbone for
              health services, ensuring no patient is left behind.
            </p>
          </div>

          <div className="grid reveal" style={{ gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: isMobile ? '15px' : '25px', maxWidth: '1300px', margin: '0 auto', width: '100%' }}>
            {[
              { icon: 'home_work', val: '250+', label: 'PHCs Monitored', color: '#059669', desc: 'Integrated centers' },
              { icon: 'groups', val: '1M+', label: 'Patients Served', color: '#2563eb', desc: 'Annual touchpoints' },
              { icon: 'assignment', val: '50K+', label: 'Daily Records', color: '#7c3aed', desc: 'Secure interactions' },
              { icon: 'medical_information', val: '10K+', label: 'Healthcare Staff', color: '#d97706', desc: 'Active staff' },
              { icon: 'verified', val: '99.5%', label: 'Data Accuracy', color: '#dc2626', desc: 'Verified audits' }
            ].map((stat, idx) => (
              <div key={idx} className="glass-card" style={{
                padding: isMobile ? '25px 15px' : '40px 20px', textAlign: 'center', background: 'white',
                borderTop: `4px solid ${stat.color}`, transition: 'transform 0.3s ease'
              }}>
                <div style={{
                  width: isMobile ? '50px' : '70px', height: isMobile ? '50px' : '70px', background: `${stat.color}10`, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                }}>
                  <span className="material-symbols-rounded" style={{ color: stat.color, fontSize: isMobile ? '1.8rem' : '2.5rem' }}>{stat.icon}</span>
                </div>
                <h4 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, margin: '0 0 10px', color: '#0f172a' }}>{stat.val}</h4>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase', marginBottom: '10px' }}>{stat.label}</p>
                {!isMobile && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{stat.desc}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Feedback Showcase Section */}
        <section id="feedback-showcase" className="reveal" style={{ padding: isMobile ? '60px 20px' : '100px 5%', background: '#f8fafc', textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? '2.2rem' : '3rem', fontWeight: 850, margin: '0 0 50px', color: '#0f172a' }}>
            What people are <span style={{ color: 'var(--primary)' }}>telling us</span>
          </h2>

          {publicFeedbacks.length > 0 ? (
            <div className="glass-card" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', background: 'white', padding: isMobile ? '30px 20px' : '60px 80px', borderRadius: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '25px', left: '30px', fontSize: '5rem', color: 'rgba(0, 210, 170, 0.15)', fontFamily: 'serif', lineHeight: 1 }}>"</div>

              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '15px', marginTop: '10px' }}>{publicFeedbacks[currentFeedbackIdx].subject}</h3>
              <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: '1.8', fontStyle: 'italic', marginBottom: '35px' }}>
                "{publicFeedbacks[currentFeedbackIdx].message}"
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
                <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 5px' }}>{publicFeedbacks[currentFeedbackIdx].name}</p>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(0,210,170,0.1)', color: 'var(--primary)', padding: '5px 12px', borderRadius: '20px', fontWeight: 700 }}>
                      {publicFeedbacks[currentFeedbackIdx].category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                      {new Date(publicFeedbacks[currentFeedbackIdx].created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    disabled={currentFeedbackIdx === 0}
                    onClick={() => setCurrentFeedbackIdx(prev => prev - 1)}
                    style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentFeedbackIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentFeedbackIdx === 0 ? 0.4 : 1, transition: 'all 0.2s', boxShadow: '0 5px 10px rgba(0,0,0,0.03)' }}
                  >
                    <span className="material-symbols-rounded">chevron_left</span>
                  </button>
                  <button
                    disabled={currentFeedbackIdx === publicFeedbacks.length - 1}
                    onClick={() => setCurrentFeedbackIdx(prev => prev + 1)}
                    style={{ width: '45px', height: '45px', borderRadius: '50%', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: currentFeedbackIdx === publicFeedbacks.length - 1 ? 'not-allowed' : 'pointer', opacity: currentFeedbackIdx === publicFeedbacks.length - 1 ? 0.4 : 1, transition: 'all 0.2s', boxShadow: '0 5px 10px rgba(0,0,0,0.03)' }}
                  >
                    <span className="material-symbols-rounded">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Dot Indicators */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '30px' }}>
                {publicFeedbacks.map((_, idx) => (
                  <div key={idx} onClick={() => setCurrentFeedbackIdx(idx)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === currentFeedbackIdx ? 'var(--primary)' : '#e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', background: 'white', borderRadius: '24px', maxWidth: '600px', margin: '0 auto', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '15px' }}>forum</span>
              <h4 style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600 }}>No feedback yet.</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '8px' }}>Be the first to share your thoughts with us!</p>
            </div>
          )}
        </section>

        {/* Contact + Grievance Section */}
        <section id="contact" style={{ padding: isMobile ? '60px 5%' : '100px 5%', background: '#0f172a' }}>
          <div className="glass-panel reveal" style={{
            padding: isMobile ? '40px 20px' : '70px 60px', borderRadius: '40px', background: 'rgba(255,255,255,0.03)',
            color: 'white', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '40px' : '80px',
            alignItems: 'flex-start', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {/* Left Info */}
            <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left', paddingTop: '10px' }}>
              <h2 style={{ fontSize: isMobile ? '2.2rem' : '3rem', fontWeight: 850, marginBottom: '15px' }}>Get In <span style={{ color: 'var(--primary)' }}>Touch.</span></h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '35px', fontSize: '1rem', lineHeight: '1.65' }}>
                Have a health-related grievance? Submit it below and our district team will respond within 24–48 hours.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', alignItems: isMobile ? 'center' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>mail</span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>support@lifeline360.gov.in</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span className="material-symbols-rounded" style={{ color: 'var(--primary)' }}>call</span>
                  <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>+91 1800-456-7890</span>
                </div>
              </div>
              {false && <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>District Staff</p>
                <a href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', border: '1px solid rgba(0,210,170,0.3)', padding: '8px 16px', borderRadius: '8px', background: 'rgba(0,210,170,0.06)', transition: 'all 0.2s' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>admin_panel_settings</span>
                  Admin Portal →
                </a>
              </div>}
            </div>

            {/* Grievance Form */}
            <div style={{ flex: 1.3, width: '100%' }}>
              <form onSubmit={handleGSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>

                {/* Row 1: Name + Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={gLabelStyle}>Full name</label>
                    <input
                      type="text" placeholder="Your Name"
                      value={gForm.name} onChange={e => setGForm({ ...gForm, name: e.target.value })}
                      style={{ ...gInputStyle, borderColor: gErrors.name ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                    />
                    {gErrors.name && <p style={gErrStyle}>{gErrors.name}</p>}
                  </div>
                  <div>
                    <label style={gLabelStyle}>Contact number</label>
                    <input
                      type="tel" placeholder="+91 XXXXX XXXXX"
                      value={gForm.phone} onChange={e => setGForm({ ...gForm, phone: e.target.value })}
                      style={{ ...gInputStyle, borderColor: gErrors.phone ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                    />
                    {gErrors.phone && <p style={gErrStyle}>{gErrors.phone}</p>}
                  </div>
                </div>

                {/* Row 2: Email */}
                <div>
                  <label style={gLabelStyle}>Email</label>
                  <input
                    type="email" placeholder="Your Email"
                    value={gForm.email} onChange={e => setGForm({ ...gForm, email: e.target.value })}
                    style={{ ...gInputStyle, borderColor: gErrors.email ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                  />
                  {gErrors.email && <p style={gErrStyle}>{gErrors.email}</p>}
                </div>

                {/* Row 3: Category */}
                <div>
                  <label style={gLabelStyle}>Grievance category</label>
                  <select
                    value={gForm.category} onChange={e => setGForm({ ...gForm, category: e.target.value })}
                    style={{ ...gInputStyle, borderColor: gErrors.category ? '#ef4444' : 'rgba(255,255,255,0.1)', appearance: 'none' }}
                  >
                    <option value="">Select a category</option>
                    <option value="Hospitals & infrastructure">Hospitals &amp; Infrastructure</option>
                    <option value="Medical services & staff">Medical Services &amp; Staff</option>
                    <option value="Sanitation & hygiene">Sanitation &amp; Hygiene</option>
                    <option value="Stock & medicines unavailability">Stock &amp; Medicines Unavailability</option>
                    <option value="General feedback">General Feedback</option>
                  </select>
                  {gErrors.category && <p style={gErrStyle}>{gErrors.category}</p>}
                </div>

                {/* Row 4: District */}
                <div>
                  <label style={gLabelStyle}>District / facility</label>
                  <input
                    type="text" placeholder="e.g. Dharmapuri District Hospital"
                    value={gForm.district} onChange={e => setGForm({ ...gForm, district: e.target.value })}
                    style={{ ...gInputStyle, borderColor: gErrors.district ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                  />
                  {gErrors.district && <p style={gErrStyle}>{gErrors.district}</p>}
                </div>

                {/* Row 5: Message */}
                <div>
                  <label style={gLabelStyle}>Describe your grievance</label>
                  <textarea
                    rows={4} placeholder="Please provide details, including dates and any reference numbers."
                    value={gForm.message} onChange={e => setGForm({ ...gForm, message: e.target.value })}
                    style={{ ...gInputStyle, resize: 'vertical', borderColor: gErrors.message ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                  />
                  {gErrors.message && <p style={gErrStyle}>{gErrors.message}</p>}
                </div>

                {/* Row 6: CAPTCHA */}
                <div>
                  <label style={gLabelStyle}>Are you human? What is {gCaptcha.num1} + {gCaptcha.num2}?</label>
                  <input
                    type="number" placeholder="Enter answer"
                    value={gCaptcha.answer} onChange={e => setGCaptcha({ ...gCaptcha, answer: e.target.value })}
                    style={{ ...gInputStyle, borderColor: gErrors.captcha ? '#ef4444' : 'rgba(255,255,255,0.1)' }}
                  />
                  {gErrors.captcha && <p style={gErrStyle}>{gErrors.captcha}</p>}
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={gSubmitting} style={{
                  background: gSubmitting ? '#15803d' : '#16a34a',
                  color: 'white', border: 'none', borderRadius: '8px',
                  padding: '15px 20px', fontWeight: 700, fontSize: '1rem',
                  cursor: gSubmitting ? 'not-allowed' : 'pointer',
                  width: '100%', transition: 'background 0.2s'
                }}>
                  {gSubmitting ? 'Submitting...' : 'Submit Grievance'}
                </button>
              </form>

              {/* Track Row */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <input
                  type="text"
                  placeholder="Grievance Reference ID or Email"
                  value={trackId}
                  onChange={e => setTrackId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTrack()}
                  style={{ ...gInputStyle, flex: 1, fontSize: '0.85rem' }}
                />
                <button onClick={handleTrack} disabled={trackLoading} style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white', borderRadius: '8px', padding: '12px 20px',
                  fontWeight: 700, cursor: trackLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem', whiteSpace: 'nowrap'
                }}>
                  {trackLoading ? '...' : 'Track Status'}
                </button>
              </div>
              {trackErr && <p style={{ ...gErrStyle, display: 'block', marginTop: '6px' }}>{trackErr}</p>}

              {/* Tracking Result / Stepper */}
              {trackResult && Array.isArray(trackResult) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '18px' }}>
                  {trackResult.map(result => (
                    <div key={result.reference_id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '20px' }}>
                      <div style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>ID: {result.reference_id}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontSize: '0.75rem' }}>Status</p>
                          <span style={{
                            display: 'inline-block', padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase',
                            background: result.status === 'resolved' ? 'rgba(16,185,129,0.15)' : result.status === 'rejected' ? 'rgba(239,68,68,0.15)' : result.status === 'in_review' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                            color: result.status === 'resolved' ? '#10b981' : result.status === 'rejected' ? '#ef4444' : result.status === 'in_review' ? '#f59e0b' : '#3b82f6'
                          }}>{result.status.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontSize: '0.75rem' }}>Category</p>
                          <p style={{ fontWeight: 600 }}>{result.category}</p>
                        </div>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontSize: '0.75rem' }}>Submitted</p>
                          <p style={{ fontWeight: 600 }}>{new Date(result.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '3px', fontSize: '0.75rem' }}>Updated</p>
                          <p style={{ fontWeight: 600 }}>{new Date(result.updated_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                        {/* Track Line Background */}
                        <div style={{ position: 'absolute', top: '18px', left: '30px', right: '30px', height: '3px', background: 'rgba(255,255,255,0.1)' }} />
                        {/* Track Line Progress */}
                        <div style={{
                          position: 'absolute', top: '18px', left: '30px', height: '3px',
                          width: stepIdx(result.status) === 0 ? '0%' : stepIdx(result.status) === 1 ? '50%' : '100%',
                          background: 'var(--primary)', transition: 'width 0.4s ease'
                        }} />
                        {['Received', 'In Review', 'Resolved'].map((label, idx) => {
                          const currentIdx = stepIdx(result.status);
                          const isCompleted = idx < currentIdx;
                          const isActive = idx === currentIdx;
                          const displayLabel = result.status === 'rejected' && idx === 2 ? 'Rejected' : label;
                          return (
                            <div key={idx} style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '60px' }}>
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.3s',
                                background: isCompleted ? 'var(--primary)' : isActive ? 'rgba(0,210,170,0.15)' : 'rgba(255,255,255,0.05)',
                                border: isActive ? '2px solid var(--primary)' : isCompleted ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.15)',
                                color: isCompleted ? '#0b111e' : isActive ? 'var(--primary)' : 'rgba(255,255,255,0.4)'
                              }}>
                                {isCompleted ? '✓' : idx + 1}
                              </div>
                              <span style={{ fontSize: '0.7rem', color: isActive || isCompleted ? 'white' : 'rgba(255,255,255,0.35)', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'center' }}>{displayLabel}</span>
                            </div>
                          );
                        })}
                      </div>

                      {result.resolution_note && (
                        <div style={{ marginTop: '18px', background: 'rgba(16,185,129,0.08)', borderLeft: '3px solid #10b981', padding: '12px', borderRadius: '4px', fontSize: '0.9rem' }}>
                          {result.resolution_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        <Footer />
      </main>

      {/* Success Modal */}
      {gShowModal && (
        <div onClick={() => setGShowModal(false)} style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(10,15,25,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9998, padding: '20px'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#121927', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', padding: '40px', maxWidth: '440px',
            width: '100%', textAlign: 'center', color: 'white'
          }}>
            <div style={{
              width: '60px', height: '60px', background: 'rgba(16,185,129,0.12)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', fontSize: '2rem'
            }}>✓</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px' }}>Grievance Submitted!</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Your Reference ID is:
            </p>
            <div style={{
              background: 'rgba(0,210,170,0.08)', border: '1px dashed #00d2aa',
              borderRadius: '8px', padding: '14px', fontFamily: 'monospace',
              fontSize: '1.4rem', fontWeight: 800, color: '#00d2aa',
              marginBottom: '20px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '12px'
            }}>
              {gSuccess}
              <button onClick={() => { navigator.clipboard.writeText(gSuccess); showToast(); }} style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1rem'
              }}>📋</button>
            </div>
            <p style={{ color: '#00d2aa', fontSize: '0.82rem', fontWeight: 700, marginBottom: '25px' }}>
              A confirmation email has been sent to you.
            </p>
            <button onClick={() => setGShowModal(false)} style={{
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', borderRadius: '8px', padding: '12px 30px', fontWeight: 700, cursor: 'pointer', width: '100%'
            }}>Done</button>
          </div>
        </div>
      )}

      {/* Copy Toast */}
      {gToast && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', background: '#111827',
          borderLeft: '4px solid #00d2aa', borderRadius: '6px', padding: '12px 20px',
          color: 'white', fontSize: '0.85rem', zIndex: 10000, boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
        }}>Reference ID copied!</div>
      )}

      {/* Floating Login Modal Overlay */}
      {showLogin && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogin(false);
          }}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px', animation: 'fadeIn 0.4s ease'
          }}
        >
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <Login onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}

      {/* Floating Feedback Button (Only in Overview) */}
      <a href="/docs/feedback" style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        background: '#008000',
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 800,
        textDecoration: 'none',
        boxShadow: '0 10px 25px rgba(0, 128, 0, 0.4)',
        zIndex: 9998,
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(0, 128, 0, 0.5)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 128, 0, 0.4)'; }}
      >
        <span className="material-symbols-rounded">chat_bubble</span>
        Feedback
      </a>
    </div>
  );
};

export default Overview;
