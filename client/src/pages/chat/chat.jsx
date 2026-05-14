import React, { useState, useEffect, useRef } from 'react';
// Socket is now managed inside the component to ensure fresh headers/cookies
import { io } from "https://cdn.socket.io/4.8.1/socket.io.esm.min.js";
import '../../game.css';
import './chat.css';

import { BACKEND_URL } from '../../includes/constantes.js';

const formatAudioTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const isAudioFile = (filename) => {
    if (!filename) return false;
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
    return audioExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const isImageFile = (filename) => {
    if (!filename) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const isVideoFile = (filename) => {
    if (!filename) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const ChatAudioPlayer = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => setDuration(audio.duration || 0);
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };
        const handlePause = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
        };
    }, []);

    const togglePlayback = async (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            return;
        }

        try {
            await audio.play();
        } catch (error) {
            console.error(error);
        }
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio || !duration) return;

        const nextTime = Number(e.target.value);
        audio.currentTime = nextTime;
        setCurrentTime(nextTime);
    };

    return (
        <div className="chat-audio-player-shell" onClick={(e) => e.stopPropagation()}>
            <audio ref={audioRef} preload="metadata" src={src} />
            <button type="button" className="chat-audio-play-btn" onClick={togglePlayback}>
                {isPlaying ? '❚❚' : '▶'}
            </button>
            <div className="chat-audio-track">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={Math.min(currentTime, duration || 0)}
                    onChange={handleSeek}
                    className="chat-audio-progress"
                />
                <div className="chat-audio-times">
                    <span>{formatAudioTime(currentTime)}</span>
                    <span>{formatAudioTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

const Chat = ({ onBack }) => {
    const socketRef = useRef(null); // Use ref to keep socket instance
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    /* State */
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [viewingMedia, setViewingMedia] = useState(null);

    // New State
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);
    const [activeMessageOptions, setActiveMessageOptions] = useState(null); // ID of message with open options
    const [isViewingHistoryMode, setIsViewingHistoryMode] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordingError, setRecordingError] = useState('');
    const [recordingSeconds, setRecordingSeconds] = useState(0);

    useEffect(() => {
        // Initialize socket
        const token = sessionStorage.getItem('chat_token');
        const socket = io(BACKEND_URL, {
            withCredentials: true,
            autoConnect: true,
            forceNew: true,
            auth: { token } // Pass token explicitly for session isolation
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            setError('');
            setMessages([]);
            setHasMore(true);
            setIsViewingHistoryMode(false);
            socket.emit('getHistory', { cursor: null });
        });

        socket.on('connect_error', (err) => {
            setIsConnected(false);
            setError('No autenticado. Inicia sesión primero.');
        });

        socket.on('session', (user) => {
            setCurrentUser(user);
        });

        socket.on('receiveMessage', (message) => {
            setMessages((prev) => [...prev, message]);
            // Only auto-scroll if NOT viewing history
            if (!isViewingHistoryMode) {
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        });

        socket.on('historyChunk', (chunk) => {
            setIsLoadingMore(false);
            if (chunk.length < 50) {
                setHasMore(false);
            }
            setMessages((prev) => {
                const isInitial = prev.length === 0;
                const newMessages = [...chunk, ...prev];
                // Sort by ID to ensure order if chunks overlap or arrive weirdly
                newMessages.sort((a, b) => a.id - b.id);
                
                if (isInitial && chunk.length > 0) {
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                    }, 0);
                }
                return newMessages;
            });
        });

        socket.on('loadJumpMessages', (history) => {
            setMessages(history);
            setIsViewingHistoryMode(true);
            setHasMore(false);
            setIsLoadingMore(false);

            // Verify if target exists in loaded history
            if (jumpTargetIdRef.current) {
                const targetExists = history.some(m => m.id === jumpTargetIdRef.current);
                if (!targetExists) {
                    // Prevent indefinite loading state or confusion
                    alert("El mensaje al que intentas ir no se encuentra en el historial (pudo haber sido eliminado).");
                    jumpTargetIdRef.current = null;
                }
            }
        });

        socket.on('jumpError', (err) => {
            setIsLoadingMore(false);
            alert(err.message);
            jumpTargetIdRef.current = null;
        });

        socket.on('messageUpdated', ({ id, text, isEdited }) => {
            setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, text: text, isEdited: isEdited } : msg));
        });

        socket.on('messageDeleted', ({ id }) => {
            setMessages(prev => prev.filter(msg => msg.id !== id));
        });

        return () => {
            socket.off('connect');
            socket.off('connect_error');
            socket.off('session');
            socket.off('receiveMessage');
            socket.off('historyChunk');
            socket.off('loadJumpMessages');
            socket.off('jumpError');
            socket.off('messageUpdated');
            socket.off('messageDeleted');
            socket.disconnect();
        };
    }, [isViewingHistoryMode]); // Re-bind listener to capture state? No, avoid stale closures with refs if needed, or simple updates.

    useEffect(() => {
        if (!isRecordingAudio) {
            setRecordingSeconds(0);
            return;
        }

        const intervalId = window.setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [isRecordingAudio]);

    // ... (Scroll logic stays same)
    const prevScrollHeightRef = useRef(0);
    const jumpTargetIdRef = useRef(null);

    useEffect(() => {
        if (!isViewingHistoryMode && messagesContainerRef.current && messages.length > 0 && messages[0].id !== messagesEndRef.current?.dataset?.lastId) {
            const container = messagesContainerRef.current;
            const currentScrollHeight = container.scrollHeight;
            if (prevScrollHeightRef.current > 0) {
                const diff = currentScrollHeight - prevScrollHeightRef.current;
                if (diff > 0 && container.scrollTop === 0) {
                    container.scrollTop = diff;
                }
            }
            prevScrollHeightRef.current = currentScrollHeight;
        }

        // Handle jump scroll
        if (jumpTargetIdRef.current) {
            const element = document.getElementById(`msg-${jumpTargetIdRef.current}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.style.background = 'rgba(255, 255, 255, 0.2)';
                setTimeout(() => {
                    element.style.background = '';
                }, 1500);
                jumpTargetIdRef.current = null;
            }
        }

    }, [messages, isViewingHistoryMode]);

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeMessageOptions) {
                if (!event.target.closest('.chat-options-menu') && !event.target.closest('.chat-options-trigger')) {
                    setActiveMessageOptions(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMessageOptions]);

    const [showScrollDown, setShowScrollDown] = useState(false);
    const chatToken = sessionStorage.getItem('chat_token');
    const buildUploadUrl = (filename) => {
        const url = new URL(`${BACKEND_URL}/uploads/${filename}`);
        if (chatToken) {
            url.searchParams.set('token', chatToken);
        }
        return url.toString();
    };

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        // Infinite scroll up logic
        if (!isViewingHistoryMode && container.scrollTop === 0 && !isLoadingMore && hasMore && messages.length > 0) {
            setIsLoadingMore(true);
            prevScrollHeightRef.current = container.scrollHeight;
            const oldestId = messages[0].id;
            socketRef.current?.emit('getHistory', { cursor: oldestId });
        }

        // Scroll down button logic
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        // Show button if NOT near bottom OR if we are in history mode
        setShowScrollDown(!isNearBottom || isViewingHistoryMode);
    };

    const scrollToBottom = () => {
        if (isViewingHistoryMode) {
            returnToPresent();
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${BACKEND_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Upload failed');
            }
            return await response.json();
        } catch (err) {
            console.error(err);
            alert('Error al subir archivo');
            return null;
        }
    };

    const uploadRecordedAudio = async (audioBlob) => {
        const extension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
        const audioFile = new File([audioBlob], `audio-${Date.now()}.${extension}`, {
            type: audioBlob.type || `audio/${extension}`
        });
        return uploadFile(audioFile);
    };

    const formatRecordingTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsSending(true); // Start sending indicator
            const result = await uploadFile(file);
            if (result) {
                const messageData = {
                    text: result.filename,
                    type: result.type,
                    responseTo: replyingTo ? replyingTo.id : null
                };
                socketRef.current?.emit('sendMessage', messageData);
                setReplyingTo(null);
            }
            setIsSending(false); // End sending indicator
        }
        e.target.value = '';
    };

    const stopAudioRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const startAudioRecording = async () => {
        setRecordingError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            audioChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const recordedBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
                stream.getTracks().forEach((track) => track.stop());
                mediaRecorderRef.current = null;
                audioChunksRef.current = [];
                setIsRecordingAudio(false);

                if (recordedBlob.size === 0) {
                    setRecordingError('No se pudo grabar el audio.');
                    return;
                }

                setIsSending(true);
                const result = await uploadRecordedAudio(recordedBlob);
                if (result) {
                    socketRef.current?.emit('sendMessage', {
                        text: result.filename,
                        type: result.type,
                        responseTo: replyingTo ? replyingTo.id : null
                    });
                    setReplyingTo(null);
                }
                setIsSending(false);
            };

            mediaRecorder.onerror = () => {
                setRecordingError('Ocurrió un error al grabar audio.');
                stream.getTracks().forEach((track) => track.stop());
                mediaRecorderRef.current = null;
                audioChunksRef.current = [];
                setIsRecordingAudio(false);
            };

            mediaRecorder.start();
            setShowAttachMenu(false);
            setIsRecordingAudio(true);
            setRecordingSeconds(0);
        } catch (error) {
            console.error(error);
            setRecordingError('No se pudo acceder al micrófono.');
            setIsRecordingAudio(false);
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && isConnected) {
            if (editingMessage) {
                socketRef.current?.emit('editMessage', { id: editingMessage.id, text: input });
                setEditingMessage(null);
            } else {
                const messageData = {
                    text: input,
                    type: 'text',
                    responseTo: replyingTo ? replyingTo.id : null
                };
                socketRef.current?.emit('sendMessage', messageData);
                setReplyingTo(null);
            }
            setInput('');
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.focus(); // Keep focus
            }
        }
    };

    const handleInputResize = (e) => {
        const target = e.target;
        target.style.height = 'auto';
        target.style.height = `${Math.min(target.scrollHeight, 120)}px`; // Max height 120px
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(e);
        }
    };

    const handleCancelAction = () => {
        setReplyingTo(null);
        setEditingMessage(null);
        setInput('');
        setActiveMessageOptions(null);
    };

    const handleOptionClick = (msg) => {
        if (activeMessageOptions === msg.id) {
            setActiveMessageOptions(null);
        } else {
            setActiveMessageOptions(msg.id);
        }
    };

    const startReply = (msg) => {
        setReplyingTo(msg);
        setEditingMessage(null);
        setActiveMessageOptions(null);
        setTimeout(() => inputRef.current?.focus(), 50); // Focus input with slight delay to ensure UI updates
    };

    const startEdit = (msg) => {
        setEditingMessage(msg);
        setReplyingTo(null);
        setInput(msg.text);
        setActiveMessageOptions(null);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleDelete = (id) => {
        if (confirm('¿Eliminar mensaje?')) {
            socketRef.current?.emit('deleteMessage', { id });
        }
        setActiveMessageOptions(null);
    };

    /* Helper for Dates */
    const getDateLabel = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const isToday = date.toDateString() === now.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return 'Hoy';
        if (isYesterday) return 'Ayer';

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        // if within last week, return day name?
        // User asked for "Miercoles" etc. Let's do simple logic:
        // If it's this week (simple check less than 7 days ago), show Day Name.
        // Else DD/MM/YYYY
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            return dayNames[date.getDay()];
        }

        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const scrollToMessage = (id) => {
        const element = document.getElementById(`msg-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight effect?
            element.style.transition = 'background 0.5s';
            element.style.background = 'rgba(255, 255, 255, 0.1)';
            setTimeout(() => {
                element.style.background = '';
            }, 1000);
        } else {
            console.log("Message not found within loaded history, jumping...");
            jumpTargetIdRef.current = id;
            setIsLoadingMore(true); // Show loading
            socketRef.current?.emit('jumpToMessage', { id });
        }
    };

    const returnToPresent = () => {
        setIsViewingHistoryMode(false);
        setMessages([]);
        setHasMore(true);
        setIsLoadingMore(false); // Reset
        socketRef.current?.emit('getHistory', { cursor: null });
    };

    // State for attach menu
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    let lastDateLabel = null;

    return (
        <div className="game-container glass-panel chat-container">
            {/* Header */}
            <div className="glass-panel chat-header">
                <button className="btn" onClick={onBack} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                    ← Volver
                </button>
                <div className="chat-header-content">
                    <span className="chat-header-title">
                        Chat
                    </span>
                    {error && <span className="chat-status-error">{error}</span>}
                    {recordingError && <span className="chat-status-error">{recordingError}</span>}
                    {isConnected && <span className="chat-status-connected">Conectado como {currentUser?.name}</span>}
                </div>
                <div className="chat-placeholder"></div>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="chat-messages-area"
            >
                {messages.length === 0 && (
                    <div className="chat-empty-message">
                        {!error ? (isLoadingMore ? 'Cargando...' : 'Bienvenido al Chat del Sistema. Envía un mensaje...') : 'Debes iniciar sesión con un personaje.'}
                    </div>
                )}

                {isLoadingMore && messages.length > 0 && (
                    <div className="chat-loading-message">
                        Cargando historial...
                    </div>
                )}

                {isSending && (
                     <div className="chat-loading-message" style={{ position: 'sticky', bottom: '10px', zIndex: 10 }}>
                        Enviando archivo...
                    </div>
                )}

                {isRecordingAudio && (
                    <div className="chat-recording-banner">
                        <span className="chat-recording-dot"></span>
                        <span>Grabando</span>
                        <span className="chat-recording-time">{formatRecordingTime(recordingSeconds)}</span>
                    </div>
                )}

                {/* Scroll Down / Return Button */}
                {showScrollDown && (
                    <button
                        className="chat-scroll-down-btn"
                        onClick={scrollToBottom}
                        title={isViewingHistoryMode ? "Volver al presente" : "Ir al final"}
                        style={{ bottom: (replyingTo || editingMessage) ? '140px' : '90px' }}
                    >
                        {isViewingHistoryMode ? <i className="fas fa-forward"></i> : <i className="fas fa-chevron-down"></i>}
                    </button>
                )}

                {messages.map((msg, index) => {
                    const isMe = currentUser && msg.user === currentUser.name;
                    const showOptions = activeMessageOptions === msg.id;

                    // Grouping Logic
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isSameUser = prevMsg && prevMsg.user === msg.user;
                    // Check if time difference is less than 2 minutes (120000ms) logic could be tweaked
                    const isNearTime = prevMsg && (new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 120000);
                    const isGrouped = isSameUser && isNearTime;

                    // Date Logic (still needed for dividers)
                    const currentDateLabel = getDateLabel(msg.createdAt);
                    const showDateDivider = currentDateLabel !== lastDateLabel;
                    lastDateLabel = currentDateLabel;

                    return (
                        <React.Fragment key={msg.id}>
                            {showDateDivider && (
                                <div className="chat-date-divider">
                                    {currentDateLabel}
                                </div>
                            )}

                            <div id={`msg-${msg.id}`} className={`chat-message-row ${isMe ? 'mod-me' : 'mod-other'} ${isGrouped ? 'grouped' : ''}`} style={{ marginTop: isGrouped ? '-2px' : '4px' }}>
                                
                                {!isGrouped && (
                                    <span className="chat-message-sender-name">
                                        {msg.user}
                                    </span>
                                )}

                                {showOptions && (
                                    <div className={`chat-options-menu ${isMe ? 'mod-me' : 'mod-other'}`} style={{ top: '30px', right: isMe ? '10px' : 'auto', left: isMe ? 'auto' : '10px' }}>
                                        <button className="chat-option-btn" onClick={() => startReply(msg)}>
                                            <i className="fas fa-reply"></i> Responder
                                        </button>
                                        {isMe && (
                                            <>
                                                {(!msg.type || msg.type === 'text') && (
                                                    <button className="chat-option-btn" onClick={() => startEdit(msg)}>
                                                        <i className="fas fa-pen"></i> Editar
                                                    </button>
                                                )}
                                                <button className="chat-option-btn delete" onClick={() => handleDelete(msg.id)}>
                                                    <i className="fas fa-trash"></i> Eliminar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
{/* Hola intento de cambio */}
                                {msg.reply && (
                                    <div
                                        className="chat-reply-bubble"
                                        style={{ borderLeft: `3px solid ${msg.reply.color}`, cursor: 'pointer', marginBottom: '4px', zIndex: 1 }}
                                        onClick={() => scrollToMessage(msg.reply.id)}
                                    >
                                        <span className="chat-reply-user" style={{ color: msg.reply.color }}>{msg.reply.user}</span>
                                        <div className="chat-reply-content">
                                            {msg.reply.type !== 'text' ? (
                                                msg.reply.type === 'image' ? '📷 Foto' :
                                                    msg.reply.type === 'video' ? '🎥 Video' :
                                                        msg.reply.type === 'audio' ? 'Audio' :
                                                        '📄 Archivo'
                                            ) : msg.reply.text}
                                        </div>
                                    </div>
                                )}

                                <div
                                    className={`chat-message-bubble ${isMe ? 'mod-me' : 'mod-other'} ${msg.type === 'image' || msg.type === 'video' ? 'clickable' : ''}`}
                                    style={{
                                        border: `1px solid ${msg.color || 'var(--glass-border)'}`,
                                        boxShadow: `0 0 10px ${msg.color || '#fff'}22`,
                                        marginTop: '0'
                                    }}
                                    onClick={() => {
                                        if (msg.type === 'image' || msg.type === 'video' || (msg.type === 'file' && (isImageFile(msg.text) || isVideoFile(msg.text)))) {
                                            setViewingMedia({
                                                ...msg,
                                                type: msg.type === 'file' ? (isImageFile(msg.text) ? 'image' : 'video') : msg.type
                                            });
                                        }
                                    }}
                                >
                                    {(msg.type === 'image' || (msg.type === 'file' && isImageFile(msg.text))) && (
                                        <div className="chat-media-indicator">
                                            <span>📷</span>
                                            <span style={{ textDecoration: 'underline' }}>Foto</span>
                                        </div>
                                    )}
                                    {(msg.type === 'video') && (
                                        <div className="chat-media-indicator">
                                            <span>🎥</span>
                                            <span style={{ textDecoration: 'underline' }}>Video</span>
                                        </div>
                                    )}
                                    {(msg.type === 'audio' || (msg.type === 'file' && isAudioFile(msg.text))) && (
                                        <div className="chat-audio-message">
                                            <ChatAudioPlayer src={buildUploadUrl(msg.text)} />
                                        </div>
                                    )}
                                    {msg.type === 'file' && !isAudioFile(msg.text) && !isImageFile(msg.text) && !isVideoFile(msg.text) && (
                                        <a
                                            href={buildUploadUrl(msg.text)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="chat-file-link"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                                        >
                                            <span style={{ fontSize: '1.2rem' }}>📄</span>
                                            <span style={{ textDecoration: 'underline' }}>{msg.text}</span>
                                        </a>
                                    )}
                                    {(!msg.type || msg.type === 'text') && msg.text}
                                    
                                    <div className="chat-message-footer">
                                        <span className="chat-timestamp">
                                            {formatTime(msg.createdAt)}
                                        </span>
                                        <span
                                            className="chat-options-trigger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOptionClick(msg);
                                            }}
                                            style={{ marginLeft: '5px', cursor: 'pointer', opacity: 0.6, fontSize: '1rem' }}
                                        >
                                            ⋮
                                        </span>
                                    </div>
                                    {msg.isEdited && (
                                        <div className="chat-edited-label" style={{ clear: 'both', fontSize: '0.6rem', opacity: 0.5, marginTop: '2px', textAlign: isMe ? 'right' : 'left' }}>
                                            (editado)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    )
                })}

                {isViewingHistoryMode && (
                    <div style={{
                        position: 'sticky',
                        bottom: '10px',
                        left: '0',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        zIndex: 50,
                        pointerEvents: 'none' // wrapper shouldn't block, button should
                    }}>
                        <button
                            onClick={returnToPresent}
                            className="btn btn-primary"
                            style={{
                                pointerEvents: 'auto',
                                borderRadius: '20px',
                                padding: '8px 16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            ⬇ Ir al presente
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Reply/Edit Indicator */}
            {(replyingTo || editingMessage) && (
                <div className="chat-action-indicator">
                    <div 
                        className="chat-action-text" 
                        onClick={() => replyingTo ? scrollToMessage(replyingTo.id) : (editingMessage ? scrollToMessage(editingMessage.id) : null)}
                        style={{ cursor: 'pointer' }}
                        title="Ir al mensaje"
                    >
                        {replyingTo && (
                            <span className="chat-action-replying">
                                Respondiendo a <strong style={{ color: replyingTo.color }}>{replyingTo.user}</strong>: {
                                    replyingTo.type === 'image' ? '📷 Foto' :
                                        replyingTo.type === 'video' ? '🎥 Video' :
                                            replyingTo.type === 'audio' ? 'Audio' :
                                            replyingTo.type === 'file' ? '📄 Archivo' :
                                                replyingTo.text
                                }
                            </span>
                        )}
                        {editingMessage && (
                            <span className="chat-action-editing">
                                Editando mensaje
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleCancelAction}
                        className="chat-action-close-btn"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={sendMessage} className="chat-input-form" style={{ position: 'relative' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*"
                />
                <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    accept="image/*,video/*"
                    capture="environment"
                />

                {/* Attach Menu */}
                {showAttachMenu && (
                    <div style={{
                        position: 'absolute',
                        bottom: '80px',
                        left: '10px',
                        background: '#222',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        zIndex: 50,
                        boxShadow: '0 5px 20px rgba(0,0,0,0.5)'
                    }}>
                        <button
                            type="button"
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', textAlign: 'left' }}
                            onClick={() => {
                                fileInputRef.current?.click();
                                setShowAttachMenu(false);
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📷</span> Multimedia
                        </button>
                        <button
                            type="button"
                            className="btn"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', textAlign: 'left' }}
                            onClick={() => {
                                cameraInputRef.current?.click();
                                setShowAttachMenu(false);
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>📷</span> Cámara
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    className="btn chat-icon-btn"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={!isConnected}
                    title="Adjuntar"
                    style={{ transform: showAttachMenu ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                    +
                </button>

                {isRecordingAudio ? (
                    <div className="chat-recording-composer" role="status" aria-live="polite">
                        <div className="chat-recording-composer-main">
                            <span className="chat-recording-dot"></span>
                            <span className="chat-recording-label">Grabando audio</span>
                        </div>
                        <span className="chat-recording-composer-time">{formatRecordingTime(recordingSeconds)}</span>
                    </div>
                ) : (
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            handleInputResize(e);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isConnected ? "Escribe un mensaje..." : "Bloqueado"}
                        disabled={!isConnected}
                        className="chat-input-field"
                        rows={1}
                    />
                )}
                {input.trim() ? (
                    <button type="submit" className="btn btn-primary chat-send-btn" disabled={!isConnected || !input.trim() || isRecordingAudio}>
                        ➤
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`btn chat-send-btn ${isRecordingAudio ? 'chat-recording-stop-btn' : 'btn-primary'}`}
                        disabled={!isConnected || isSending}
                        onClick={() => {
                            if (isRecordingAudio) {
                                stopAudioRecording();
                            } else {
                                startAudioRecording();
                            }
                        }}
                        title={isRecordingAudio ? 'Detener grabación' : 'Grabar audio'}
                    >
                        {isRecordingAudio ? '■' : '🎤'}
                    </button>
                )}
            </form>

            {/* Media Viewer Modal */}
            {viewingMedia && (
                <div className="chat-media-modal">
                    <button
                        onClick={() => setViewingMedia(null)}
                        className="btn chat-media-close-btn"
                    >
                        ✕ Cerrar
                    </button>

                    <div className="chat-media-container">
                        {viewingMedia.type === 'image' && (
                            <img
                                src={buildUploadUrl(viewingMedia.text)}
                                alt="Shared content"
                                className="chat-media-element"
                                style={{ objectFit: 'contain', boxShadow: `0 0 20px ${viewingMedia.color}` }}
                            />
                        )}
                        {viewingMedia.type === 'video' && (
                            <video
                                src={buildUploadUrl(viewingMedia.text)}
                                controls
                                autoPlay
                                className="chat-media-element"
                                style={{ boxShadow: `0 0 20px ${viewingMedia.color}` }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
