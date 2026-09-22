import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Footer from '../../components/Footer';

const Information = () => {
  const { section } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);

    const observerOptions = {
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        } else {
          entry.target.classList.remove('active');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [section]);

  const sections = [
    { id: 'manual', name: 'User Manual', icon: 'menu_book' },
    { id: 'privacy', name: 'Privacy Policy', icon: 'verified_user' },
    { id: 'terms', name: 'Terms of Service', icon: 'gavel' },
    { id: 'feedback', name: 'Feedback', icon: 'rate_review' }
  ];

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 992);
  const [showDocsMenu, setShowDocsMenu] = React.useState(false);
  const [feedbackForm, setFeedbackForm] = React.useState({ name: '', email: '', category: '', subject: '', message: '' });
  const [feedbackCaptcha, setFeedbackCaptcha] = React.useState({ num1: 1, num2: 1, answer: '' });
  const [feedbackErrors, setFeedbackErrors] = React.useState({});
  const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState('');
  const activeDoc = sections.find(item => item.id === section) || sections[0];

  const generateFeedbackCaptcha = () => {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    setFeedbackCaptcha({ num1, num2, answer: '' });
  };

  useEffect(() => {
    generateFeedbackCaptcha();
  }, []);

  const submitFeedback = async (event) => {
    event.preventDefault();
    setFeedbackErrors({});
    setFeedbackSuccess('');

    // Captcha Validation
    if (parseInt(feedbackCaptcha.answer) !== feedbackCaptcha.num1 + feedbackCaptcha.num2) {
      setFeedbackErrors({ captcha: 'Incorrect CAPTCHA answer. Please try again.' });
      generateFeedbackCaptcha();
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedbackForm)
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFeedbackSuccess('true');
        setFeedbackForm({ name: '', email: '', category: '', subject: '', message: '' });
      } else if (data.errors) {
        setFeedbackErrors(data.errors);
      } else {
        setFeedbackErrors({ form: data.message || 'Unable to submit feedback. Please try again.' });
      }
    } catch {
      setFeedbackErrors({ form: 'Unable to connect. Please try again shortly.' });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getContent = () => {
    switch (section) {
      case 'manual':
        return (
          <div className="reveal">
            <img src="/assets/workflow_simplified.png" alt="Manual Banner" style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '25px', marginBottom: '40px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '3rem' }}>menu_book</span>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>User Manual</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Step-by-step guidance for healthcare professionals</p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '30px' }}>
              {[
                { step: '01', title: 'District Login', desc: 'Securely access your dashboard using the credentials provided by the State Health Department. Multi-factor authentication ensures only you can access your district data.', icon: 'login' },
                { step: '02', title: 'PHC Data Entry', desc: 'Staff at each PHC record patient visits, attendance, and stock levels. The system validates entries in real-time to prevent human errors.', icon: 'edit_note' },
                { step: '03', title: 'Automated Sync', desc: 'Once data is entered, it is automatically bundled and sent to the central DDHS server. If offline, the data remains safely stored in the browser.', icon: 'sync' },
                { step: '04', title: 'Real-time Alerts', desc: 'Officers should monitor the "Alerts" tab for critical notifications regarding staff shortage or low medicine stock.', icon: 'notifications_active' }
              ].map((item, idx) => (
                <div key={idx} className="glass-card" style={{ padding: '35px', display: 'flex', gap: '30px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', minWidth: '80px', opacity: 0.9 }}>{item.step}</div>
                  <div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', color: '#0f172a' }}>
                      <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '1.6rem' }}>{item.icon}</span>
                      {item.title}
                    </h4>
                    <p style={{ color: '#475569', lineHeight: '1.8', fontSize: '1rem' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="reveal">
            <img src="/assets/about_us.png" alt="Privacy Banner" style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '25px', marginBottom: '40px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span className="material-symbols-rounded" style={{ color: '#059669', fontSize: '3rem' }}>verified_user</span>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Privacy Policy</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Securing and Protecting National Health Data</p>
              </div>
            </div>
            <div style={{ padding: '40px', background: '#ecfdf5', borderRadius: '25px', border: '1px solid #d1fae5', marginBottom: '40px' }}>
              <h4 style={{ color: '#065f46', marginBottom: '15px', fontWeight: 800 }}>Data Security Commitment</h4>
              <p style={{ color: '#065f46', opacity: 0.9, lineHeight: '1.8', fontSize: '1.05rem' }}>
                We employ end-to-end encryption for all patient-identifiable information. Our servers are hosted in secure government data centers with 24/7 monitoring and strict access controls.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
              <div className="glass-card" style={{ padding: '30px', background: 'white' }}>
                <h5 style={{ fontWeight: 900, marginBottom: '15px', color: '#0f172a', display: 'flex', gap: '10px' }}><span className="material-symbols-rounded" style={{ color: '#059669' }}>lock</span> Encryption</h5>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>All data transmitted between PHCs and the District Hub is protected via military-grade SSL/TLS 1.3 encryption protocols.</p>
              </div>
              <div className="glass-card" style={{ padding: '30px', background: 'white' }}>
                <h5 style={{ fontWeight: 900, marginBottom: '15px', color: '#0f172a', display: 'flex', gap: '10px' }}><span className="material-symbols-rounded" style={{ color: '#059669' }}>shield_person</span> Access Control</h5>
                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>Advanced role-based access control (RBAC) ensures that staff only see the data absolutely necessary for their duties.</p>
              </div>
            </div>
          </div>
        );
      case 'terms':
        return (
          <div className="reveal">
            <div style={{ height: '200px', background: 'linear-gradient(135deg, #047857, #16a34a)', borderRadius: '25px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 32px rgba(5, 150, 105, 0.18)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '6rem', color: 'rgba(255,255,255,0.2)' }}>gavel</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '3rem' }}>gavel</span>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Terms of Service</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Official Guidelines for Professional Usage</p>
              </div>
            </div>
            <div style={{ lineHeight: '1.8', color: '#475569', fontSize: '1.05rem' }}>
              <p style={{ background: '#f0fdf4', padding: '25px', borderRadius: '15px', borderLeft: '5px solid var(--primary)' }}>
                By utilizing the Lifeline360 portal, you acknowledge your critical role as a public health official and your responsibility to maintain data integrity and patient confidentiality.
              </p>
              <h4 style={{ color: '#0f172a', marginTop: '40px', fontWeight: 800 }}>1. Professional Conduct</h4>
              <p>The system is for authorized government use only. Any unauthorized sharing of credentials or data access is subject to NHM disciplinary action.</p>
              <h4 style={{ color: '#0f172a', marginTop: '40px', fontWeight: 800 }}>2. Data Accuracy</h4>
              <p>Entering false data regarding attendance, medicine stocks, or patient visits is strictly prohibited. All entries are digitally signed and audited.</p>
            </div>
          </div>
        );
      case 'feedback':
        return (
          <div className="reveal">
            <div style={{ height: '200px', background: 'linear-gradient(135deg, #047857, #16a34a)', borderRadius: '25px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 32px rgba(5, 150, 105, 0.18)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '6rem', color: 'rgba(255,255,255,0.2)' }}>favorite</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '3rem' }}>rate_review</span>
              <div>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>Feedback & Support</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Your field insights help us save lives</p>
              </div>
            </div>
            <form onSubmit={submitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '20px', background: '#f0fdf4', padding: isMobile ? '25px' : '42px', borderRadius: '24px', border: '1px solid #bbf7d0', boxShadow: '0 10px 30px rgba(5, 150, 105, 0.08)' }}>
              <p style={{ margin: 0, color: '#47715a', lineHeight: 1.6 }}>Share a suggestion, report an issue, or ask for help. Our support team will review your message and use your email only to follow up.</p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div><label style={feedbackLabelStyle}>Your name</label><input value={feedbackForm.name} onChange={e => setFeedbackForm({ ...feedbackForm, name: e.target.value })} placeholder="Your full name" style={feedbackInputStyle} />{feedbackErrors.name && <p style={feedbackErrorStyle}>{feedbackErrors.name}</p>}</div>
                <div><label style={feedbackLabelStyle}>Work email</label><input type="email" value={feedbackForm.email} onChange={e => setFeedbackForm({ ...feedbackForm, email: e.target.value })} placeholder="name@organisation.gov.in" style={feedbackInputStyle} />{feedbackErrors.email && <p style={feedbackErrorStyle}>{feedbackErrors.email}</p>}</div>
              </div>
              <div><label style={feedbackLabelStyle}>What can we help with?</label><select value={feedbackForm.category} onChange={e => setFeedbackForm({ ...feedbackForm, category: e.target.value })} style={feedbackInputStyle}><option value="">Choose a category</option><option value="Suggestion">Product suggestion</option><option value="Technical issue">Technical issue</option><option value="Data correction">Data correction</option><option value="Account support">Account support</option><option value="Other">Other</option></select>{feedbackErrors.category && <p style={feedbackErrorStyle}>{feedbackErrors.category}</p>}</div>
              <div><label style={feedbackLabelStyle}>Subject</label><input value={feedbackForm.subject} onChange={e => setFeedbackForm({ ...feedbackForm, subject: e.target.value })} maxLength={160} placeholder="e.g. Suggestion for stock management" style={feedbackInputStyle} />{feedbackErrors.subject && <p style={feedbackErrorStyle}>{feedbackErrors.subject}</p>}</div>
              <div><label style={feedbackLabelStyle}>How can we help?</label><textarea rows="6" value={feedbackForm.message} onChange={e => setFeedbackForm({ ...feedbackForm, message: e.target.value })} maxLength={5000} placeholder="Please include the steps you took, what happened, and what you expected." style={{ ...feedbackInputStyle, resize: 'vertical', lineHeight: 1.6 }}></textarea>{feedbackErrors.message && <p style={feedbackErrorStyle}>{feedbackErrors.message}</p>}</div>
              <div>
                <label style={feedbackLabelStyle}>Are you human? What is {feedbackCaptcha.num1} + {feedbackCaptcha.num2}?</label>
                <input type="number" placeholder="Enter answer" value={feedbackCaptcha.answer} onChange={e => setFeedbackCaptcha({ ...feedbackCaptcha, answer: e.target.value })} style={{ ...feedbackInputStyle, borderColor: feedbackErrors.captcha ? '#ef4444' : 'rgba(16, 185, 129, 0.2)' }} />
                {feedbackErrors.captcha && <p style={feedbackErrorStyle}>{feedbackErrors.captcha}</p>}
              </div>
              {feedbackErrors.form && <p style={feedbackErrorStyle}>{feedbackErrors.form}</p>}
              {feedbackSuccess && <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '15px 18px', borderRadius: '12px', fontWeight: 700 }}>Thanks — your feedback has been successfully submitted! Our team will review it shortly.</div>}
              <button type="submit" disabled={feedbackSubmitting} className="btn btn-primary" style={{ padding: '16px 28px', width: isMobile ? '100%' : 'fit-content', borderRadius: '12px', fontWeight: 750, fontSize: '1rem', opacity: feedbackSubmitting ? 0.7 : 1 }}>{feedbackSubmitting ? 'Sending feedback...' : 'Send feedback'}</button>
            </form>
          </div>
        );
      default:
        return <div>Select a topic from the left sidebar to learn more.</div>;
    }
  };

  return (
    <div className="info-page" style={{ background: '#f7faf8', minHeight: '100vh', color: '#172033' }}>
      <header style={{
        minHeight: '76px', padding: isMobile ? '14px 20px' : '0 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px',
        background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #e5eee8',
        position: 'sticky', top: 0, zIndex: 1000
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span className="material-symbols-rounded" style={{ color: 'white', background: 'var(--primary)', padding: '8px', borderRadius: '10px', fontSize: '1.5rem' }}>ecg</span>
          <span>
            <span style={{ display: 'block', fontWeight: 850, color: '#0f7a2a', fontSize: '1.18rem', lineHeight: 1 }}>Lifeline360</span>
            {!isMobile && <span style={{ display: 'block', color: '#718096', fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Help Centre</span>}
          </span>
        </Link>
        {!isMobile && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, justifyContent: 'center' }}>
            {sections.map(item => (
              <Link
                key={item.id}
                to={`/docs/${item.id}`}
                style={{
                  textDecoration: 'none', color: section === item.id ? 'var(--primary)' : '#475569',
                  background: section === item.id ? 'rgba(22, 163, 74, 0.10)' : 'transparent',
                  fontWeight: section === item.id ? 750 : 600, fontSize: '0.88rem', whiteSpace: 'nowrap',
                  padding: '9px 12px', borderRadius: '9px', transition: 'all 0.2s ease'
                }}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        )}
        {isMobile ? (
          <button onClick={() => setShowDocsMenu(!showDocsMenu)} style={{ background: 'none', border: 'none', color: '#1e293b', padding: '8px' }} aria-label="Open documentation menu">
            <span className="material-symbols-rounded" style={{ fontSize: '2rem' }}>{showDocsMenu ? 'close' : 'menu'}</span>
          </button>
        ) : (
          <Link to="/" style={{ textDecoration: 'none', color: '#166534', fontWeight: 750, fontSize: '0.85rem', whiteSpace: 'nowrap', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px' }}>Back to Home</Link>
        )}
      </header>

      {isMobile && showDocsMenu && (
        <nav style={{ position: 'sticky', top: '76px', zIndex: 999, padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'white', borderBottom: '2px solid #bbf7d0', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.10)' }}>
          {sections.map(item => (
            <Link key={item.id} to={`/docs/${item.id}`} onClick={() => setShowDocsMenu(false)} style={{ textDecoration: 'none', color: section === item.id ? 'var(--primary)' : '#475569', background: section === item.id ? 'rgba(22, 163, 74, 0.10)' : 'transparent', fontWeight: section === item.id ? 750 : 600, padding: '12px 14px', borderRadius: '10px' }}>
              {item.name}
            </Link>
          ))}
          <Link to="/" onClick={() => setShowDocsMenu(false)} style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 700, padding: '12px 14px' }}>Back to Home</Link>
        </nav>
      )}

      <section style={{ background: 'linear-gradient(135deg, #0b6b2a 0%, #159447 55%, #38b765 100%)', color: 'white' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: isMobile ? '42px 24px' : '56px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '28px', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ maxWidth: '680px', textAlign: isMobile ? 'center' : 'left' }}>
            <p style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.76)' }}>Lifeline360 product guide</p>
            <h1 style={{ margin: 0, fontSize: isMobile ? '2rem' : '2.7rem', lineHeight: 1.12, letterSpacing: '-0.035em' }}>{activeDoc.name}</h1>
            <p style={{ margin: '14px 0 0', maxWidth: '560px', color: 'rgba(255,255,255,0.84)', lineHeight: 1.65, fontSize: '1rem' }}>Practical guidance to help you use Lifeline360 securely, confidently, and effectively.</p>
          </div>
          <div style={{ minWidth: '104px', height: '104px', borderRadius: '28px', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '3.2rem', color: 'white' }}>{activeDoc.icon}</span>
          </div>
        </div>
      </section>

      <div style={{
        maxWidth: '1180px', margin: isMobile ? '24px auto 42px' : '44px auto 64px',
        padding: '0 5%', display: 'block'
      }}>
        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <div className="glass-panel" style={{ padding: isMobile ? '26px' : '52px', background: 'white', minHeight: '560px', border: '1px solid #e5eee8', borderRadius: isMobile ? '20px' : '28px', boxShadow: '0 18px 46px rgba(21, 40, 29, 0.08)' }}>
            {getContent()}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

const feedbackLabelStyle = { fontSize: '0.88rem', fontWeight: 750, display: 'block', marginBottom: '8px', color: '#166534' };
const feedbackInputStyle = { width: '100%', padding: '14px 15px', borderRadius: '11px', border: '1px solid #bbf7d0', background: 'white', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', color: '#172033', boxSizing: 'border-box' };
const feedbackErrorStyle = { margin: '6px 0 0', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 };

export default Information;
