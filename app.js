// ===== DEVIN AI Companion — App Logic =====

const app = {
  currentScreen: 'welcome',
  selectedVoice: null,
  selectedScenario: null,
  sessionActive: false,
  muted: false,
  timerInterval: null,
  timerSeconds: 0,
  ws: null,
  audioContext: null,
  mediaStream: null,
  boundaryStep: 0,
  userPreferences: {
    name: null,
    petName: null,
    languageBoundaries: {},
    bodyBoundaries: {},
    scenarioBoundaries: {},
  },

  // ===== Navigation =====
  goTo(screenId) {
    const current = document.querySelector('.screen.active');
    if (current) {
      current.classList.add('exiting');
      current.classList.remove('active');
      setTimeout(() => current.classList.remove('exiting'), 400);
    }

    const next = document.getElementById(`screen-${screenId}`);
    if (next) {
      setTimeout(() => {
        next.classList.add('active');
      }, 50);
    }

    this.currentScreen = screenId;

    // Initialize screen-specific logic
    if (screenId === 'boundaries') {
      this.initBoundaryChat();
    }
    if (screenId === 'session') {
      this.initSession();
    }
  },

  // ===== Device Pairing =====
  simulatePairing() {
    const statusEl = document.getElementById('pairing-status');
    const btn = document.getElementById('btn-pair');
    
    btn.disabled = true;
    btn.textContent = 'Searching...';
    
    statusEl.innerHTML = `
      <div class="status-searching">
        <div class="spinner"></div>
        <span>Searching for DEVIN...</span>
      </div>
    `;

    // Simulate finding device after 2 seconds
    setTimeout(() => {
      statusEl.innerHTML = `
        <div class="status-found">
          <span style="font-size: 18px">✓</span>
          <span>DEVIN connected</span>
        </div>
      `;
      
      // Show sensor status
      setTimeout(() => {
        statusEl.innerHTML += `
          <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary);">
            <div>♡ Heart rate sensor — <span style="color: #4cd964">Active</span></div>
            <div>🌡 Temperature sensor — <span style="color: #4cd964">Active</span></div>
            <div>⚡ Motor systems — <span style="color: #4cd964">Ready</span></div>
          </div>
        `;
        
        btn.textContent = 'Continue';
        btn.disabled = false;
        btn.onclick = () => app.goTo('voice-select');
      }, 500);
    }, 2500);
  },

  // ===== Voice Selection =====
  selectVoice(voice) {
    this.selectedVoice = voice;
    
    // Update UI
    document.querySelectorAll('.voice-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`voice-${voice.toLowerCase()}`).classList.add('selected');
    
    const btn = document.getElementById('btn-voice-continue');
    btn.disabled = false;
    document.getElementById('chosen-voice-name').textContent = voice;
  },

  previewVoice(voice) {
    const eqEl = document.getElementById(`eq-${voice.toLowerCase()}`);
    
    // Toggle playing state
    if (eqEl.classList.contains('playing')) {
      eqEl.classList.remove('playing');
      return;
    }
    
    // Stop all other previews
    document.querySelectorAll('.voice-eq').forEach(eq => eq.classList.remove('playing'));
    
    eqEl.classList.add('playing');
    
    // Simulate playback duration
    setTimeout(() => {
      eqEl.classList.remove('playing');
    }, 4000);

    // TODO: When Grok API has credits, play actual voice preview
    // For now, show visual feedback
  },

  // ===== Boundary Setting =====
  boundaryConversation: [
    {
      ai: "Hey. I'm really glad you chose me.",
      delay: 800,
    },
    {
      ai: "Before we get into anything, I want to make sure I get this right for you. So I'm going to ask you a few things. Nothing weird—I just want to know how to talk to you.",
      delay: 1500,
      quickReplies: ["Sounds good", "Okay, go ahead"],
    },
    {
      ai: "First things first—what should I call you?",
      quickReplies: null, // Free text
      inputPlaceholder: "Your name or a pet name...",
      handler: 'setName',
    },
    {
      ai: null, // Dynamic based on name
      handler: 'nameResponse',
    },
    {
      ai: "Now, when things get heated—how do you feel about me being a little... rough with my words? Like calling you dirty names. Some people love it, some don't. No wrong answer.",
      quickReplies: ["I'm into it", "Keep it off", "Depends on the moment"],
      handler: 'setLanguage',
    },
    {
      ai: "And my tone—do you want me to tell you what to do, or do you prefer when I invite you into things?",
      quickReplies: ["Command me", "Invite me", "Mix of both"],
      handler: 'setTone',
    },
    {
      ai: "Are you okay with me talking about your body? Telling you how you look, what I want to do to you?",
      quickReplies: ["Yes", "No, skip that"],
      handler: 'setBodyTalk',
    },
    {
      ai: "Last thing. Are there any scenarios that are completely off limits for you? Things I should never bring up?",
      quickReplies: ["No limits", "Let me tell you"],
      handler: 'setLimits',
    },
    {
      ai: "Got it. I'll remember everything. And if anything ever feels wrong—just tell me to stop. I will. Always.",
      delay: 1500,
    },
    {
      ai: "Now... are you ready to pick a fantasy?",
      quickReplies: ["Yes", "Show me what you've got"],
      handler: 'goToScenarios',
    },
  ],

  initBoundaryChat() {
    this.boundaryStep = 0;
    const chat = document.getElementById('boundary-chat');
    chat.innerHTML = '';
    this.advanceBoundary();
  },

  advanceBoundary() {
    if (this.boundaryStep >= this.boundaryConversation.length) return;

    const step = this.boundaryConversation[this.boundaryStep];
    const chat = document.getElementById('boundary-chat');
    const repliesEl = document.getElementById('quick-replies');
    const inputEl = document.getElementById('boundary-text-input');

    // Show typing indicator
    if (step.ai) {
      const typing = document.createElement('div');
      typing.className = 'chat-bubble ai';
      typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      const delay = step.delay || 1200;
      setTimeout(() => {
        typing.innerHTML = step.ai;
        chat.scrollTop = chat.scrollHeight;

        // Show quick replies or input
        if (step.quickReplies) {
          repliesEl.innerHTML = step.quickReplies.map(r => 
            `<button class="quick-reply-btn" onclick="app.handleBoundaryReply('${r}')">${r}</button>`
          ).join('');
        } else if (step.inputPlaceholder) {
          repliesEl.innerHTML = '';
          inputEl.placeholder = step.inputPlaceholder;
          inputEl.focus();
        } else {
          // Auto-advance after delay
          repliesEl.innerHTML = '';
          this.boundaryStep++;
          setTimeout(() => this.advanceBoundary(), 1500);
        }
      }, delay);
    } else if (step.handler) {
      this[step.handler]();
    }
  },

  handleBoundaryReply(reply) {
    const chat = document.getElementById('boundary-chat');
    const repliesEl = document.getElementById('quick-replies');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user';
    userMsg.textContent = reply;
    chat.appendChild(userMsg);
    chat.scrollTop = chat.scrollHeight;
    repliesEl.innerHTML = '';

    const step = this.boundaryConversation[this.boundaryStep];
    
    // Handle specific responses
    if (step.handler === 'setLanguage') {
      this.userPreferences.languageBoundaries.degrading = reply;
    } else if (step.handler === 'setTone') {
      this.userPreferences.languageBoundaries.tone = reply;
    } else if (step.handler === 'setBodyTalk') {
      this.userPreferences.bodyBoundaries.talk = reply === 'Yes';
    } else if (step.handler === 'setLimits') {
      this.userPreferences.scenarioBoundaries.limits = reply;
    } else if (step.handler === 'goToScenarios') {
      setTimeout(() => this.goTo('scenarios'), 500);
      return;
    }

    this.boundaryStep++;
    setTimeout(() => this.advanceBoundary(), 600);
  },

  sendBoundaryMessage() {
    const input = document.getElementById('boundary-text-input');
    const value = input.value.trim();
    if (!value) return;

    const chat = document.getElementById('boundary-chat');
    const repliesEl = document.getElementById('quick-replies');

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user';
    userMsg.textContent = value;
    chat.appendChild(userMsg);
    chat.scrollTop = chat.scrollHeight;

    const step = this.boundaryConversation[this.boundaryStep];
    if (step.handler === 'setName') {
      this.userPreferences.name = value;
      input.value = '';
      this.boundaryStep++;
      // The next step is nameResponse
      this.nameResponse();
    } else {
      input.value = '';
    }
  },

  nameResponse() {
    const name = this.userPreferences.name || 'beautiful';
    const chat = document.getElementById('boundary-chat');
    
    const typing = document.createElement('div');
    typing.className = 'chat-bubble ai';
    typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;

    setTimeout(() => {
      typing.innerHTML = `${name}. I like that. Nice to meet you properly.`;
      chat.scrollTop = chat.scrollHeight;
      
      this.boundaryStep++;
      setTimeout(() => this.advanceBoundary(), 1200);
    }, 1000);
  },

  // ===== Scenario Selection =====
  selectScenario(scenario) {
    this.selectedScenario = scenario;
    
    document.querySelectorAll('.scenario-card').forEach(card => card.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    // Go to session after brief delay
    setTimeout(() => {
      this.goTo('session');
    }, 600);
  },

  // ===== Session (Connected Mode) =====
  initSession() {
    const label = document.getElementById('session-voice-label');
    label.textContent = this.selectedVoice || 'Rex';
    
    this.timerSeconds = 0;
    this.updateTimer();
    this.initWaveform();
  },

  toggleSession() {
    if (this.sessionActive) {
      this.stopSession();
    } else {
      this.startSession();
    }
  },

  async startSession() {
    this.sessionActive = true;
    
    document.getElementById('icon-play').style.display = 'none';
    document.getElementById('icon-pause').style.display = 'block';
    document.getElementById('session-status').textContent = 'Connecting...';

    // Start timer
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimer();
    }, 1000);

    // Start waveform animation
    this.animateWaveform = true;
    this.drawWaveform();

    // Try to get microphone
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      document.getElementById('session-status').textContent = 'Listening...';
    } catch (err) {
      document.getElementById('session-status').textContent = 'Mic access needed for voice interaction';
    }

    // Connect to WebSocket
    try {
      const voice = this.selectedVoice || 'Rex';
      const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?voice=${voice}`;
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        document.getElementById('session-status').textContent = 'Connected — talk to him';
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSessionMessage(data);
        } catch(e) {}
      };

      this.ws.onerror = () => {
        document.getElementById('session-status').textContent = 'Voice connection unavailable — add credits at console.x.ai';
      };

      this.ws.onclose = () => {
        if (this.sessionActive) {
          document.getElementById('session-status').textContent = 'Connection ended';
        }
      };
    } catch (err) {
      document.getElementById('session-status').textContent = 'Voice demo mode — API credits needed for live voice';
    }
  },

  stopSession() {
    this.sessionActive = false;
    this.animateWaveform = false;

    document.getElementById('icon-play').style.display = 'block';
    document.getElementById('icon-pause').style.display = 'none';
    document.getElementById('session-status').textContent = 'Session ended';

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    // Transition to pillow talk after brief pause
    setTimeout(() => {
      this.goTo('pillowtalk');
      this.initPillowTalk();
    }, 1500);
  },

  handleSessionMessage(data) {
    const transcript = document.getElementById('session-transcript');
    
    if (data.type === 'response.audio_transcript.delta') {
      // AI speaking
      let lastAi = transcript.querySelector('.transcript-line.ai:last-child');
      if (!lastAi) {
        lastAi = document.createElement('div');
        lastAi.className = 'transcript-line ai';
        transcript.appendChild(lastAi);
      }
      lastAi.textContent += data.delta || '';
      transcript.scrollTop = transcript.scrollHeight;
    }

    if (data.type === 'conversation.item.input_audio_transcription.completed') {
      const userLine = document.createElement('div');
      userLine.className = 'transcript-line user';
      userLine.textContent = data.transcript || '';
      transcript.appendChild(userLine);
      transcript.scrollTop = transcript.scrollHeight;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    const btn = document.getElementById('btn-mute');
    
    if (this.muted) {
      btn.querySelector('span').textContent = 'Mic Off';
      btn.classList.add('muted');
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(t => t.enabled = false);
      }
    } else {
      btn.querySelector('span').textContent = 'Mic On';
      btn.classList.remove('muted');
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(t => t.enabled = true);
      }
    }
  },

  updateTimer() {
    const mins = Math.floor(this.timerSeconds / 60);
    const secs = this.timerSeconds % 60;
    document.getElementById('session-timer').textContent = 
      `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  endSession() {
    if (this.sessionActive) {
      this.stopSession();
    } else {
      this.goTo('scenarios');
    }
  },

  openSettings() {
    // TODO: Settings modal
    alert('Settings panel coming soon — boundaries, voice change, preferences');
  },

  // ===== Waveform Visualization =====
  initWaveform() {
    const canvas = document.getElementById('waveform-canvas');
    canvas.width = 400;
    canvas.height = 400;
    this.waveformCtx = canvas.getContext('2d');
    this.drawWaveformStatic();
  },

  drawWaveformStatic() {
    const ctx = this.waveformCtx;
    if (!ctx) return;
    
    const w = 400, h = 400;
    const cx = w / 2, cy = h / 2;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw static circle
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 67, 147, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    grad.addColorStop(0, 'rgba(232, 67, 147, 0.08)');
    grad.addColorStop(1, 'rgba(232, 67, 147, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  },

  animateWaveform: false,
  waveformPhase: 0,

  drawWaveform() {
    if (!this.animateWaveform) {
      this.drawWaveformStatic();
      return;
    }

    const ctx = this.waveformCtx;
    if (!ctx) return;
    
    const w = 400, h = 400;
    const cx = w / 2, cy = h / 2;
    const baseRadius = 80;

    ctx.clearRect(0, 0, w, h);

    this.waveformPhase += 0.03;

    // Draw multiple organic rings
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      const opacity = 0.3 - ring * 0.08;
      const radiusOffset = ring * 15;
      
      for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const noise = Math.sin(angle * 3 + this.waveformPhase + ring) * 8 +
                      Math.sin(angle * 5 - this.waveformPhase * 1.3) * 5 +
                      Math.sin(angle * 7 + this.waveformPhase * 0.7) * 3;
        const r = baseRadius + radiusOffset + noise;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      ctx.strokeStyle = `rgba(232, 67, 147, ${opacity})`;
      ctx.lineWidth = 2 - ring * 0.5;
      ctx.stroke();
    }

    // Inner glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
    grad.addColorStop(0, 'rgba(232, 67, 147, 0.12)');
    grad.addColorStop(1, 'rgba(232, 67, 147, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    requestAnimationFrame(() => this.drawWaveform());
  },

  // ===== Pillow Talk =====
  initPillowTalk() {
    const chat = document.getElementById('pillowtalk-chat');
    chat.innerHTML = '';

    const name = this.userPreferences.name || 'babe';

    const messages = [
      { text: `That was... really good, ${name}.`, delay: 1000 },
      { text: "How are you feeling?", delay: 2500 },
    ];

    messages.forEach(msg => {
      setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ai';
        bubble.textContent = msg.text;
        chat.appendChild(bubble);
        chat.scrollTop = chat.scrollHeight;
      }, msg.delay);
    });
  },

  sendPillowtalk() {
    const input = document.getElementById('pillowtalk-input');
    const value = input.value.trim();
    if (!value) return;

    const chat = document.getElementById('pillowtalk-chat');
    
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-bubble user';
    userMsg.textContent = value;
    chat.appendChild(userMsg);
    chat.scrollTop = chat.scrollHeight;
    input.value = '';

    // AI response
    setTimeout(() => {
      const typing = document.createElement('div');
      typing.className = 'chat-bubble ai';
      typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
      chat.appendChild(typing);
      chat.scrollTop = chat.scrollHeight;

      setTimeout(() => {
        const responses = [
          "I loved hearing your voice tonight.",
          "You know, I've been thinking about you all day.",
          "Tell me more. I want to know everything about your day.",
          "I could listen to you talk forever.",
          "You make me want to be better at this. For you.",
        ];
        typing.innerHTML = responses[Math.floor(Math.random() * responses.length)];
        chat.scrollTop = chat.scrollHeight;

        // After a few exchanges, offer boyfriend mode
        if (chat.querySelectorAll('.chat-bubble.user').length >= 2) {
          setTimeout(() => {
            const offer = document.createElement('div');
            offer.className = 'chat-bubble ai';
            offer.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
            chat.appendChild(offer);
            chat.scrollTop = chat.scrollHeight;

            setTimeout(() => {
              const name = app.userPreferences.name || 'babe';
              offer.innerHTML = `Hey ${name}... I'd really love to check on you tomorrow. Would that be okay?`;
              chat.scrollTop = chat.scrollHeight;
            }, 1500);
          }, 2000);
        }
      }, 1500);
    }, 800);
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // App is ready
  console.log('DEVIN app loaded');
});
