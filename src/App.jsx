import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import './App.css';

// Backend returns parsed candidates directly

function App() {
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [modalData, setModalData] = useState({ show: false, name: '', docs: [] });

  const [API_URL, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/AKfycbxUc9kG9nBzXfsrYVDFF2z5yiPWUP3c-vqgvP_unva6SoWgJZ_Ri3qlh6ZlBj7ZL23f/exec');
  const [isApiConfigured, setIsApiConfigured] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Check if API is configured
    if (API_URL !== 'YOUR_APP_SCRIPT_WEB_APP_URL_HERE') {
      setIsApiConfigured(true);
      fetchCandidateData();
    }
  }, [API_URL]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const processData = (rawData) => {
    return rawData.map(row => {
      const missingDocs = [];
      const checkDoc = (key, label) => {
        if (!row[key] || String(row[key]).trim() === '') {
          missingDocs.push(label);
        }
      };

      checkDoc('Pan Card for ID Proof', 'Pan Card');
      checkDoc('Aadhaar Card and Voter Card Both Side ( for Address Proof )', 'Aadhaar / Voter Card');
      checkDoc('Educational Qualification Documents uploading', 'Educational Documents');
      checkDoc('Upload Passport Size Photo', 'Passport Photo');

      if (row['Do you have any work experience?'] === 'YES') {
        checkDoc('Upload Experience Certificate ( releasing Letter)', 'Experience Certificate');
        checkDoc('3 Months Salary Slip / Offer Letter (Of last organization, if applicable)', 'Salary Slip / Offer Letter');
      }

      checkDoc('Updated Bank statement Last three months', 'Bank Statement');
      checkDoc('Bank Passbook / Cancelled Cheque (For salary account verification)', 'Cancelled Cheque');
      checkDoc('Medical Fitness Certificate', 'Medical Fitness Certificate');

      if (row['Marital Status'] === 'Married') {
        checkDoc('Marriage certificate', 'Marriage Certificate');
      }

      return {
        name: row['Full Name'] || 'Unknown',
        email: row['Email address'] || '',
        designation: row['Current Designation'] || row['Designation'] || '',
        mobile: row['Mobile Number'] || row['Gender'] || '',
        missingDocs: missingDocs
      };
    }).filter(c => c.name !== 'Unknown'); // simple filter to avoid completely empty rows
  };

  const fetchCandidateData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Since your app script returns an array directly
      if (Array.isArray(data)) {
        setCandidates(processData(data));
      } else if (data.data && Array.isArray(data.data)) {
        setCandidates(processData(data.data));
      } else {
        throw new Error('Data format isn\'t recognized');
      }

    } catch (err) {
      setError(`Failed to fetch data: ${err.message}. Please check your App Script URL and CORS configuration.`);
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = async (candidate) => {
    // Optimistic UI Toast
    setToastMessage(`Sending reminder to ${candidate.name}...`);
    setShowToast(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Avoids OPTIONS preflight blocked by Apps Script
        },
        body: JSON.stringify({
          name: candidate.name,
          email: candidate.email,
          missingDocs: candidate.missingDocs
        })
      });

      const data = await response.json();
      if (data.success) {
        setToastMessage(`Reminder sent successfully to ${candidate.name}!`);
        // Mark candidate as having received a reminder in the UI
        setCandidates(prevCandidates =>
          prevCandidates.map(c =>
            c.email === candidate.email ? { ...c, lastReminderSentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : c
          )
        );
      } else {
        setToastMessage(`Failed to send reminder: ${data.error}`);
      }
    } catch (err) {
      setToastMessage(`Failed to send reminder: ${err.message}`);
    }

    setTimeout(() => setShowToast(false), 3000);
  };

  const showMoreDocs = (name, remainingDocs) => {
    setModalData({
      show: true,
      name,
      docs: remainingDocs
    });
  };

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm)
  );

  return (
    <div className="dashboard-container">
      <header>
        <div className="header-content">
          <h1>Onboarding Document Tracker</h1>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Dark Mode">
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="moon-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sun-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
        </div>

        <div className="search-container">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by candidate name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {(!isApiConfigured && candidates.length === 0 && !loading) && (
          <div className="file-upload-container">
            <div className="upload-box" style={{ textAlign: 'left' }}>
              <h3 style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Configuration Required</h3>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Please enter your Google Apps Script Web App URL to connect to your real-time data.<br />
                <span style={{ fontSize: '0.8rem' }}>Ensure you deployed Code.gs as a Web App (Access: Anyone)</span>
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  style={{ flex: 1, padding: '0.625rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes('script.google.com')) setApiUrl(val);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <div className="table-card">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Parsing candidate data...</p>
            </div>
          )}

          {error && (
            <div className="loading-state">
              <p style={{ color: 'red' }}>{error}</p>
            </div>
          )}

          {candidates.length > 0 && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>CANDIDATE</th>
                    <th>DESIGNATION</th>
                    <th>EMAIL</th>
                    <th>MOBILE</th>
                    <th>MISSING DOCUMENTS</th>
                    <th style={{ textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, idx) => (
                    <tr key={idx} className="fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <td>
                        <div className="candidate-name">{candidate.name}</div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {candidate.designation}
                        </span>
                      </td>
                      <td className="candidate-email">{candidate.email}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{candidate.mobile}</div>
                      </td>
                      <td>
                        <div className="pills-container">
                          {candidate.missingDocs.length === 0 ? (
                            <span className="pill all-good">All Clear!</span>
                          ) : (
                            <>
                              {candidate.missingDocs.slice(0, 3).map((doc, i) => (
                                <span key={i} className="pill">{doc}</span>
                              ))}
                              {candidate.missingDocs.length > 3 && (
                                <span
                                  className="pill more-pill"
                                  onClick={() => showMoreDocs(candidate.name, candidate.missingDocs.slice(3))}
                                  title="Click to see more"
                                >
                                  +{candidate.missingDocs.length - 3} more
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {candidate.missingDocs.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <button className="btn-primary" onClick={() => sendReminder(candidate)}>
                              <span>Send</span>
                              <span>Reminder</span>
                            </button>
                            {candidate.lastReminderSentAt && (
                              <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                Sent at {candidate.lastReminderSentAt}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Done
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCandidates.length === 0 && (
                <div className="empty-state">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem currentColor', opacity: 0.5 }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <p>No candidates found matching your criteria.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <div className={`toast ${showToast ? 'show' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        {toastMessage}
      </div>

      <div className={`modal-overlay ${modalData.show ? 'show' : ''}`}>
        <div className="modal">
          <div className="modal-header">
            <h3>Missing Documents: {modalData.name}</h3>
            <button className="close-btn" onClick={() => setModalData({ ...modalData, show: false })}>&times;</button>
          </div>
          <div className="modal-body">
            <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 500 }}>Additionally Missing:</div>
            <div className="modal-docs-list">
              {modalData.docs.map((doc, idx) => (
                <div key={idx} className="modal-list-item"><span className="pill">{doc}</span></div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-secondary" onClick={() => setModalData({ ...modalData, show: false })}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
