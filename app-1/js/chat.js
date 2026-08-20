// ==========================================================================
// PLANNINGEASY - CHAT ENGINE (ENHANCED)
// STRICT RULE: Group Chat & Admin ↔ Member DM ONLY.
// Features: Long-press Delete, Video Sending/Receiving, Voice Message Recording,
// Full-Screen Media Viewer, Quote Reply, Reactions (👍, ❤️), Unread Badge.
// ==========================================================================

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { Navigation } from './navigation.js';

export const Chat = {
  activeChannel: 'group', // 'group' or 'dm_{memberUid}'
  replyingToMessage: null,
  selectedMedia: null, // { name, dataUrl, type: 'image' | 'audio' | 'video' }
  
  // Voice Recording State
  mediaRecorder: null,
  audioChunks: [],
  recordingStartTime: null,
  recordingInterval: null,
  isRecordingVoice: false,
  currentlyPlayingAudio: null, // HTMLAudioElement

  render(container) {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const allUsers = Storage.getAll('users').filter((u) => u.status !== 'disabled');
    const allMessages = Storage.getAll('messages');

    // Update Chat Read Timestamp for unread badge calculation
    localStorage.setItem(`pe_chat_read_${user.uid}`, Date.now().toString());
    Navigation.updateBottomNavUI();

    // Determine available Direct Message targets
    let directTargets = [];
    if (Auth.isAdmin()) {
      // Admin can DM any non-admin member
      directTargets = allUsers.filter((u) => u.uid !== user.uid && u.role === 'member');
    } else {
      // Member can ONLY DM the Admin! (STRICT RULE)
      directTargets = allUsers.filter((u) => u.role === 'admin');
    }

    // Default to active channel if valid
    if (this.activeChannel !== 'group') {
      const targetUid = this.activeChannel.replace('dm_', '');
      const valid = directTargets.find((u) => u.uid === targetUid);
      if (!valid && directTargets.length > 0) {
        this.activeChannel = `dm_${directTargets[0].uid}`;
      } else if (!valid) {
        this.activeChannel = 'group';
      }
    }

    // Filter messages for active channel
    let channelMessages = [];
    if (this.activeChannel === 'group') {
      channelMessages = allMessages.filter((m) => m.conversationId === 'group');
    } else {
      const targetMemberUid = Auth.isAdmin() ? this.activeChannel.replace('dm_', '') : user.uid;
      const targetConvId = `dm_${targetMemberUid}`;
      channelMessages = allMessages.filter((m) => m.conversationId === targetConvId);
    }

    // Sort ascending for chronological chat flow
    channelMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Get Active Recipient Title & Presence
    let activeChannelTitle = '📢 Group Announcement & Chat';
    let isTargetOnline = false;
    let targetPosition = '';
    if (this.activeChannel !== 'group') {
      const targetUid = this.activeChannel.replace('dm_', '');
      const targetUser = allUsers.find((u) => u.uid === targetUid);
      if (targetUser) {
        activeChannelTitle = `💬 ${targetUser.name}`;
        isTargetOnline = targetUser.isOnline;
        targetPosition = targetUser.position || targetUser.role;
      }
    }

    container.innerHTML = `
      <div class="chat-view">
        <!-- Chat Channel Selector Tabs -->
        <div class="card" style="padding: 6px; margin-bottom: 10px;">
          <div class="chip-group" style="margin-bottom: 0;">
            <button class="chip ${this.activeChannel === 'group' ? 'active' : ''}" data-chat-channel="group">
              📢 Group Chat
            </button>
            ${directTargets.map((target) => `
              <button class="chip ${this.activeChannel === `dm_${target.uid}` ? 'active' : ''}" data-chat-channel="dm_${target.uid}">
                <span class="presence-dot ${target.isOnline ? 'online' : ''}" style="display: inline-block; margin-right: 4px;"></span>
                ${Auth.isAdmin() ? target.name : 'Admin Chat'}
                ${target.position ? `<span style="font-size: 10px; opacity: 0.8;">(${target.position})</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Chat Main Container -->
        <div class="chat-container">
          <!-- Chat Channel Header Banner -->
          <div style="padding: 10px 14px; background: #ffffff; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
            <div style="font-weight: 700; font-size: 13.5px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              ${this.activeChannel !== 'group' ? `<span class="presence-dot ${isTargetOnline ? 'online' : ''}"></span>` : ''}
              <span>${activeChannelTitle}</span>
              ${targetPosition ? `<span class="badge" style="background: var(--primary-50); color: var(--primary); font-size: 10px;">${targetPosition}</span>` : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-muted);">
              ${this.activeChannel === 'group' ? `${allUsers.length} members` : (isTargetOnline ? 'Online' : 'Offline')}
            </div>
          </div>

          <!-- Messages Stream Area -->
          <div class="chat-messages" id="chatMessagesArea">
            ${channelMessages.length === 0 ? `
              <div class="empty-state" style="margin: auto;">
                <div class="empty-state-icon">💬</div>
                <div class="empty-state-title">No messages yet</div>
                <div class="empty-state-text">Start the conversation by sending a text, photo, video, or voice message below.</div>
              </div>
            ` : `
              ${channelMessages.map((msg) => {
                const isMine = msg.senderUid === user.uid;
                const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const senderUser = allUsers.find(u => u.uid === msg.senderUid);
                const senderPhoto = msg.senderPhotoUrl || senderUser?.photoUrl;
                const senderPos = msg.senderPosition || senderUser?.position;

                // Reactions count
                const reactions = msg.reactions || {};
                const thumbsUpCount = (reactions['👍'] || []).length;
                const heartCount = (reactions['❤️'] || []).length;

                return `
                  <div class="chat-msg-row ${isMine ? 'outgoing' : 'incoming'}">
                    ${!isMine ? `
                      <div class="chat-msg-avatar">
                        ${senderPhoto ? `<img src="${senderPhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" alt="Avatar">` : (msg.senderName || 'U').charAt(0).toUpperCase()}
                      </div>
                    ` : ''}

                    <div class="chat-bubble ${isMine ? 'outgoing' : 'incoming'}" id="msg-${msg.id}" data-msg-id="${msg.id}" data-sender-uid="${msg.senderUid}">
                      ${!isMine ? `
                        <div class="chat-sender">
                          ${msg.senderName}
                          ${senderPos ? `<span class="chat-position-tag">${senderPos}</span>` : ''}
                        </div>
                      ` : ''}

                      <!-- Quoted Reply (if any) -->
                      ${msg.replyTo ? `
                        <div class="chat-reply-preview" data-goto-msg="${msg.replyTo.id}">
                          <b>${msg.replyTo.senderName}:</b> ${msg.replyTo.text || 'Media attachment'}
                        </div>
                      ` : ''}

                      <!-- Text message -->
                      ${msg.text ? `<div>${msg.text}</div>` : ''}

                      <!-- Voice Note / Audio Player -->
                      ${msg.mediaUrl && (msg.mediaType === 'audio' || msg.isVoiceMessage) ? `
                        <div class="voice-msg-player" data-audio-src="${msg.mediaUrl}">
                          <button class="voice-play-btn" data-action="play">▶</button>
                          <div class="voice-progress-container">
                            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; font-weight: 600;">
                              <span>🎙️ Voice Note</span>
                              <span class="voice-time-text">0:00</span>
                            </div>
                            <div class="voice-waveform-bar">
                              <div class="voice-waveform-fill"></div>
                            </div>
                          </div>
                        </div>
                      ` : ''}

                      <!-- Image Attachment -->
                      ${msg.mediaUrl && msg.mediaType === 'image' ? `
                        <div class="chat-media-wrapper mt-1">
                          <img src="${msg.mediaUrl}" class="chat-media-img open-fullscreen-media" data-media-type="image" data-media-url="${msg.mediaUrl}" alt="Attachment">
                        </div>
                      ` : ''}

                      <!-- Video Attachment -->
                      ${msg.mediaUrl && msg.mediaType === 'video' ? `
                        <div class="chat-media-wrapper mt-1" style="position: relative;">
                          <video src="${msg.mediaUrl}" class="chat-media-video open-fullscreen-media" data-media-type="video" data-media-url="${msg.mediaUrl}" controls playsinline preload="metadata"></video>
                        </div>
                      ` : ''}

                      <!-- Time & Quick Actions -->
                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px;">
                        <span class="chat-time">${timeStr}</span>
                        <button class="btn-ghost msg-reply-action" data-msg-id="${msg.id}" title="Reply to message" style="padding: 0; font-size: 11px; color: inherit; opacity: 0.7;">
                          ↩
                        </button>
                        <button class="btn-ghost msg-react-action" data-msg-id="${msg.id}" data-emoji="👍" style="padding: 0; font-size: 11px; opacity: 0.7;">
                          👍
                        </button>
                        <button class="btn-ghost msg-react-action" data-msg-id="${msg.id}" data-emoji="❤️" style="padding: 0; font-size: 11px; opacity: 0.7;">
                          ❤️
                        </button>
                      </div>

                      <!-- Reactions Display Badge -->
                      ${(thumbsUpCount > 0 || heartCount > 0) ? `
                        <div class="chat-reactions-badge">
                          ${thumbsUpCount > 0 ? `<span>👍 ${thumbsUpCount}</span>` : ''}
                          ${heartCount > 0 ? `<span>❤️ ${heartCount}</span>` : ''}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            `}
          </div>

          <!-- Bottom Message Input Bar -->
          <div class="chat-input-bar">
            <!-- Replying Banner (if active) -->
            ${this.replyingToMessage ? `
              <div class="replying-banner">
                <div>
                  Replying to <b>${this.replyingToMessage.senderName}</b>: <i>${(this.replyingToMessage.text || 'Media').substring(0, 35)}...</i>
                </div>
                <button class="btn btn-ghost btn-sm" id="cancelReplyBtn" style="padding: 2px 6px; font-size: 11px;">✕</button>
              </div>
            ` : ''}

            <!-- Selected Media Preview Banner (if attached) -->
            ${this.selectedMedia ? `
              <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); padding: 6px 10px; border-radius: 8px; font-size: 11px;">
                <span>📎 Ready to send: <b>${this.selectedMedia.type.toUpperCase()}</b> (${this.selectedMedia.name})</span>
                <button class="btn btn-ghost btn-sm" id="removeMediaAttachmentBtn" style="padding: 2px 6px; color: var(--danger);">✕</button>
              </div>
            ` : ''}

            <!-- Live Voice Recording UI (When Active) -->
            <div id="voiceRecordingContainer" style="display: ${this.isRecordingVoice ? 'flex' : 'none'};" class="voice-recording-bar">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="recording-pulse-dot"></div>
                <span class="recording-timer" id="voiceRecordingTimer">00:00</span>
                <span style="font-size: 12px; color: #991b1b; font-weight: 600;">Recording Voice...</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button class="btn btn-ghost btn-sm" id="cancelVoiceRecordBtn" style="color: var(--danger); font-size: 12px;">✕ Cancel</button>
                <button class="btn btn-primary btn-sm btn-icon-only" id="sendVoiceRecordBtn" style="width: 32px; height: 32px; min-height: 32px; background: var(--danger);">➤</button>
              </div>
            </div>

            <!-- Standard Input Row -->
            <div class="chat-input-row" id="standardInputRow" style="display: ${this.isRecordingVoice ? 'none' : 'flex'};">
              <!-- Media File Input Trigger -->
              <input type="file" id="chatFileInput" accept="image/*,video/*,audio/*" style="display: none;">
              <button class="chat-action-btn" id="attachMediaBtn" title="Attach Image or Video">
                📷
              </button>

              <!-- Voice Recording Button -->
              <button class="chat-action-btn" id="startVoiceRecordBtn" title="Record Voice Message" style="color: var(--primary);">
                🎙️
              </button>

              <input type="text" id="chatMessageTextInput" placeholder="Type a message..." autocomplete="off">

              <button class="btn btn-primary btn-sm btn-icon-only" id="sendMessageBtn" title="Send">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Scroll chat to bottom
    const msgArea = container.querySelector('#chatMessagesArea');
    if (msgArea) {
      msgArea.scrollTop = msgArea.scrollHeight;
    }

    // Attach Event Handlers
    this.attachEventListeners(container, user);
  },

  attachEventListeners(container, user) {
    // Channel Switch
    container.querySelectorAll('[data-chat-channel]').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.activeChannel = chip.getAttribute('data-chat-channel');
        this.replyingToMessage = null;
        this.selectedMedia = null;
        this.render(container);
      });
    });

    // Send Message Button
    const sendBtn = container.querySelector('#sendMessageBtn');
    const textInput = container.querySelector('#chatMessageTextInput');

    const handleSend = () => {
      const text = textInput.value.trim();
      if (!text && !this.selectedMedia) return;

      const convId = this.activeChannel === 'group'
        ? 'group'
        : (Auth.isAdmin() ? `dm_${this.activeChannel.replace('dm_', '')}` : `dm_${user.uid}`);

      const recipientUids = this.activeChannel === 'group'
        ? ['all']
        : (Auth.isAdmin() ? [this.activeChannel.replace('dm_', '')] : Storage.getAll('users').filter(u => u.role === 'admin').map(u => u.uid));

      const newMsg = {
        conversationId: convId,
        senderUid: user.uid,
        senderName: user.name,
        senderRole: user.role,
        senderPosition: user.position || (user.role === 'admin' ? 'Admin' : 'Member'),
        senderPhotoUrl: user.photoUrl || null,
        text: text,
        replyTo: this.replyingToMessage ? {
          id: this.replyingToMessage.id,
          senderName: this.replyingToMessage.senderName,
          text: this.replyingToMessage.text
        } : null,
        mediaUrl: this.selectedMedia ? this.selectedMedia.dataUrl : null,
        mediaType: this.selectedMedia ? this.selectedMedia.type : null,
        isVoiceMessage: this.selectedMedia?.type === 'audio',
        reactions: {},
        createdAt: new Date().toISOString()
      };

      Storage.add('messages', newMsg);

      // Create notification for recipients
      Storage.createNotification({
        type: 'chat',
        title: this.activeChannel === 'group' ? 'New Group Message' : `New Message from ${user.name}`,
        message: text || `Sent an attachment (${newMsg.mediaType || 'media'})`,
        recipientUids,
        targetTab: 'chat',
        targetId: newMsg.id
      });

      this.replyingToMessage = null;
      this.selectedMedia = null;
      this.render(container);
    };

    sendBtn?.addEventListener('click', handleSend);
    textInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    // File Attachment
    const fileInput = container.querySelector('#chatFileInput');
    container.querySelector('#attachMediaBtn')?.addEventListener('click', () => fileInput.click());

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      let type = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        this.selectedMedia = {
          name: file.name,
          type: type,
          dataUrl: loadEvt.target.result
        };
        this.render(container);
      };
      reader.readAsDataURL(file);
    });

    container.querySelector('#removeMediaAttachmentBtn')?.addEventListener('click', () => {
      this.selectedMedia = null;
      this.render(container);
    });

    // Voice Recording Events
    container.querySelector('#startVoiceRecordBtn')?.addEventListener('click', () => this.startVoiceRecording(container));
    container.querySelector('#cancelVoiceRecordBtn')?.addEventListener('click', () => this.cancelVoiceRecording(container));
    container.querySelector('#sendVoiceRecordBtn')?.addEventListener('click', () => this.stopAndSendVoiceRecording(container, user));

    // Audio Playback in Chat
    container.querySelectorAll('.voice-msg-player').forEach((playerEl) => {
      const audioSrc = playerEl.getAttribute('data-audio-src');
      const playBtn = playerEl.querySelector('.voice-play-btn');
      const fillBar = playerEl.querySelector('.voice-waveform-fill');
      const timeText = playerEl.querySelector('.voice-time-text');

      let audio = new Audio(audioSrc);

      audio.addEventListener('loadedmetadata', () => {
        const dur = Math.round(audio.duration || 0);
        const mins = Math.floor(dur / 60);
        const secs = dur % 60;
        timeText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          fillBar.style.width = `${pct}%`;
          const cur = Math.round(audio.currentTime);
          const mins = Math.floor(cur / 60);
          const secs = cur % 60;
          timeText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      });

      audio.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        fillBar.style.width = '0%';
      });

      playBtn.addEventListener('click', () => {
        if (audio.paused) {
          if (this.currentlyPlayingAudio && this.currentlyPlayingAudio !== audio) {
            this.currentlyPlayingAudio.pause();
          }
          this.currentlyPlayingAudio = audio;
          audio.play();
          playBtn.textContent = '⏸';
        } else {
          audio.pause();
          playBtn.textContent = '▶';
        }
      });
    });

    // Fullscreen Media Viewer
    container.querySelectorAll('.open-fullscreen-media').forEach((mediaEl) => {
      mediaEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = mediaEl.getAttribute('data-media-type');
        const url = mediaEl.getAttribute('data-media-url');
        this.openFullscreenViewer(type, url);
      });
    });

    // Long-Press Message Deletion & Context Menu
    this.setupLongPressHandlers(container, user);

    // Reply & Reaction Actions
    container.querySelectorAll('.msg-reply-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-msg-id');
        const target = Storage.getById('messages', id);
        if (target) {
          this.replyingToMessage = target;
          this.render(container);
          container.querySelector('#chatMessageTextInput')?.focus();
        }
      });
    });

    container.querySelector('#cancelReplyBtn')?.addEventListener('click', () => {
      this.replyingToMessage = null;
      this.render(container);
    });

    container.querySelectorAll('.msg-react-action').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-msg-id');
        const emoji = btn.getAttribute('data-emoji');
        this.toggleReaction(id, emoji, user.uid);
      });
    });

    // Scroll to quoted reply
    container.querySelectorAll('[data-goto-msg]').forEach((el) => {
      el.addEventListener('click', () => {
        const targetId = el.getAttribute('data-goto-msg');
        const targetEl = container.querySelector(`#msg-${targetId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.style.backgroundColor = '#fef08a';
          setTimeout(() => { targetEl.style.backgroundColor = ''; }, 1200);
        }
      });
    });
  },

  // --- Voice Message Recording Implementation ---
  async startVoiceRecording(container) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Audio recording is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecordingVoice = true;
      this.recordingStartTime = Date.now();

      const voiceContainer = container.querySelector('#voiceRecordingContainer');
      const standardInput = container.querySelector('#standardInputRow');
      const timerEl = container.querySelector('#voiceRecordingTimer');

      if (voiceContainer && standardInput) {
        voiceContainer.style.display = 'flex';
        standardInput.style.display = 'none';
      }

      this.recordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        if (timerEl) {
          timerEl.textContent = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      }, 500);

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(40);
    } catch (err) {
      alert('Microphone access was denied or unavailable. Please enable microphone permissions in your browser settings.');
    }
  },

  cancelVoiceRecording(container) {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    clearInterval(this.recordingInterval);
    this.isRecordingVoice = false;
    this.audioChunks = [];
    this.render(container);
  },

  stopAndSendVoiceRecording(container, user) {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;

    this.mediaRecorder.onstop = () => {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const convId = this.activeChannel === 'group'
          ? 'group'
          : (Auth.isAdmin() ? `dm_${this.activeChannel.replace('dm_', '')}` : `dm_${user.uid}`);

        const recipientUids = this.activeChannel === 'group'
          ? ['all']
          : (Auth.isAdmin() ? [this.activeChannel.replace('dm_', '')] : Storage.getAll('users').filter(u => u.role === 'admin').map(u => u.uid));

        const newMsg = {
          conversationId: convId,
          senderUid: user.uid,
          senderName: user.name,
          senderRole: user.role,
          senderPosition: user.position || (user.role === 'admin' ? 'Admin' : 'Member'),
          senderPhotoUrl: user.photoUrl || null,
          text: '',
          replyTo: this.replyingToMessage ? {
            id: this.replyingToMessage.id,
            senderName: this.replyingToMessage.senderName,
            text: this.replyingToMessage.text
          } : null,
          mediaUrl: dataUrl,
          mediaType: 'audio',
          isVoiceMessage: true,
          reactions: {},
          createdAt: new Date().toISOString()
        };

        Storage.add('messages', newMsg);

        Storage.createNotification({
          type: 'chat',
          title: this.activeChannel === 'group' ? 'New Voice Note in Group' : `Voice Note from ${user.name}`,
          message: '🎙️ Sent a voice note',
          recipientUids,
          targetTab: 'chat',
          targetId: newMsg.id
        });

        this.replyingToMessage = null;
        this.render(container);
      };
      reader.readAsDataURL(audioBlob);
    };

    this.mediaRecorder.stop();
    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    clearInterval(this.recordingInterval);
    this.isRecordingVoice = false;
  },

  // --- Long Press Message Deletion Setup ---
  setupLongPressHandlers(container, user) {
    container.querySelectorAll('.chat-bubble').forEach((bubble) => {
      let pressTimer = null;
      let isLongPressed = false;

      const msgId = bubble.getAttribute('data-msg-id');
      const senderUid = bubble.getAttribute('data-sender-uid');

      const startPress = (e) => {
        isLongPressed = false;
        pressTimer = setTimeout(() => {
          isLongPressed = true;
          if (navigator.vibrate) navigator.vibrate(50);
          this.openMessageContextMenu(msgId, senderUid, user);
        }, 500); // 500ms for mobile long press
      };

      const cancelPress = () => {
        clearTimeout(pressTimer);
      };

      bubble.addEventListener('touchstart', startPress, { passive: true });
      bubble.addEventListener('touchend', cancelPress);
      bubble.addEventListener('touchmove', cancelPress);

      bubble.addEventListener('mousedown', startPress);
      bubble.addEventListener('mouseup', cancelPress);
      bubble.addEventListener('mouseleave', cancelPress);
    });
  },

  openMessageContextMenu(msgId, senderUid, currentUser) {
    const msg = Storage.getById('messages', msgId);
    if (!msg) return;

    // Check Permissions:
    // Can delete if: currentUser is sender OR currentUser is Admin
    const canDelete = currentUser.uid === senderUid || currentUser.role === 'admin';

    const overlay = document.createElement('div');
    overlay.className = 'msg-context-overlay';

    overlay.innerHTML = `
      <div class="msg-context-menu">
        <div style="font-size: 12px; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
          Message Options &bull; ${(msg.senderName || 'Sender')}
        </div>

        <button class="msg-context-item" id="ctxReplyBtn">
          ↩ Reply to Message
        </button>

        ${canDelete ? `
          <button class="msg-context-item danger" id="ctxDeleteBtn">
            🗑️ Delete Message
          </button>
        ` : `
          <div style="font-size: 11px; color: var(--text-subtle); padding: 6px 12px;">
            Only the sender or Admin can delete this message.
          </div>
        `}

        <button class="msg-context-item" id="ctxCloseBtn" style="justify-content: center; background: none;">
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ctxCloseBtn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#ctxReplyBtn')?.addEventListener('click', () => {
      overlay.remove();
      this.replyingToMessage = msg;
      const main = document.getElementById('mainContent');
      if (main) this.render(main);
      document.querySelector('#chatMessageTextInput')?.focus();
    });

    overlay.querySelector('#ctxDeleteBtn')?.addEventListener('click', () => {
      overlay.remove();
      if (confirm('Are you sure you want to delete this message?\n\nIt will be permanently removed from the chat.')) {
        Storage.delete('messages', msgId, currentUser);
        window.dispatchEvent(new CustomEvent('pe_show_toast', { detail: { message: 'Message deleted.', type: 'info' } }));
        const main = document.getElementById('mainContent');
        if (main) this.render(main);
      }
    });
  },

  // --- Fullscreen Media Viewer ---
  openFullscreenViewer(type, url) {
    const modal = document.getElementById('fullScreenMediaModal');
    const body = document.getElementById('fullscreenMediaBody');
    const closeBtn = document.getElementById('fullscreenMediaCloseBtn');
    if (!modal || !body) return;

    if (type === 'image') {
      body.innerHTML = `<img src="${url}" class="fullscreen-img" alt="Fullscreen Image">`;
    } else if (type === 'video') {
      body.innerHTML = `<video src="${url}" class="fullscreen-video" controls autoplay playsinline></video>`;
    }

    modal.style.display = 'flex';

    closeBtn.onclick = () => {
      const video = body.querySelector('video');
      if (video) video.pause();
      modal.style.display = 'none';
      body.innerHTML = '';
    };

    modal.onclick = (e) => {
      if (e.target === modal || e.target === body) {
        const video = body.querySelector('video');
        if (video) video.pause();
        modal.style.display = 'none';
        body.innerHTML = '';
      }
    };
  },

  toggleReaction(messageId, emoji, userUid) {
    const msg = Storage.getById('messages', messageId);
    if (!msg) return;

    const reactions = msg.reactions || {};
    const userList = reactions[emoji] || [];

    if (userList.includes(userUid)) {
      reactions[emoji] = userList.filter((u) => u !== userUid);
    } else {
      reactions[emoji] = [...userList, userUid];
    }

    Storage.update('messages', messageId, { reactions });
    const main = document.getElementById('mainContent');
    if (main) this.render(main);
  }
};
