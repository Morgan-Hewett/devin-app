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
  boundaryPlaying: false,
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

    if (screenId === 'boundaries') {
      this.initBoundaryVoice();
    }
    if (screenId === 'session') {
      this.initSession();
    }
    if (screenId === 'pillowtalk') {
      this.initPillowTalk();
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

    setTimeout(() => {
      statusEl.innerHTML = `
        <div class="status-found">
          <span style="font-size: 18px">✓</span>
          <span>DEVIN connected</span>
        </div>
      `;
      
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
    
    document.querySelectorAll('.voice-card').forEach(card => card.classList.remove('selected'));
    document.getElementById(`voice-${voice.toLowerCase()}`).classList.add('selected');
    
    const btn = document.getElementById('btn-voice-continue');
    btn.disabled = false;
    document.getElementById('chosen-voice-name').textContent = voice;
  },

  previewVoice(voice) {
    const eqEl = document.getElementById(`eq-${voice.toLowerCase()}`);
    
    if (eqEl.classList.contains('playing')) {
      eqEl.classList.remove('playing');
      return;
    }
    
    document.querySelectorAll('.voice-eq').forEach(eq => eq.classList.remove('playing'));
    eqEl.classList.add('playing');
    
    setTimeout(() => {
      eqEl.classList.remove('playing');
    }, 4000);
  },

  // ===== Boundary Setting (Voice-First) =====
  boundaryConversation: [
    {
      ai: "Hey. I'm really glad you chose me.",
      delay: 800,
      duration: 2500,
    },
    {
      ai: "Before we get into anything, I want to make sure I get this right for you. So I'm going to ask you a few things. Nothing weird — I just want to know how to talk to you.",
      delay: 500,
      duration: 5000,
      quickReplies: ["Sounds good", "Okay, go ahead"],
    },
    {
      ai: "First things first — what should I call you?",
      delay: 500,
      duration: 2500,
      freeInput: true,
      inputPlaceholder: "Your name or a pet name...",
      handler: 'setName',
    },
    {
      ai: null, // Dynamic — set by nameResponse
      handler: 'nameResponse',
    },
    {
      ai: "Now, when things get heated — how do you feel about me being a little... rough with my words? Like calling you dirty names. Some people love it, some don't. No wrong answer.",
      delay: 500,
      duration: 6000,
      quickReplies: ["I'm into it", "Keep it off", "Depends on the moment"],
      handler: 'setLanguage',
    },
    {
      ai: "And my tone — do you want me to tell you what to do, or do you prefer when I invite you into things?",
      delay: 500,
      duration: 4500,
      quickReplies: ["Command me", "Invite me", "Mix of both"],
      handler: 'setTone',
    },
    {
      ai: "Are you okay with me talking about your body? Telling you how you look, what I want to do to you?",
      delay: 500,
      duration: 4000,
      quickReplies: ["Yes", "No, skip that"],
      handler: 'setBodyTalk',
    },
    {
      ai: "Last thing. Are there any scenarios that are completely off limits for you? Things I should never bring up?",
      delay: 500,
      duration: 4500,
      quickReplies: ["No limits", "Let me tell you"],
      handler: 'setLimits',
    },
    {
      ai: "Got it. I'll remember everything. And if anything ever feels wrong — just tell me to stop. I will. Always.",
      delay: 500,
      duration: 4500,
    },
    {
      ai: "Now... are you ready to pick a fantasy?",
      delay: 1000,
      duration: 2500,
      quickReplies: ["Yes", "Show me what you've got"],
      handler: 'goToScenarios',
    },
  ],

  initBoundaryVoice() {
    this.boundaryStep = 0;
    
    const transcript = document.getElementById('boundary-transcript');
    const repliesEl = document.getElementById('boundary-replies');
    const inputArea = document.getElementById('boundary-free-input');
    
    transcript.innerHTML = '';
    repliesEl.innerHTML = '';
    inputArea.style.display = 'none';
    
    // Set voice name
    document.getElementById('boundary-voice-name').textContent = this.selectedVoice || 'Rex';
    
    // Start waveform
    this.boundaryWaveformActive = true;
    this.initBoundaryWaveform();
    
    // Start the conversation after a beat
    setTimeout(() => this.advanceBoundaryVoice(), 800);
  },

  advanceBoundaryVoice() {
    if (this.boundaryStep >= this.boundaryConversation.length) return;

    const step = this.boundaryConversation[this.boundaryStep];
    const transcript = document.getElementById('boundary-transcript');
    const repliesEl = document.getElementById('boundary-replies');
    const inputArea = document.getElementById('boundary-free-input');
    const statusEl = document.getElementById('boundary-status');
    const waveform = document.getElementById('boundary-waveform-canvas');

    // Hide inputs while he's speaking
    repliesEl.innerHTML = '';
    inputArea.style.display = 'none';

    if (step.ai) {
      // He's speaking
      statusEl.textContent = `${this.selectedVoice || 'Rex'} is speaking...`;
      waveform.classList.add('speaking');
      this.boundaryPlaying = true;

      // Add to transcript with fade-in
      const line = document.createElement('div');
      line.className = 'voice-transcript-line ai appearing';
      line.textContent = step.ai;
      transcript.appendChild(line);
      transcript.scrollTop = transcript.scrollHeight;

      // After "speaking" duration, show responses
      const duration = step.duration || 3000;
      setTimeout(() => {
        waveform.classList.remove('speaking');
        this.boundaryPlaying = false;
        line.classList.remove('appearing');

        if (step.quickReplies) {
          statusEl.textContent = 'Your turn...';
          repliesEl.innerHTML = step.quickReplies.map(r =>
            `<button class="quick-reply-btn" onclick="app.handleBoundaryVoiceReply('${r.replace(/'/g, "\\'")}')">${r}</button>`
          ).join('');
        } else if (step.freeInput) {
          statusEl.textContent = 'Your turn...';
          inputArea.style.display = 'flex';
          const input = document.getElementById('boundary-voice-input');
          input.placeholder = step.inputPlaceholder || 'Type your answer...';
          input.value = '';
          input.focus();
        } else {
          // Auto-advance
          statusEl.textContent = '';
          this.boundaryStep++;
          setTimeout(() => this.advanceBoundaryVoice(), step.delay || 1000);
        }
      }, duration);
    } else if (step.handler) {
      this[step.handler]();
    }
  },

  handleBoundaryVoiceReply(reply) {
    const transcript = document.getElementById('boundary-transcript');
    const repliesEl = document.getElementById('boundary-replies');
    const statusEl = document.getElementById('boundary-status');

    // Add user reply to transcript
    const line = document.createElement('div');
    line.className = 'voice-transcript-line user';
    line.textContent = reply;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;

    repliesEl.innerHTML = '';
    statusEl.textContent = '';

    const step = this.boundaryConversation[this.boundaryStep];

    if (step.handler === 'setLanguage') {
      this.userPreferences.languageBoundaries.degrading = reply;
    } else if (step.handler === 'setTone') {
      this.userPreferences.languageBoundaries.tone = reply;
    } else if (step.handler === 'setBodyTalk') {
      this.userPreferences.bodyBoundaries.talk = reply === 'Yes';
    } else if (step.handler === 'setLimits') {
      this.userPreferences.scenarioBoundaries.limits = reply;
    } else if (step.handler === 'goToScenarios') {
      setTimeout(() => this.goTo('scenarios'), 600);
      return;
    }

    this.boundaryStep++;
    setTimeout(() => this.advanceBoundaryVoice(), 800);
  },

  sendBoundaryVoiceInput() {
    const input = document.getElementById('boundary-voice-input');
    const value = input.value.trim();
    if (!value) return;

    const transcript = document.getElementById('boundary-transcript');
    const inputArea = document.getElementById('boundary-free-input');

    const line = document.createElement('div');
    line.className = 'voice-transcript-line user';
    line.textContent = value;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;

    inputArea.style.display = 'none';
    input.value = '';

    const step = this.boundaryConversation[this.boundaryStep];
    if (step.handler === 'setName') {
      this.userPreferences.name = value;
    }

    this.boundaryStep++;
    setTimeout(() => this.advanceBoundaryVoice(), 600);
  },

  nameResponse() {
    const name = this.userPreferences.name || 'beautiful';
    const transcript = document.getElementById('boundary-transcript');
    const statusEl = document.getElementById('boundary-status');
    const waveform = document.getElementById('boundary-waveform-canvas');

    statusEl.textContent = `${this.selectedVoice || 'Rex'} is speaking...`;
    waveform.classList.add('speaking');

    const responseText = `${name}. I like that. Nice to meet you properly.`;
    
    const line = document.createElement('div');
    line.className = 'voice-transcript-line ai appearing';
    line.textContent = responseText;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;

    setTimeout(() => {
      waveform.classList.remove('speaking');
      line.classList.remove('appearing');
      statusEl.textContent = '';
      this.boundaryStep++;
      setTimeout(() => this.advanceBoundaryVoice(), 800);
    }, 2500);
  },

  // Boundary waveform
  boundaryWaveformActive: false,
  boundaryWaveformPhase: 0,

  initBoundaryWaveform() {
    const canvas = document.getElementById('boundary-waveform-canvas');
    if (!canvas) return;
    canvas.width = 300;
    canvas.height = 300;
    this.boundaryWaveformCtx = canvas.getContext('2d');
    this.drawBoundaryWaveform();
  },

  drawBoundaryWaveform() {
    if (!this.boundaryWaveformActive) return;

    const ctx = this.boundaryWaveformCtx;
    if (!ctx) return;

    const canvas = document.getElementById('boundary-waveform-canvas');
    const isSpeaking = canvas && canvas.classList.contains('speaking');
    const w = 300, h = 300;
    const cx = w / 2, cy = h / 2;
    const baseRadius = 60;

    ctx.clearRect(0, 0, w, h);
    this.boundaryWaveformPhase += isSpeaking ? 0.05 : 0.015;

    const amplitude = isSpeaking ? 1 : 0.3;

    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      const opacity = (0.4 - ring * 0.1) * (isSpeaking ? 1 : 0.5);
      const radiusOffset = ring * 12;

      for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const noise = (Math.sin(angle * 3 + this.boundaryWaveformPhase + ring) * 8 +
                       Math.sin(angle * 5 - this.boundaryWaveformPhase * 1.3) * 6 +
                       Math.sin(angle * 7 + this.boundaryWaveformPhase * 0.7) * 4) * amplitude;
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
    const glowOpacity = isSpeaking ? 0.15 : 0.06;
    grad.addColorStop(0, `rgba(232, 67, 147, ${glowOpacity})`);
    grad.addColorStop(1, 'rgba(232, 67, 147, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    requestAnimationFrame(() => this.drawBoundaryWaveform());
  },

  // ===== Scenario Selection =====
  selectScenario(el, scenario) {
    this.selectedScenario = scenario;
    document.querySelectorAll('.scenario-card').forEach(card => card.classList.remove('selected'));
    el.classList.add('selected');

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

    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.updateTimer();
    }, 1000);

    this.animateWaveform = true;
    this.drawWaveform();

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      document.getElementById('session-status').textContent = 'Listening...';
    } catch (err) {
      document.getElementById('session-status').textContent = 'Mic access needed for voice interaction';
    }

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
        document.getElementById('session-status').textContent = 'Voice connection unavailable — deploy server version for live voice';
      };

      this.ws.onclose = () => {
        if (this.sessionActive) {
          document.getElementById('session-status').textContent = 'Connection ended';
        }
      };
    } catch (err) {
      document.getElementById('session-status').textContent = 'Voice demo mode — deploy server for live voice';
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

    setTimeout(() => {
      this.goTo('pillowtalk');
    }, 1500);
  },

  handleSessionMessage(data) {
    const transcript = document.getElementById('session-transcript');
    
    if (data.type === 'response.audio_transcript.delta') {
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
    const w = 400, h = 400, cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 67, 147, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
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
    const w = 400, h = 400, cx = w / 2, cy = h / 2, baseRadius = 80;
    ctx.clearRect(0, 0, w, h);
    this.waveformPhase += 0.03;

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

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
    grad.addColorStop(0, 'rgba(232, 67, 147, 0.12)');
    grad.addColorStop(1, 'rgba(232, 67, 147, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    requestAnimationFrame(() => this.drawWaveform());
  },

  // ===== Pillow Talk (Voice-First) =====
  initPillowTalk() {
    const transcript = document.getElementById('pillowtalk-transcript');
    const repliesEl = document.getElementById('pillowtalk-replies');
    transcript.innerHTML = '';
    repliesEl.innerHTML = '';

    // Set voice name
    document.getElementById('pillowtalk-voice-name').textContent = this.selectedVoice || 'Rex';

    // Init waveform
    this.pillowWaveformActive = true;
    this.initPillowWaveform();

    const name = this.userPreferences.name || 'babe';

    const messages = [
      { text: `That was... really good, ${name}.`, delay: 1000, duration: 2500 },
      { text: "How are you feeling?", delay: 500, duration: 1500 },
    ];

    let totalDelay = 0;
    const waveform = document.getElementById('pillowtalk-waveform-canvas');
    const statusEl = document.getElementById('pillowtalk-status');

    messages.forEach((msg, i) => {
      totalDelay += msg.delay;
      
      setTimeout(() => {
        statusEl.textContent = `${this.selectedVoice || 'Rex'} is speaking...`;
        waveform.classList.add('speaking');

        const line = document.createElement('div');
        line.className = 'voice-transcript-line ai appearing';
        line.textContent = msg.text;
        transcript.appendChild(line);
        transcript.scrollTop = transcript.scrollHeight;

        setTimeout(() => {
          waveform.classList.remove('speaking');
          line.classList.remove('appearing');
          
          if (i === messages.length - 1) {
            statusEl.textContent = 'Your turn...';
            repliesEl.innerHTML = `
              <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('Amazing')">Amazing</button>
              <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('So good')">So good</button>
              <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('I needed that')">I needed that</button>
            `;
          }
        }, msg.duration);
      }, totalDelay);

      totalDelay += msg.duration;
    });
  },

  pillowtalkExchanges: 0,

  handlePillowtalkReply(reply) {
    const transcript = document.getElementById('pillowtalk-transcript');
    const repliesEl = document.getElementById('pillowtalk-replies');
    const statusEl = document.getElementById('pillowtalk-status');
    const waveform = document.getElementById('pillowtalk-waveform-canvas');

    // User reply
    const userLine = document.createElement('div');
    userLine.className = 'voice-transcript-line user';
    userLine.textContent = reply;
    transcript.appendChild(userLine);
    transcript.scrollTop = transcript.scrollHeight;
    repliesEl.innerHTML = '';
    
    this.pillowtalkExchanges++;

    // AI response
    setTimeout(() => {
      statusEl.textContent = `${this.selectedVoice || 'Rex'} is speaking...`;
      waveform.classList.add('speaking');

      let responses;
      const name = this.userPreferences.name || 'babe';
      
      if (this.pillowtalkExchanges >= 2) {
        // Boyfriend mode offer
        responses = [`Hey ${name}... I'd really love to check on you tomorrow. Would that be okay?`];
      } else {
        responses = [
          "I loved hearing your voice tonight.",
          "You know, I've been thinking about you all day.",
          "Tell me more. I want to know everything about your day.",
          "I could listen to you talk forever.",
        ];
      }

      const responseText = responses[Math.floor(Math.random() * responses.length)];
      
      const line = document.createElement('div');
      line.className = 'voice-transcript-line ai appearing';
      line.textContent = responseText;
      transcript.appendChild(line);
      transcript.scrollTop = transcript.scrollHeight;

      setTimeout(() => {
        waveform.classList.remove('speaking');
        line.classList.remove('appearing');

        if (this.pillowtalkExchanges >= 2) {
          statusEl.textContent = '';
          repliesEl.innerHTML = `
            <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('I\\'d like that')">I'd like that</button>
            <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('Not yet')">Not yet</button>
          `;
        } else {
          statusEl.textContent = 'Your turn...';
          repliesEl.innerHTML = `
            <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('Tell me more')">Tell me more</button>
            <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('That was incredible')">That was incredible</button>
            <button class="quick-reply-btn" onclick="app.handlePillowtalkReply('I feel so relaxed')">I feel so relaxed</button>
          `;
        }
      }, 3000);
    }, 800);
  },

  // Pillow talk waveform
  pillowWaveformActive: false,
  pillowWaveformPhase: 0,

  initPillowWaveform() {
    const canvas = document.getElementById('pillowtalk-waveform-canvas');
    if (!canvas) return;
    canvas.width = 300;
    canvas.height = 300;
    this.pillowWaveformCtx = canvas.getContext('2d');
    this.drawPillowWaveform();
  },

  drawPillowWaveform() {
    if (!this.pillowWaveformActive) return;

    const ctx = this.pillowWaveformCtx;
    if (!ctx) return;

    const canvas = document.getElementById('pillowtalk-waveform-canvas');
    const isSpeaking = canvas && canvas.classList.contains('speaking');
    const w = 300, h = 300, cx = w / 2, cy = h / 2, baseRadius = 60;

    ctx.clearRect(0, 0, w, h);
    this.pillowWaveformPhase += isSpeaking ? 0.04 : 0.01;

    const amplitude = isSpeaking ? 1 : 0.2;

    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      const opacity = (0.35 - ring * 0.1) * (isSpeaking ? 1 : 0.5);
      const radiusOffset = ring * 12;
      for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const noise = (Math.sin(angle * 3 + this.pillowWaveformPhase + ring) * 7 +
                       Math.sin(angle * 5 - this.pillowWaveformPhase * 1.2) * 5 +
                       Math.sin(angle * 7 + this.pillowWaveformPhase * 0.6) * 3) * amplitude;
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

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius);
    const glowOpacity = isSpeaking ? 0.12 : 0.04;
    grad.addColorStop(0, `rgba(232, 67, 147, ${glowOpacity})`);
    grad.addColorStop(1, 'rgba(232, 67, 147, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    requestAnimationFrame(() => this.drawPillowWaveform());
  },

  sendPillowtalkInput() {
    const input = document.getElementById('pillowtalk-voice-input');
    const value = input.value.trim();
    if (!value) return;
    this.handlePillowtalkReply(value);
    input.value = '';
  },
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DEVIN app loaded');
});