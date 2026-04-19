import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Send, MapPin, Clock, Calendar, Zap, X, CheckCircle, Navigation, Star, Music, Coffee, Sparkles, PartyPopper, Moon, Sun, Mic, Bot, Upload, ShieldCheck, User, QrCode } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import './index.css';

const API_BASE_URL = '/api';

const ribbonIcons = [Star, Music, Coffee, Sparkles, PartyPopper, Zap];

/* ═══════════════════════════════ THREE.JS AMBIENT BACKGROUND ═══════════════════════════════ */
function GradientOrb({ position, color, scale, speed, phaseOffset }) {
  const meshRef = useRef(null);
  const opacityRef = useRef(0.22);

  const material = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0.45 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float dist = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    [color]
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime * speed + phaseOffset;
    const breathe = 1 + Math.sin(t) * 0.08;
    const driftY = Math.sin(t * 0.5) * 0.25;
    const driftX = Math.cos(t * 0.35) * 0.18;
    meshRef.current.scale.setScalar(scale * breathe);
    meshRef.current.position.y = position[1] + driftY;
    meshRef.current.position.x = position[0] + driftX;
    meshRef.current.material.uniforms.uOpacity.value = 0.40 + Math.sin(t * 0.4) * 0.12;
  });

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

function ParticleField() {
  const pointsRef = useRef(null);
  const COUNT = 65;

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      vel[i * 3] = (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.004;
      vel[i * 3 + 2] = 0;
    }
    return { positions: pos, velocities: vel };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const material = useMemo(
    () => new THREE.PointsMaterial({
      color: 0x00d4cc,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    }),
    []
  );

  useFrame(() => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      pos.array[i * 3] += velocities[i * 3];
      pos.array[i * 3 + 1] += velocities[i * 3 + 1];
      if (pos.array[i * 3] > 8) pos.array[i * 3] = -8;
      if (pos.array[i * 3] < -8) pos.array[i * 3] = 8;
      if (pos.array[i * 3 + 1] > 5) pos.array[i * 3 + 1] = -5;
      if (pos.array[i * 3 + 1] < -5) pos.array[i * 3 + 1] = 5;
    }
    pos.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

function LightStreak({ startX, startY, speed, delay }) {
  const meshRef = useRef(null);

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00bfff),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = (clock.elapsedTime * speed + delay) % 1;
    meshRef.current.position.x = startX + t * 18 - 4;
    meshRef.current.position.y = startY - t * 11 + 2;
    meshRef.current.rotation.z = -Math.atan2(11, 18);
    const fade = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
    meshRef.current.material.opacity = fade * 0.5;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[1.2, 0.008]} />
    </mesh>
  );
}

function Scene({ isDark }) {
  const bgColor = isDark ? '#050A18' : '#F0F4FF';
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <GradientOrb position={[-4.5, -2, -5]} color={isDark ? '#00D4CC' : '#00897B'} scale={6.5} speed={0.03} phaseOffset={0} />
      <GradientOrb position={[1.5, 2.5, -6]} color={isDark ? '#00BFFF' : '#0088CC'} scale={5.5} speed={0.025} phaseOffset={2.1} />
      <GradientOrb position={[5, 0, -5.5]} color={isDark ? '#8B5CF6' : '#7C3AED'} scale={6.0} speed={0.028} phaseOffset={4.2} />
      <ParticleField />
      <LightStreak startX={-8} startY={4} speed={0.06} delay={0} />
      <LightStreak startX={-8} startY={2} speed={0.05} delay={0.25} />
      <LightStreak startX={-8} startY={0} speed={0.07} delay={0.5} />
      <LightStreak startX={-8} startY={-1} speed={0.045} delay={0.75} />
    </>
  );
}

function AmbientBackground({ isDark }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene isDark={isDark} />
      </Canvas>
      {/* CSS gradient overlay for additional depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 15% 85%, rgba(0,212,204,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 15%, rgba(139,92,246,0.08) 0%, transparent 60%)'
            : 'radial-gradient(ellipse 80% 60% at 15% 85%, rgba(0,168,162,0.06) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 15%, rgba(124,58,237,0.06) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════ CUSTOM CURSOR ═══════════════════════════════ */
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const rippleContainerRef = useRef(null);
  const stateRef = useRef({
    x: -100, y: -100, targetX: -100, targetY: -100,
    ringX: -100, ringY: -100, isHovering: false, isClicking: false,
  });
  const rafRef = useRef(0);
  const rippleIdRef = useRef(0);

  const animate = useCallback(() => {
    const s = stateRef.current;
    const lerp = 0.18;
    const ringLerp = 0.1;

    s.x += (s.targetX - s.x) * lerp;
    s.y += (s.targetY - s.y) * lerp;
    s.ringX += (s.targetX - s.ringX) * ringLerp;
    s.ringY += (s.targetY - s.ringY) * ringLerp;

    if (dotRef.current) {
      dotRef.current.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
    }
    if (ringRef.current) {
      const scale = s.isHovering ? 1.8 : s.isClicking ? 0.6 : 1;
      ringRef.current.style.transform = `translate(${s.ringX}px, ${s.ringY}px) translate(-50%, -50%) scale(${scale})`;
      ringRef.current.style.opacity = s.isHovering ? '0.7' : '0.4';
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (prefersReduced || isTouchDevice) return;

    const handleMouseMove = (e) => {
      stateRef.current.targetX = e.clientX;
      stateRef.current.targetY = e.clientY;
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      const interactive = target.closest('button, a, input, textarea, select, [role="button"], label');
      stateRef.current.isHovering = !!interactive;
    };

    const handleMouseDown = (e) => {
      stateRef.current.isClicking = true;
      // Create ripple
      if (!rippleContainerRef.current) return;
      const id = ++rippleIdRef.current;
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: fixed; left: ${e.clientX}px; top: ${e.clientY}px;
        width: 20px; height: 20px; border-radius: 50%;
        border: 2px solid rgba(0, 212, 204, 0.8);
        transform: translate(-50%, -50%) scale(0.5);
        opacity: 0.8; pointer-events: none;
        animation: cursor-ripple 0.45s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        z-index: 10001;
      `;
      rippleContainerRef.current.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    };

    const handleMouseUp = () => { stateRef.current.isClicking = false; };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mousedown', handleMouseDown, { passive: true });
    document.addEventListener('mouseup', handleMouseUp, { passive: true });

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <>
      {/* Glowing teal dot */}
      <div ref={dotRef} aria-hidden="true" style={{
        position: 'fixed', top: 0, left: 0, width: 16, height: 16,
        borderRadius: '50%', background: 'var(--color-teal, #00D4CC)',
        boxShadow: '0 0 16px rgba(0, 212, 204, 0.9), 0 0 32px rgba(0, 212, 204, 0.5)',
        pointerEvents: 'none', zIndex: 10000, willChange: 'transform',
        transition: 'width 0.15s, height 0.15s',
      }} />
      {/* Trailing ring */}
      <div ref={ringRef} aria-hidden="true" style={{
        position: 'fixed', top: 0, left: 0, width: 48, height: 48,
        borderRadius: '50%', border: '2px solid rgba(0, 212, 204, 0.65)',
        boxShadow: '0 0 12px rgba(0, 212, 204, 0.3)',
        pointerEvents: 'none', zIndex: 9999, willChange: 'transform, opacity',
        transition: 'transform 0.1s ease, opacity 0.15s ease',
      }} />
      {/* Ripple container */}
      <div ref={rippleContainerRef} aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10001, overflow: 'hidden',
      }} />
    </>
  );
}

/* ═══════════════════════════════ MAIN APP ═══════════════════════════════ */
function App() {
  const getLocalDatetimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now - offset)).toISOString().slice(0, 16);
  };

  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: 'Welcome to Elyra! ✨ I am here to assist you in navigating the venue, answering questions about the schedule, and providing real-time recommendations. How can I help you today?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([
    "What is happening right now?",
    "Where is the nearest restroom?",
    "Where can I get food?"
  ]);
  
  // Context state
  const [simulatedTime, setSimulatedTime] = useState(getLocalDatetimeString());
  const [currentZone, setCurrentZone] = useState('Entrance Gate');
  const [themePref, setThemePref] = useState('system');
  
  // Event Data State
  const [eventData, setEventData] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // App View State: 'portal', 'organiser', 'attendee_scan', 'attendee_dashboard'
  const [appView, setAppView] = useState('portal');
  const [isVerifying, setIsVerifying] = useState(false);

  // Organizer Auth Flow
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orgAuthStep, setOrgAuthStep] = useState('choice'); // 'choice', 'pin'
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Proactive AI Engine State
  const [notifiedEvents, setNotifiedEvents] = useState(new Set());

  const [activeTab, setActiveTab] = useState('chat');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Apply theme explicitly 
  useEffect(() => {
    if (themePref === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themePref);
    }
  }, [themePref]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch event data
  const fetchEventStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/event_status`);
      setEventData(response.data);
    } catch (err) {
      console.error("Error fetching event data", err);
    }
  }, []);

  useEffect(() => {
    fetchEventStatus();
  }, [fetchEventStatus]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setInput('');
    setIsLoading(true);
    setSuggestedActions([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, {
        query: textToSend,
        user_zone: currentZone,
        current_time: simulatedTime + "+05:30"
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: response.data.reply,
        action: response.data.action,
        path: response.data.path
      }]);
      if (response.data.suggested_actions) {
        setSuggestedActions(response.data.suggested_actions);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I am having trouble connecting to the backend server. Make sure it is running and your API key is set!' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAdmin = async (finalPin) => {
    const pinToTest = finalPin || pin;
    if (pinToTest.length < 4) return;

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/verify-admin`, { pin: pinToTest });
      if (response.data.success) {
        setIsAuthenticated(true);
        setAppView('organiser');
      }
    } catch (error) {
      setPinError(true);
      setPin('');
      setTimeout(() => setPinError(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinInput = (num) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    if (newPin.length === 4) {
      handleVerifyAdmin(newPin);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await axios.post(`${API_BASE_URL}/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(response.data.message);
      fetchEventStatus(); // Refresh schedule
    } catch (error) {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleResetData = async () => {
    if (!confirm("Are you sure you want to reset to the default demo schedule?")) return;
    try {
      await axios.post(`${API_BASE_URL}/reset-data`);
      fetchEventStatus();
      alert("Demo data restored.");
    } catch (error) {
      alert("Reset failed.");
    }
  };

  // Phase 2: Proactive AI Engine
  useEffect(() => {
    if (!eventData || !eventData.events) return;

    const simTimeMs = new Date(simulatedTime + "+05:30").getTime();

    eventData.events.forEach(event => {
      // Skip if already notified to prevent spam
      if (notifiedEvents.has(event.id)) return;

      const startMs = new Date(event.startTime.includes('+') ? event.startTime : event.startTime + "+05:30").getTime();
      const diffMinutes = (startMs - simTimeMs) / (1000 * 60);

      // If event is approaching in exactly 15 minutes or less, inject a message
      if (diffMinutes > 0 && diffMinutes <= 15) {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            text: `✨ **Heads up!** The **${event.name}** is starting in exactly ${Math.round(diffMinutes)} minutes at the **${event.zone}**. Would you like directions to get there?` 
          }
        ]);
        
        setNotifiedEvents(prev => new Set(prev).add(event.id));
      }
    });
  }, [simulatedTime, eventData, notifiedEvents]);

  const getEventStatus = (e) => {
    const sTimeFixed = e.startTime.includes('+') ? e.startTime : e.startTime + "+05:30";
    const eTimeFixed = e.endTime.includes('+') ? e.endTime : e.endTime + "+05:30";
    const simTimeFull = simulatedTime + "+05:30";

    if (simTimeFull > eTimeFixed) return 'finished';
    if (simTimeFull >= sTimeFixed && simTimeFull <= eTimeFixed) return 'ongoing';
    return 'upcoming';
  };

  const ongoingEvents = eventData?.events?.filter(e => getEventStatus(e) === 'ongoing') || [];

  // Compute whether we are in dark mode for Three.js background
  const isDark = themePref === 'dark' || (themePref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  /* ═══════════════════════════════ VIEW: PORTAL ═══════════════════════════════ */
  if (appView === 'portal') {
    return (
      <div className={`att-teal ${isDark ? 'dark' : 'light'}`} style={{color: 'var(--text-main)'}}>
        <AmbientBackground isDark={isDark} />
        {!isMobile && <CustomCursor />}
        <div className="portal-container">
          <div className="portal-card org-purple" onClick={() => {
            if (isAuthenticated) {
              setAppView('organiser');
            } else {
              setAppView('organiser_auth');
              setOrgAuthStep('choice');
            }
          }}>
            <div className="portal-icon-wrapper"><ShieldCheck size={48} /></div>
            <h1>Organizer</h1>
            <p>Launch an event, upload schedules, and manage real-time alerts from the command center.</p>
          </div>
          <div className="portal-card att-teal" onClick={() => setAppView('attendee_scan')}>
            <div className="portal-icon-wrapper"><User size={48} /></div>
            <h1>Attendee</h1>
            <p>Scan your event code to unlock your personalized AI travel guide and live venue navigator.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ VIEW: ORGANISER AUTH ═══════════════════════════════ */
  if (appView === 'organiser_auth') {
    return (
      <div className={`org-purple ${isDark ? 'dark' : 'light'}`} style={{color: 'var(--text-main)'}}>
        <AmbientBackground isDark={isDark} />
        {!isMobile && <CustomCursor />}
        <div className="portal-container" style={{flexDirection: 'column', gap: '20px', zIndex: 100, padding: '20px'}}>
          
          {orgAuthStep === 'choice' ? (
            <div style={{animation: 'fadeIn 0.4s ease forwards', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px'}}>
              <div style={{textAlign: 'center', marginBottom: '10px'}}>
                <div style={{background: 'rgba(139, 92, 246, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(139, 92, 246, 0.3)'}}>
                  <ShieldCheck size={40} className="text-primary" />
                </div>
                <h1 style={{fontSize: '2rem', fontWeight: '800', marginBottom: '8px'}}>Command Center</h1>
                <p style={{color: 'var(--text-muted)'}}>Choose your management mode</p>
              </div>

              <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center'}}>
                <button className="action-btn org-purple" style={{width: '240px', padding: '24px 20px', borderRadius: '24px', height: 'auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px'}} onClick={() => setOrgAuthStep('pin')}>
                  <Zap size={20} />
                  <span style={{fontSize: '1rem', fontWeight: 'bold'}}>Access Dashboard</span>
                  <span style={{fontSize: '0.75rem', opacity: 0.7, fontWeight: 'normal'}}>Manage your existing live event and schedules.</span>
                </button>
                <button className="action-btn" style={{width: '240px', padding: '24px 20px', borderRadius: '24px', height: 'auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)'}} onClick={() => setOrgAuthStep('pin')}>
                  <Sparkles size={20} />
                  <span style={{fontSize: '1rem', fontWeight: 'bold'}}>Host New Event</span>
                  <span style={{fontSize: '0.75rem', opacity: 0.7, fontWeight: 'normal'}}>Set up a fresh experience from scratch.</span>
                </button>
              </div>

              <button 
                style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginTop: '10px'}}
                onClick={() => setAppView('portal')}
              >
                ← Back to Selection
              </button>
            </div>
          ) : (
            <div className={`pin-auth-container ${pinError ? 'shake' : ''}`} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', animation: 'fadeIn 0.4s ease forwards'}}>
              <div style={{textAlign: 'center'}}>
                <h2 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px'}}>Secure Admin Entry</h2>
                <p style={{color: 'var(--text-muted)', fontSize: '0.85rem'}}>Please enter your 4-digit access code</p>
              </div>

              <div style={{display: 'flex', gap: '16px'}}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`pin-dot ${pin.length > i ? 'active' : ''}`} />
                ))}
              </div>

              <div className="pin-keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button key={num} onClick={() => handlePinInput(num.toString())}>{num}</button>
                ))}
                <button onClick={() => setPin('')} style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>CLS</button>
                <button onClick={() => handlePinInput('0')}>0</button>
                <button onClick={() => setPin(pin.slice(0, -1))} style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>DEL</button>
              </div>

              <button 
                style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem'}}
                onClick={() => setOrgAuthStep('choice')}
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ VIEW: ATTENDEE SCAN ═══════════════════════════════ */
  const handleVerifyScan = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setAppView('attendee_dashboard');
    }, 2000);
  };

  if (appView === 'attendee_scan') {
    return (
      <div className={`att-teal ${isDark ? 'dark' : 'light'}`} style={{color: 'var(--text-main)'}}>
        <AmbientBackground isDark={isDark} />
        {!isMobile && <CustomCursor />}
        <div className="portal-container" style={{flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 100, padding: '20px'}}>
          <div style={{textAlign: 'center', marginBottom: '4px'}}>
             <h2 style={{fontSize: '2rem', fontWeight: '700', letterSpacing: '-1px', color: 'var(--text-main)', marginBottom: '4px'}}>Initialize Entry</h2>
             <p style={{color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.8}}>Align code within the scanner below</p>
          </div>

          <div className="scanner-viewport" style={{border: '3px solid rgba(0, 212, 204, 0.4)', borderRadius: '32px'}}>
            <div className="scanner-beam"></div>
            <div className="scanner-hologram"></div>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '150px', height: '150px', background: '#fff', padding: '10px', borderRadius: '12px',
              boxShadow: '0 0 50px rgba(0, 212, 204, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
               <svg viewBox="0 0 100 100" style={{width: '100%', height: '100%', fill: '#000'}}>
                 <path d="M10 10h30v30h-30z M10 60h30v30h-30z M60 10h30v30h-30z M20 20h10v10h-10z M20 70h10v10h-10z M70 20h10v10h-10z M45 10h10v10h-10z M10 45h10v10h-10z M60 45h10v10h-10z M45 60h10v10h-10z M45 45h10v10h-10z M70 45h20v10h-20z M60 60h10v30h-10z M80 60h10v10h-10z M70 70h10v10h-10z M80 80h10v10h-10z" />
               </svg>
            </div>
            {isVerifying && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10
              }}>
                <div className="verify-pulse"></div>
                <p style={{marginTop: '20px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '2px'}}>VERIFYING...</p>
              </div>
            )}
          </div>

          <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'}}>
            <button 
              className="action-btn" 
              style={{
                width: '320px', padding: '14px 40px', borderRadius: '32px', fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #00D4CC, #00BFFF)', border: 'none', color: '#fff',
                fontWeight: '700', boxShadow: '0 15px 30px rgba(0,212,204,0.3)', cursor: isVerifying ? 'wait' : 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={handleVerifyScan}
              disabled={isVerifying}
            >
              {isVerifying ? 'PLEASE WAIT' : 'CONFIRM SCAN & ENTER'}
            </button>
            <button 
              style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500', transition: 'color 0.2s', padding: '4px'}}
              onClick={() => setAppView('portal')}
              onMouseOver={(e) => e.target.style.color = 'var(--primary)'}
              onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
            >
              ← Cancel and Return to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════ VIEW: DASHBOARDS ═══════════════════════════════ */
  const isOrganiserView = appView === 'organiser';
  const showAdminControls = isOrganiserView;

  return (
    <>
      <AmbientBackground isDark={isDark} />
      {!isMobile && <CustomCursor />}

      <div className={`app-container ${isOrganiserView ? 'organiser-theme' : 'att-teal'}`}>
        <div style={{position: 'absolute', top: '20px', left: '20px', zIndex: 100}}>
          <button 
            onClick={() => setAppView('portal')}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)',
              color: 'var(--text-main)', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
              fontSize: '0.75rem', backdropFilter: 'blur(10px)'
            }}
          >
            ← Portal
          </button>
        </div>
        {/* Context Control Sidebar */}
        {(!isMobile || activeTab === 'schedule') && (
        <div className="glass-panel sidebar">
          <h2>
            <div style={{display:'flex', alignItems: 'center', gap: '2px', marginRight: '2px'}}>
              <Mic size={22} className="text-primary" />
              <Sparkles size={14} className="text-primary" style={{transform: 'translate(-4px, -6px)'}} />
            </div>
            Event Horizon
          </h2>

          <div className="control-group mt-2">
            <label><Clock size={14} style={{display:'inline', marginRight:'4px'}}/> Current Time</label>
            <input 
              type="datetime-local" 
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
            />
          </div>
          
          <div className="control-group mt-2">
            <label><MapPin size={14} style={{display:'inline', marginRight:'4px'}}/> Your Event Zone</label>
            <select value={currentZone} onChange={(e) => setCurrentZone(e.target.value)}>
               {eventData?.zones?.map(z => (
                  <option key={z.id} value={z.name}>{z.name}</option>
               ))}
               {!eventData && <option value="Entrance Gate">Entrance Gate</option>}
            </select>
          </div>

          <div className="events-panel mt-auto">
            {ongoingEvents.length > 0 && (
              <div style={{marginBottom: '14px'}}>
                <div className="ongoing-badge bg-pulse">Currently Ongoing</div>
                {ongoingEvents.map(e => (
                  <div 
                    className="event-card ongoing" 
                    key={`ongoing-${e.id}`} 
                    onClick={() => setSelectedEvent(e)}
                  >
                    <h4>{e.name}</h4>
                    <p style={{fontSize:'0.75rem', marginTop:'4px', marginBottom:'6px', color:'var(--text-main)'}}>{e.description}</p>
                    <p className="event-loc"><MapPin size={10} /> {e.zone}</p>
                    <p className="event-time">
                      <Clock size={10} />
                      {new Date(e.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(e.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {showAdminControls && (
              <div style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px'}}>
                {/* Event Access Card (Holographic Pass) */}
                <div style={{
                  padding: '20px', 
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
                  borderRadius: '24px',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  textAlign: 'center',
                  boxShadow: '0 0 30px rgba(139, 92, 246, 0.1)'
                }}>
                  <h4 style={{fontSize: '0.9rem', marginBottom: '16px', color: 'var(--org-secondary)', letterSpacing: '1px', textTransform: 'uppercase'}}>Official Access Key</h4>
                  <div style={{
                    width: '180px', height: '180px', 
                    background: '#fff', padding: '12px', borderRadius: '16px', margin: '0 auto',
                    boxShadow: '0 0 20px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.4)',
                    display: 'flex', alignItems: 'center', justifyItems: 'center'
                  }}>
                    {/* Simulated scannable QR via SVG */}
                    <svg viewBox="0 0 100 100" style={{width: '100%', height: '100%', fill: '#000'}}>
                      <path d="M10 10h30v30h-30z M10 60h30v30h-30z M60 10h30v30h-30z M20 20h10v10h-10z M20 70h10v10h-10z M70 20h10v10h-10z M45 10h10v10h-10z M10 45h10v10h-10z M60 45h10v10h-10z M45 60h10v10h-10z M45 45h10v10h-10z M70 45h20v10h-20z M60 60h10v30h-10z M80 60h10v10h-10z M70 70h10v10h-10z M80 80h10v10h-10z" />
                    </svg>
                  </div>
                  <p style={{fontSize: '0.7rem', marginTop: '16px', opacity: 0.6, letterSpacing: '2px'}}>ID: EVENT-SKY-2026</p>
                </div>

                <div style={{padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', border: '1px solid var(--border-light)'}}>
                   <h4 style={{fontSize: '0.8rem', marginBottom: '8px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '6px'}}>
                     <Upload size={14} /> Schedule Management
                   </h4>
                   <div style={{display: 'flex', gap: '8px'}}>
                     <button 
                       className="action-btn" 
                       style={{flex: 1, padding: '8px', fontSize: '0.7rem'}}
                       onClick={() => document.getElementById('csv-upload').click()}
                     >
                       Upload CSV
                     </button>
                     <button 
                       className="action-btn" 
                       style={{flex: 1, padding: '8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)'}}
                       onClick={handleResetData}
                     >
                       Reset
                     </button>
                   </div>
                   <input 
                     id="csv-upload" 
                     type="file" 
                     accept=".csv" 
                     hidden 
                     onChange={handleFileUpload} 
                   />
                   <p style={{fontSize: '0.65rem', marginTop: '8px', color: 'var(--text-muted)', lineHeight: '1.2'}}>
                     Columns required: <b>name, startTime, location, zone</b>
                   </p>
                </div>
              </div>
            )}

            <h3 style={{marginTop: '24px'}}><Calendar size={16} /> Schedule Overview</h3>
            <div className="event-list">
              {eventData?.events?.map(e => {
                const status = getEventStatus(e);
                return (
                  <div 
                    className={`event-card ${status}`} 
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                  >
                    <div className="event-card-header">
                      <h4>{e.name}</h4>
                      {status === 'finished' && <span className="status-tag status-done"><CheckCircle size={10} /> Past</span>}
                      {status === 'upcoming' && <span className="status-tag status-up"><Calendar size={10} /> Next</span>}
                      {status === 'ongoing' && <span className="status-tag status-active"><Zap size={10} /> Now</span>}
                    </div>
                    <p className="event-loc"><MapPin size={10} /> {e.zone}</p>
                    <p className="event-time">
                      <Clock size={10} /> 
                      {new Date(e.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(e.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* Column 2: Main Chat Interface */}
        {(!isMobile || activeTab === 'chat') && (
        <div className="glass-panel chat-container" style={{position: 'relative', flex: 2}}>
          <div className="chat-header">
            <h1>
              Elyra
              <Bot size={28} className="bot-hologram" />
            </h1>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <button 
                className="theme-toggle-btn" 
                onClick={() => setThemePref(themePref === 'light' || (themePref === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')}
                title="Toggle Theme"
              >
                {themePref === 'light' || (themePref === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <div className="status">
                <span className="status-dot"></span> Live Chat
              </div>
            </div>
          </div>
          
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div>{m.text.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}</div>

                {m.action === 'show_map' && (
                  <div className="virtual-map">
                    {m.path && Array.isArray(m.path) ? (
                      m.path.map((zone, idx) => (
                        <React.Fragment key={idx}>
                          <div className={`map-node ${idx === 0 ? 'start' : idx === m.path.length - 1 ? 'end' : 'intermediate'}`}>
                            {idx === m.path.length - 1 ? <Zap size={16}/> : idx === 0 ? <MapPin size={16}/> : <div className="intermediate-dot"></div>}
                            {zone}
                          </div>
                          {idx < m.path.length - 1 && (
                            <div className="map-path"><div className="path-line" style={{animationDelay: `${idx * 0.5}s`}}></div></div>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <>
                        <div className="map-node start"><MapPin size={16}/> {currentZone}</div>
                        <div className="map-path"><div className="path-line"></div></div>
                        <div className="map-node end"><Zap size={16}/> Destination</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          {!isLoading && suggestedActions.length > 0 && (
            <div className="quick-actions">
              {suggestedActions.map((action, i) => (
                <button key={i} className="action-btn" onClick={() => handleSend(action)}>
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Message Input */}
          <div className="chat-input-area">
            <input 
              type="text" 
              placeholder="Ask anything (e.g. Where is the exit?)" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={() => handleSend()} disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </div>
        </div>
        )}

        {/* Column 3: Live Feed / Notifications */}
        {(!isMobile || activeTab === 'alerts') && (
          <div className="glass-panel alerts-sidebar">
            <div className="chat-header" style={{borderBottom: '1px solid var(--border-light)', marginBottom: '16px', padding: '0 0 12px 0'}}>
              <h1 style={{fontSize: '1.2rem'}}><Zap size={22} className="text-primary" /> Live Updates</h1>
            </div>
            <div className="alerts-list">
              {eventData?.emergency?.active_cases?.length > 0 ? eventData.emergency.active_cases.map((em, i) => (
                <div key={`em-${i}`} className="alert-card emergency">
                   <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '6px'}}>
                      <Zap size={16} /> EMERGENCY ALERT
                   </div>
                   <p>{em.message}</p>
                   <p style={{fontSize: '0.75rem', marginTop: '6px', opacity: 0.8}}><MapPin size={10} style={{display:'inline'}}/> {em.zone}</p>
                </div>
              )) : null}
              
              {eventData?.announcements?.length > 0 ? eventData.announcements.map((ann, i) => (
                <div key={`ann-${i}`} className={`alert-card ${ann.priority === 'high' ? 'high-priority' : 'normal'}`}>
                   <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '6px'}}>
                      <Star size={14} /> ANNOUNCEMENT
                   </div>
                   <p>{ann.message}</p>
                </div>
              )) : (
                <div style={{textAlign: 'center', padding: '40px 20px', opacity: 0.5}}>
                  <Sparkles size={32} style={{marginBottom: '12px'}} />
                  <p>No new announcements yet. Stay tuned!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobile && (
          <div className="mobile-nav">
             <button className={activeTab === 'schedule' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setActiveTab('schedule')}>
                <Calendar size={20} /> Schedule
             </button>
             <button className={activeTab === 'chat' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setActiveTab('chat')}>
                <Bot size={20} /> AI Guide
             </button>
             <button className={activeTab === 'alerts' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setActiveTab('alerts')}>
                <Zap size={20} /> Updates
             </button>
          </div>
        )}
      </div>

      {/* Modal for Event Details */}
      {selectedEvent && (
        <>
          <div className="popup-overlay" onClick={() => setSelectedEvent(null)}></div>
          <div className="event-detail-popup">
            <button className="popup-close" onClick={() => setSelectedEvent(null)}>
              <X size={16} />
            </button>
            <h3 style={{fontSize: '1.2rem', marginBottom: '8px', paddingRight: '20px'}}>{selectedEvent.name}</h3>
            <p style={{color: 'var(--primary)', fontWeight: '500', marginBottom: '16px', display: 'flex', alignItems: 'center'}}>
              <MapPin size={14} style={{marginRight:'4px'}}/>
              {selectedEvent.zone}
            </p>
            
            <div className="popup-time-box">
              <p className="label">Schedule</p>
              <div>
                <strong>Start:</strong> {new Date(selectedEvent.startTime).toLocaleString([], {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}<br/>
                <strong>End:</strong> {new Date(selectedEvent.endTime).toLocaleString([], {hour: '2-digit', minute: '2-digit'})}
              </div>
            </div>
            
            <p style={{fontSize: '0.95rem', lineHeight: '1.5'}}>{selectedEvent.description}</p>
            <button 
              className="action-btn w-full mt-4" 
              onClick={() => {
                handleSend(`Navigate me to the ${selectedEvent.name} at ${selectedEvent.zone}`);
                setSelectedEvent(null);
              }}
            >
              <Navigation size={14} style={{display:'inline', marginRight:'6px'}}/>
              Ask for Directions
            </button>
          </div>
        </>
      )}
    </>
  );
}

export default App;
