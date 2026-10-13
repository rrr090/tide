import { useState } from 'react'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'events' | 'workshops'>('home')

  // Определяем смещение ленты в процентах в зависимости от вкладки
  const getTransformValue = () => {
    if (activeTab === 'home') return 'translateX(0%)'
    if (activeTab === 'events') return 'translateX(-33.333%)'
    if (activeTab === 'workshops') return 'translateX(-66.666%)'
  }

  return (
    <div className="app-container">
      {/* Шапка / Навигация */}
      <header className="site-header">
        <div className="wrap site-header__inner">
          <a href="#home" className="brand" onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}>
            <span className="brand__mark"></span>
            <span className="brand__name">TIDE AI Club</span>
          </a>
          <nav className="nav">
            <button 
              className={`nav__link ${activeTab === 'home' ? 'active' : ''}`} 
              onClick={() => setActiveTab('home')}
            >
              Home
            </button>
            <button 
              className={`nav__link ${activeTab === 'events' ? 'active' : ''}`} 
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
            <button 
              className={`nav__link ${activeTab === 'workshops' ? 'active' : ''}`} 
              onClick={() => setActiveTab('workshops')}
            >
              Workshops
            </button>
          </nav>
        </div>
      </header>

      {/* Лента страниц с плавным свайпом */}
      <main className="main-view" style={{ transform: getTransformValue() }}>
        
        {/* Вкладка 1: Home */}
        <div className={`tab-pane ${activeTab === 'home' ? 'active' : ''}`}>
          <section id="center">
            <div className="hero">
              <img src={heroImg} className="base" width="170" height="179" alt="Tide Wave" />
            </div>
            <div style={{ textAlign: 'center', maxWidth: '500px' }}>
              <h1>Learn AI by riding the wave together.</h1>
              <p style={{ color: 'var(--muted)', marginTop: '12px' }}>
                TIDE is a student club for hands-on AI. Choose a direction and ship something real with a team.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="counter"
                onClick={() => setActiveTab('events')}
              >
                 See upcoming events
              </button>
              <button
                type="button"
                className="counter"
                onClick={() => setActiveTab('workshops')}
                style={{ background: 'var(--ice)', color: 'var(--navy)' }}
              >
                Browse workshops
              </button>
            </div>
          </section>
        </div>

        {/* Вкладка 2: Events */}
        <div className={`tab-pane ${activeTab === 'events' ? 'active' : ''}`}>
          <section id="center" style={{ padding: '40px 20px', textAlign: 'left', maxWidth: '700px', margin: '0 auto' }}>
            <h2>Upcoming Events</h2>
            <p style={{ color: 'var(--muted)', margin: '10px 0 20px' }}>Open nights, workshops and reading groups. Everyone is welcome.</p>
            <div className="panel" style={{ marginBottom: '15px' }}>
              <h3>Introduction to Transformers & Attention</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Friday, 18:00 • Lab 302</p>
            </div>
            <button className="counter" onClick={() => setActiveTab('home')}>← Back to Home</button>
          </section>
        </div>

        {/* Вкладка 3: Workshops */}
        <div className={`tab-pane ${activeTab === 'workshops' ? 'active' : ''}`}>
          <section id="center" style={{ padding: '40px 20px', textAlign: 'left', maxWidth: '700px', margin: '0 auto' }}>
            <h2>Workshop Archive</h2>
            <p style={{ color: 'var(--muted)', margin: '10px 0 20px' }}>Missed a session? The notes, slides and code are all here.</p>
            <div className="panel" style={{ marginBottom: '15px' }}>
              <h3>Building an RAG System from Scratch</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Led by AI Club Mentors • Materials available (PDF, Code)</p>
            </div>
            <button className="counter" onClick={() => setActiveTab('home')}>← Back to Home</button>
          </section>
        </div>

      </main>

      <div className="ticks"></div>
      
      <section id="next-steps">
        <div id="docs">
          <h2>TIDE AI Club</h2>
          <p>CUHK-Shenzhen student-led AI community.</p>
        </div>
      </section>
      <div id="spacer"></div>
    </div>
  )
}

export default App