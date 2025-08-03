// Assisted Mode - Full Karaoke Experience

class AssistedKaraokePlayer extends BaseKaraokePlayer {
    constructor() {
        super();
        
        this.rhythmEngine = new RhythmEngine();
        
        // DOM elements (cached once)
        this.songSelect = document.querySelector('.song-select');
        this.lyricsSelect = document.querySelector('.lyrics-select');
        this.lyricsDisplay = document.querySelector('.lyrics-display');
        this.lyricsInfo = document.querySelector('.lyrics-info');
        this.help = document.querySelector('.help');
        this.lyricsDetails = document.querySelector('.lyrics-details');
        this.lyricsTitle = document.querySelector('.lyrics-title');
        this.lyricsDate = document.querySelector('.lyrics-date');
        this.lyricsLocation = document.querySelector('.lyrics-location');
        this.lyricsGenre = document.querySelector('.lyrics-genre');
        this.statusMessage = document.querySelector('.status-message');
        this.karaokeBtn = document.querySelector('.load-karaoke-btn');
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.pausedTime = 0;
        this.currentWordIndex = 0;
        this.animationFrame = null;
        this.karaokeLoaded = false;
        
        // Content data
        this.currentSong = null;
        this.currentLyrics = null;
        this.songDelay = 0;
        
        // Text-to-speech
        this.speechSynthesis = window.speechSynthesis;
        this.speechEnabled = true; // Enable TTS in assisted mode
        this.speechUtterances = [];
        this.ttsTimeouts = [];
        this.ttsVolume = 0.8;
        this.ttsRestartScheduled = false;
        this.ttsInitialized = false;
        this.audioContext = null;
        
        // Lyrics display
        this.currentLyricsStringIndex = 0;
        this.lyricsStrings = [];
        this.allStringTimings = [];
        this.wordElements = [];
        this.bouncingBall = null;
        
        this.init();
    }
    
    init() {
        this.initializeEventListeners();
        this.loadAvailableContent().then(() => {
            this.populateSelects();
            this.updateStatus('Ready - Select instrumental and lyrics to begin');
        });
    }

    initializeEventListeners() {
        this.songSelect.addEventListener('change', (e) => {
            this.updateKaraokeButton();
            this.handleSongChange();
        });

        this.lyricsSelect.addEventListener('change', (e) => {
            this.showLyricsInfo(e.target.value);
            this.updateKaraokeButton();
            this.handleLyricsChange();
        });
    }

    populateSelects() {
        // Songs
        this.songSelect.innerHTML = '<option value="">-- Select Instrumental --</option>';
        this.songsData.songs.forEach(song => {
            const option = document.createElement('option');
            option.value = song.id;
            option.textContent = `${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
            this.songSelect.appendChild(option);
        });
        
        // Lyrics
        this.lyricsSelect.innerHTML = '<option value="">-- Select Lyrics --</option>';
        this.lyricsData.lyrics.forEach(lyrics => {
            const option = document.createElement('option');
            option.value = lyrics.id;
            option.textContent = `${lyrics.title} (${lyrics.date}) [${lyrics.genre}]`;
            this.lyricsSelect.appendChild(option);
        });
    }

    showLyricsInfo(lyricsId) {
        if (!lyricsId) {
            this.lyricsInfo.style.display = 'none';
            return;
        }

        this.lyricsDetails.classList.remove('hidden');
        this.help.classList.add('hidden');

        const lyricsData = this.lyricsData.lyrics.find(lyrics => lyrics.id === lyricsId);
        if (!lyricsData) return;

        this.lyricsTitle.textContent = lyricsData.title;
        this.lyricsDate.textContent = lyricsData.date;
        this.lyricsLocation.textContent = lyricsData.location;
        this.lyricsGenre.textContent = lyricsData.genre;

        // Update CSS custom properties based on genre
        const root = document.documentElement;
        if (lyricsData.genre === 'Curse') {
            root.style.setProperty('--text-color', 'var(--curse-text-color)');
            root.style.setProperty('--text-darker-color', 'var(--curse-text-darker-color)');
            root.style.setProperty('--shadow-color', 'var(--curse-shadow-color)');
            root.style.setProperty('--shadow-darker-color', 'var(--curse-shadow-darker-color)');
        } else if (lyricsData.genre === 'Blessing') {
            root.style.setProperty('--text-color', 'var(--blessing-text-color)');
            root.style.setProperty('--text-darker-color', 'var(--blessing-text-darker-color)');
            root.style.setProperty('--shadow-color', 'var(--blessing-shadow-color)');
            root.style.setProperty('--shadow-darker-color', 'var(--blessing-shadow-darker-color)');
        }
    }

    updateKaraokeButton() {
        const songSelected = this.songSelect.value;
        const lyricsSelected = this.lyricsSelect.value;
        
        if (songSelected && lyricsSelected) {
            this.karaokeBtn.style.display = 'block';
            if (!this.karaokeLoaded) {
                const root = document.documentElement;
                root.style.setProperty('--h2-text-color', 'var(--text-color)');
                root.style.setProperty('--h2-shadow-color', 'var(--shadow-color)');
                this.karaokeBtn.querySelector('h2').textContent = '🎤 Start Karaoke';
            }
        } else {
            this.karaokeLoaded = false;
        }
    }

    async loadKaraoke() {
        const songId = this.songSelect.value;
        const lyricsId = this.lyricsSelect.value;
        
        if (!songId || !lyricsId) {
            this.updateStatus('Error: Please select both instrumental and lyrics');
            return false;
        }

        try {
            this.updateStatus('Loading karaoke...');
            
            // Get already loaded data
            this.currentSong = this.songsData.songs.find(song => song.id === songId);
            this.currentLyrics = this.lyricsData.lyrics.find(lyrics => lyrics.id === lyricsId);
            
            if (!this.currentSong || !this.currentLyrics) {
                this.updateStatus('Error: Could not find selected content');
                return false;
            }
            
            // Update BPM and rhythm pattern from song data
            this.rhythmEngine.setBPM(this.currentSong.bpm);
            this.rhythmEngine.setPattern(this.currentSong.rhythmPattern);
            
            // Set delay from song data (default to 0 if not specified)
            this.songDelay = this.currentSong.delay || 0;
            
            // Process lyrics
            this.processLyrics();
            
            // Setup audio
            this.setupAudio(songId);
            
            // Setup text-to-speech
            this.setupTextToSpeech();
            
            this.karaokeLoaded = true;
            this.updateStatus(`Ready: ${this.currentLyrics.title} with ${this.currentSong.title}`);
            return true;
        } catch (error) {
            console.error('Error loading karaoke:', error);
            this.updateStatus(`Error: Could not load selected combination`);
            return false;
        }
    }

    setupTextToSpeech() {
        // Clear any existing utterances
        this.speechUtterances = [];
        
        if (!this.speechSynthesis) {
            console.warn('Speech synthesis not supported');
            return;
        }
        
        // Detect if we're on iOS/iPad for mobile optimizations
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        console.log('Setting up TTS with', this.allStringTimings.length, 'string timings', 
                   this.isIOS ? '(iOS detected)' : '(Desktop)');
        
        // Ensure voices are loaded
        const setupVoices = () => {
            const voices = this.speechSynthesis.getVoices();
            console.log('Available voices:', voices.length, voices.map(v => v.name));
        };
        
        if (this.speechSynthesis.getVoices().length === 0) {
            this.speechSynthesis.addEventListener('voiceschanged', setupVoices, { once: true });
        } else {
            setupVoices();
        }
        
        // Create utterances for each word with timing
        this.allStringTimings.forEach(stringData => {
            console.log('Processing string with', stringData.timings.length, 'word timings');
            stringData.timings.forEach((timing, index) => {
                console.log('Raw timing object:', timing);
                
                if (timing.word && timing.word.trim()) {
                    // Clean the word for TTS (but keep original for display)
                    const ttsWord = this.cleanWordForTTS(timing.word);
                    if (ttsWord) { // Only create utterance if word should be spoken
                        console.log('Creating utterance for word:', `"${timing.word}"`, '-> TTS:', `"${ttsWord}"`, 'at time:', timing.startTime);
                        const utterance = new SpeechSynthesisUtterance(ttsWord);
                        
                        // Configure speech parameters with iOS optimizations
                        if (this.isIOS) {
                            // iOS has issues with high TTS rates and overlapping speech
                            utterance.rate = Math.min(0.8, this.rhythmEngine.getTTSRate() * 0.5); // Much slower on iOS
                            utterance.pitch = 1.0; // Standard pitch for iOS
                            utterance.volume = 0.8; // Higher volume to ensure audibility
                        } else {
                            utterance.rate = this.rhythmEngine.getTTSRate(); // Pattern-specific rate
                            utterance.pitch = 1.2; // Higher pitch for singing
                            utterance.volume = Math.max(0, Math.min(1, this.ttsVolume || 0.8));
                        }
                        
                        // Try to get a more musical voice, prefer system voices on iOS
                        const voices = this.speechSynthesis.getVoices();
                        let preferredVoice;
                        if (this.isIOS) {
                            // On iOS, prefer any working English voice
                            preferredVoice = voices.find(voice => 
                                voice.localService && voice.lang.startsWith('en')
                            ) || voices.find(voice => voice.lang.startsWith('en'));
                        } else {
                            preferredVoice = voices.find(voice => 
                                voice.name.includes('Google') || 
                                voice.name.includes('Alex') ||
                                voice.name.includes('Samantha')
                            );
                        }
                        if (preferredVoice) {
                            utterance.voice = preferredVoice;
                            console.log('Using voice:', preferredVoice.name, 'Local:', preferredVoice.localService);
                        }
                        
                        this.speechUtterances.push({
                            utterance,
                            timing,
                            stringIndex: stringData.stringIndex
                        });
                    } else {
                        console.log('Skipping punctuation-only word:', `"${timing.word}"`);
                    }
                } else {
                    console.log('Skipping empty word at timing:', timing);
                }
            });
        });
        
        console.log('Created', this.speechUtterances.length, 'TTS utterances');
    }

    processLyrics() {
        // Store original lyrics strings (before punctuation breaking)
        this.lyricsStrings = this.currentLyrics.lyrics.filter(line => line.trim() !== '');
        this.currentLyricsStringIndex = 0;
        
        // Calculate timings for each lyrics string separately
        this.allStringTimings = [];
        let cumulativeTime = this.songDelay;
        
        this.lyricsStrings.forEach((lyricsString, stringIndex) => {
            const lines = this.breakLyricsByPunctuation(lyricsString.trim());
            const stringWords = []; // Store original words for display
            
            lines.forEach(line => {
                if (line.trim() === '') return;
                const words = line.trim().split(/\s+/);
                words.forEach(word => {
                    // Keep ALL words for display (including punctuation)
                    stringWords.push(word);
                });
            });
            
            // Calculate timing for all words, including those with punctuation
            const stringTimings = this.rhythmEngine.calculateTiming(stringWords, cumulativeTime);
            this.allStringTimings.push({
                stringIndex,
                words: stringWords, // Original words with punctuation
                timings: stringTimings,
                startTime: cumulativeTime,
                endTime: stringTimings.length > 0 ? stringTimings[stringTimings.length - 1].endTime : cumulativeTime
            });
            
            // Update cumulative time for next string
            cumulativeTime = stringTimings.length > 0 ? stringTimings[stringTimings.length - 1].endTime : cumulativeTime;
        });
        
        // Display first string
        this.displayCurrentLyricsString();
        this.updateStatus(`Processed ${this.lyricsStrings.length} lyrics sections`);
    }

    displayCurrentLyricsString() {
        console.log('displayCurrentLyricsString called, index:', this.currentLyricsStringIndex, 'total strings:', this.lyricsStrings.length);
        console.log('allStringTimings:', this.allStringTimings.length, 'entries');
        
        if (this.currentLyricsStringIndex >= this.lyricsStrings.length) {
            console.log('Index out of range, returning');
            return;
        }

        const container = this.lyricsDisplay;
        
        // Preserve the lyrics-info element if it exists
        const lyricsInfo = container.querySelector('.lyrics-info');
        
        container.innerHTML = '';
        
        // Restore the lyrics-info element if it existed
        if (lyricsInfo) {
            container.appendChild(lyricsInfo);
        }

        // Create lyrics background element
        const lyricsBackground = document.createElement('div');
        lyricsBackground.className = 'lyrics-background';
        container.appendChild(lyricsBackground);

        // Create lyrics container (hidden only if not currently playing)
        const lyricsContainer = document.createElement('div');
        lyricsContainer.className = this.isPlaying ? 'lyrics-container' : 'lyrics-container hidden';

        // Create bouncing ball
        this.bouncingBall = document.createElement('div');
        this.bouncingBall.className = 'bouncing-ball';
        
        // Set emoji based on lyrics genre
        if (this.currentLyrics && this.currentLyrics.genre === 'Blessing') {
            this.bouncingBall.textContent = '👼';
        } else {
            this.bouncingBall.textContent = '👹';
        }
        
        container.appendChild(this.bouncingBall);

        // Get current string data
        const currentStringData = this.allStringTimings[this.currentLyricsStringIndex];
        const currentLyricsString = this.lyricsStrings[this.currentLyricsStringIndex];
        
        console.log('currentStringData:', currentStringData);
        console.log('currentLyricsString:', currentLyricsString);
        
        // Break current string by punctuation and create display
        const lines = this.breakLyricsByPunctuation(currentLyricsString.trim());
        this.wordElements = [];
        this.currentStringTimings = currentStringData ? currentStringData.timings : [];
        
        let wordIndex = 0;
        lines.forEach((line, lineIdx) => {
            if (line.trim() === '') return;
            
            const lineElement = document.createElement('div');
            lineElement.className = 'lyrics-line';
            lineElement.dataset.lineIndex = lineIdx;

            const words = line.trim().split(/\s+/);
            words.forEach((word, wordIdx) => {
                // Create display elements for ALL words (for visual consistency)
                if (currentStringData && currentStringData.timings && wordIndex < currentStringData.timings.length) {
                    const wordElement = document.createElement('span');
                    wordElement.className = 'word';
                    wordElement.dataset.wordIndex = wordIndex;
                    wordElement.dataset.lineIndex = lineIdx;
                    wordElement.textContent = word; // Display original word with punctuation

                    wordElement.addEventListener('click', () => {
                        this.seekToWord(wordIndex);
                    });

                    this.wordElements.push(wordElement);
                    lineElement.appendChild(wordElement);
                    wordIndex++;
                }
            });

            lyricsContainer.appendChild(lineElement);
        });

        container.appendChild(lyricsContainer);
        
        // Update timings for current string
        this.timings = this.currentStringTimings;
        
        console.log('Created', this.wordElements.length, 'word elements for', (currentStringData && currentStringData.timings ? currentStringData.timings.length : 'undefined'), 'timings');
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    async initializeAudioContextForIOS() {
        if (!this.isIOS || this.audioContext) return;
        
        try {
            // Create AudioContext to control audio behavior
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Set audio context category to prevent ducking
            if (this.audioContext.audioWorklet) {
                // Modern approach - set the context to not duck audio
                await this.audioContext.resume();
            }
            
            // Configure audio element to work with context
            if (this.audioElement && this.audioContext) {
                // Connect audio element to context to prevent ducking
                const source = this.audioContext.createMediaElementSource(this.audioElement);
                source.connect(this.audioContext.destination);
            }
            
            console.log('Audio context initialized for iOS to prevent ducking');
        } catch (error) {
            console.warn('Failed to initialize audio context for iOS:', error);
        }
    }

    async initializeTTSForIOS() {
        if (!this.isIOS || this.ttsInitialized) return;
        
        try {
            console.log('Initializing TTS for iOS...');
            
            // Initialize audio context first to prevent ducking
            await this.initializeAudioContextForIOS();
            
            // Force voices to load first
            let voices = this.speechSynthesis.getVoices();
            if (voices.length === 0) {
                console.log('Waiting for voices to load...');
                await new Promise((resolve) => {
                    const checkVoices = () => {
                        voices = this.speechSynthesis.getVoices();
                        if (voices.length > 0) {
                            resolve();
                        } else {
                            setTimeout(checkVoices, 100);
                        }
                    };
                    this.speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
                    setTimeout(resolve, 2000); // Max 2 second wait
                    checkVoices();
                });
            }
            
            // Create and speak a test utterance to initialize TTS on iOS
            const testUtterance = new SpeechSynthesisUtterance('test');
            testUtterance.volume = 0.1; // Very quiet but not silent
            testUtterance.rate = 2; // Fast to minimize disruption
            testUtterance.pitch = 1;
            
            // Use the first available voice
            voices = this.speechSynthesis.getVoices();
            if (voices.length > 0) {
                testUtterance.voice = voices[0];
            }
            
            this.speechSynthesis.cancel(); // Clear any existing queue
            this.speechSynthesis.speak(testUtterance);
            
            // Wait for the utterance to complete
            await new Promise((resolve) => {
                testUtterance.onend = () => {
                    console.log('TTS test utterance completed');
                    resolve();
                };
                testUtterance.onerror = (e) => {
                    console.warn('TTS test utterance error:', e);
                    resolve();
                };
                // Fallback timeout
                setTimeout(resolve, 1000);
            });
            
            this.ttsInitialized = true;
            console.log('TTS initialized for iOS successfully');
        } catch (error) {
            console.warn('Failed to initialize TTS for iOS:', error);
        }
    }

    startPlayback() {
        if (!this.timings || this.timings.length === 0) {
            this.updateStatus('Error: No song loaded. Please select and load a song first');
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        
        if (this.pausedTime > 0) {
            this.startTime = performance.now() - this.pausedTime;
            if (this.audioElement && !this.audioElement.error) {
                this.audioElement.currentTime = this.pausedTime / 1000;
                this.audioElement.play().catch(e => console.warn('Audio play failed:', e));
            }
        } else {
            this.startTime = performance.now();
            this.currentWordIndex = 0;
            if (this.audioElement && !this.audioElement.error) {
                this.audioElement.volume = this.audioVolume;
                this.audioElement.currentTime = 0;
                this.audioElement.play().catch(e => console.warn('Audio play failed:', e));
            } else {
                console.log('No audio file, using TTS');
            }
        }

        // Start text-to-speech if enabled (with iOS initialization)
        if (this.speechEnabled) {
            if (this.isIOS) {
                // On iOS, ensure audio context is set up before TTS
                this.initializeAudioContextForIOS().then(() => {
                    return this.initializeTTSForIOS();
                }).then(() => {
                    this.startTextToSpeech();
                });
            } else {
                this.startTextToSpeech();
            }
        }

        // Hide lyrics info and show lyrics container
        if (this.lyricsInfo) {
            this.lyricsInfo.classList.add('hidden');
        }
        const lyricsContainer = this.lyricsDisplay.querySelector('.lyrics-container');
        if (lyricsContainer) {
            lyricsContainer.classList.remove('hidden');
        }

        this.karaokeBtn.querySelector('h2').textContent = 'Pause';
        this.updateStatus('Playing...');
        this.animate();
    }

    pausePlayback() {
        this.isPlaying = false;
        this.isPaused = true;
        this.pausedTime = performance.now() - this.startTime;
        
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.pause();
        }
        
        // Stop text-to-speech with iOS-specific handling
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
            // On iOS, sometimes need multiple cancel calls
            if (this.isIOS) {
                setTimeout(() => this.speechSynthesis.cancel(), 50);
            }
        }
        this.ttsTimeouts.forEach(timeout => clearTimeout(timeout));
        this.ttsTimeouts = [];
        
        this.karaokeBtn.querySelector('h2').textContent = 'Play';
        this.updateStatus('Paused');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    stopPlayback() {
        this.isPlaying = false;
        this.isPaused = false;
        this.pausedTime = 0;
        this.currentWordIndex = 0;
        
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        // Stop text-to-speech with iOS-specific handling
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
            // On iOS, sometimes need multiple cancel calls
            if (this.isIOS) {
                setTimeout(() => this.speechSynthesis.cancel(), 50);
            }
        }
        this.ttsTimeouts.forEach(timeout => clearTimeout(timeout));
        this.ttsTimeouts = [];
        
        if (this.karaokeLoaded) {
            this.karaokeBtn.querySelector('h2').textContent = 'Play';
        }
        this.updateStatus('Stopped');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.clearHighlights();
    }

    startTextToSpeech() {
        if (!this.speechUtterances.length) {
            console.log('No TTS utterances to play');
            return;
        }
        
        console.log('Starting TTS with', this.speechUtterances.length, 'utterances');
        
        // Clear any existing timeouts and cancel pending speech
        this.ttsTimeouts.forEach(timeout => clearTimeout(timeout));
        this.ttsTimeouts = [];
        
        // On iOS, ensure speech queue is clear to prevent issues
        if (this.isIOS) {
            this.speechSynthesis.cancel();
        }
        
        // Calculate current time offset for resume functionality
        const currentTimeOffset = this.pausedTime || 0;
        console.log('TTS resuming from time offset:', currentTimeOffset);
        
        // Track active utterances to prevent queue overflow on iOS
        let activeUtterances = 0;
        const maxConcurrentUtterances = this.isIOS ? 3 : 10; // iOS has stricter limits
        
        // Schedule each word to be spoken at the correct time
        this.speechUtterances.forEach(({ utterance, timing }) => {
            // Calculate delay relative to current playback position
            const absoluteDelay = timing.startTime - (this.isIOS ? 200 : 100); // Start earlier on iOS
            const relativeDelay = absoluteDelay - currentTimeOffset;
            const delay = Math.max(0, relativeDelay); // Don't allow negative delays
            
            // Skip words that should have already played (but not if we're at the very beginning)
            if (timing.startTime < currentTimeOffset && currentTimeOffset > 100) {
                console.log(`Skipping word "${timing.word}" - already passed (${timing.startTime} < ${currentTimeOffset})`);
                return;
            }
            
            console.log(`Scheduling word "${timing.word}" in ${delay}ms (absolute: ${absoluteDelay}, offset: ${currentTimeOffset})`);
            
            const timeout = setTimeout(() => {
                if (this.isPlaying && this.speechEnabled && activeUtterances < maxConcurrentUtterances) {
                    console.log('Speaking word:', `"${timing.word}"`, 'utterance text:', `"${utterance.text}"`);
                    
                    // iOS-specific volume handling to minimize ducking
                    if (this.isIOS) {
                        utterance.volume = 0.3; // Much lower volume to minimize ducking
                        // On iOS, don't allow overlapping - cancel previous on each new word
                        this.speechSynthesis.cancel();
                        activeUtterances = 0;
                    } else {
                        utterance.volume = Math.max(0, Math.min(1, this.ttsVolume || 0.8));
                        activeUtterances++;
                    }
                    
                    // Add event listeners to track utterance lifecycle
                    utterance.onend = () => {
                        activeUtterances = Math.max(0, activeUtterances - 1);
                        if (this.isIOS) {
                            console.log('iOS TTS utterance ended:', timing.word);
                        }
                    };
                    
                    utterance.onerror = (e) => {
                        activeUtterances = Math.max(0, activeUtterances - 1);
                        console.warn('TTS utterance error for word:', timing.word, e);
                    };
                    
                    console.log('Speaking on iOS:', timing.word, 'volume:', utterance.volume);
                    this.speechSynthesis.speak(utterance);
                }
            }, delay);
            
            this.ttsTimeouts.push(timeout);
        });
    }

    animate() {
        if (!this.isPlaying) return;

        const currentTime = performance.now() - this.startTime;
        
        // Check if we need to advance to the next lyrics string
        this.checkAndAdvanceLyricsString(currentTime);
        
        this.updateWordHighlights(currentTime);

        // Check if all lyrics strings are completed
        const totalDuration = this.allStringTimings && this.allStringTimings.length > 0 
            ? this.allStringTimings[this.allStringTimings.length - 1].endTime 
            : this.rhythmEngine.getTotalDuration(this.timings);

        // Check if audio has ended - if so, stop playback
        if (this.audioElement && this.audioElement.ended) {
            this.stopPlayback();
            this.updateStatus('Playback completed');
            return;
        }

        // Prepare for TTS restart - more conservative timing on iOS
        const restartTiming = this.isIOS ? 1000 : 500; // iOS needs more time
        const timeUntilEnd = totalDuration - currentTime;
        if (timeUntilEnd <= restartTiming && timeUntilEnd > 0 && this.speechEnabled && !this.ttsRestartScheduled) {
            console.log(`Scheduling TTS restart in ${restartTiming}ms before lyrics end`);
            this.ttsRestartScheduled = true;
            
            setTimeout(() => {
                if (this.isPlaying && this.speechEnabled) {
                    console.log('Pre-emptively restarting TTS');
                    // Clear any existing TTS timeouts
                    this.ttsTimeouts.forEach(timeout => clearTimeout(timeout));
                    this.ttsTimeouts = [];
                    
                    // Cancel any ongoing speech
                    if (this.speechSynthesis) {
                        this.speechSynthesis.cancel();
                    }
                    
                    // On iOS, add a small delay before restarting to avoid conflicts
                    const restartDelay = this.isIOS ? 200 : 0;
                    setTimeout(() => {
                        if (this.isPlaying && this.speechEnabled) {
                            this.startTextToSpeech();
                        }
                    }, restartDelay);
                }
            }, restartTiming);
        }

        // If lyrics have completed but audio is still playing, loop the lyrics
        if (currentTime >= totalDuration) {
            console.log('Lyrics completed, looping back to beginning');
            // Reset to beginning
            this.startTime = performance.now();
            this.currentWordIndex = 0;
            this.currentLyricsStringIndex = 0;
            this.pausedTime = 0;
            this.ttsRestartScheduled = false; // Reset the flag
            
            // Reset display to first lyrics string
            this.displayCurrentLyricsString();
            
            // Clear highlights and reset bouncing ball
            this.clearHighlights();
            if (this.bouncingBall) {
                this.bouncingBall.classList.remove('active');
                this.bouncingBall.style.left = '0px';
                this.bouncingBall.style.top = '0px';
            }
            
            this.updateStatus('Looping lyrics...');
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    checkAndAdvanceLyricsString(currentTime) {
        if (!this.allStringTimings || this.allStringTimings.length <= 1) return;
        
        // Check if current string is completed and we need to advance
        const currentStringData = this.allStringTimings[this.currentLyricsStringIndex];
        if (currentTime >= currentStringData.endTime && this.currentLyricsStringIndex < this.lyricsStrings.length - 1) {
            
            this.currentLyricsStringIndex++;
            this.displayCurrentLyricsString();
            
            // Reset bouncing ball position
            if (this.bouncingBall) {
                this.bouncingBall.classList.remove('active');
                this.bouncingBall.style.left = '0px';
                this.bouncingBall.style.top = '0px';
            }
            
            this.updateStatus(`Now showing stanza ${this.currentLyricsStringIndex + 1} of ${this.lyricsStrings.length}`);
        }
    }

    updateWordHighlights(currentTime) {
        if (!this.timings || this.timings.length === 0) return;
        
        // Get current string data for relative timing
        const currentStringData = this.allStringTimings[this.currentLyricsStringIndex];
        if (!currentStringData) return;
        
        // Calculate relative time within current string
        const relativeTime = currentTime - currentStringData.startTime;
        
        this.wordElements.forEach((element, index) => {
            if (!this.timings[index]) return;
            
            const timing = this.timings[index];
            element.classList.remove('active', 'completed');

            // Adjust timing relative to current string's start
            const adjustedStartTime = timing.startTime - currentStringData.startTime;
            const adjustedEndTime = timing.endTime - currentStringData.startTime;

            if (relativeTime >= adjustedStartTime && relativeTime < adjustedEndTime) {
                element.classList.add('active');
                if (this.currentWordIndex !== index) {
                    this.currentWordIndex = index;
                    this.updateBouncingBall(element);
                    this.triggerBeatBounce();
                }
            } else if (relativeTime >= adjustedEndTime) {
                element.classList.add('completed');
            }
        });
    }

    updateBouncingBall(activeWord) {
        if (!this.bouncingBall || !activeWord) return;

        const wordRect = activeWord.getBoundingClientRect();
        const containerRect = this.lyricsDisplay.getBoundingClientRect();
        
        const relativeLeft = wordRect.left - containerRect.left + (wordRect.width / 2);
        const relativeTop = wordRect.top - containerRect.top;

        this.bouncingBall.style.left = `${relativeLeft}px`;
        this.bouncingBall.style.top = `${relativeTop - 25}px`;
        this.bouncingBall.classList.add('active');
    }

    triggerBeatBounce() {
        if (!this.bouncingBall) return;
        
        // Remove beat class and force reflow to restart animation
        this.bouncingBall.classList.remove('beat');
        this.bouncingBall.offsetHeight; // Force reflow
        this.bouncingBall.classList.add('beat');
        
        // Remove beat class after animation completes
        setTimeout(() => {
            if (this.bouncingBall) {
                this.bouncingBall.classList.remove('beat');
            }
        }, 300);
    }

    clearHighlights() {
        if (this.wordElements && this.wordElements.length > 0) {
            this.wordElements.forEach(element => {
                element.classList.remove('active', 'completed');
            });
        }

        if (this.bouncingBall) {
            this.bouncingBall.classList.remove('active');
        }
    }

    setTTSVolume(volume) {
        this.ttsVolume = Math.max(0, Math.min(1, volume));
    }

    async handleSongChange() {
        // If karaoke is already loaded and playing, and song changes, auto-restart with new song
        if (this.karaokeLoaded && this.songSelect.value && this.lyricsSelect.value) {
            // Stop current playback completely
            this.stopPlayback();
            
            // Reset all state variables
            this.currentWordIndex = 0;
            this.currentLyricsStringIndex = 0;
            this.pausedTime = 0;
            this.startTime = 0;
            
            // Load new karaoke
            const success = await this.loadKaraoke();
            if (success) {
                this.startPlayback();
            }
        }
    }

    async handleLyricsChange() {
        // If karaoke is already loaded and playing, and lyrics change, pause and show info
        if (this.karaokeLoaded && this.songSelect.value && this.lyricsSelect.value) {
            // Pause current playback (don't stop completely)
            if (this.isPlaying) {
                this.pausePlayback();
            }
            
            // Reset state variables but don't restart playback
            this.currentWordIndex = 0;
            this.currentLyricsStringIndex = 0;
            this.pausedTime = 0;
            this.startTime = 0;
            
            // Load new karaoke but don't start playing
            await this.loadKaraoke();
            
            // Show the lyrics info and hide the lyrics container
            this.showLyricsInfo(this.lyricsSelect.value);
            if (this.lyricsInfo) {
                this.lyricsInfo.classList.remove('hidden');
            }
            const lyricsContainer = this.lyricsDisplay.querySelector('.lyrics-container');
            if (lyricsContainer) {
                lyricsContainer.classList.add('hidden');
            }
            
            // Update status to indicate user needs to press play
            this.updateStatus('New lyrics loaded - Press Play to start');
            this.karaokeBtn.querySelector('h2').textContent = '🎤 Start Karaoke';
        }
    }

    updateStatus(message) {
        this.statusMessage.textContent = `${message}`;
    }
}

// Initialize the assisted mode player
const player = new AssistedKaraokePlayer();
window.player = player; // Make available for volume controls

// Global functions for HTML onclick handlers
async function handleKaraokeButton() {
    if (!player.karaokeLoaded) {
        // First time: load karaoke and start playback
        const success = await player.loadKaraoke();
        if (success) {
            player.startPlayback();
        }
    } else {
        // Already loaded: just toggle playback
        player.togglePlayback();
    }
}

function togglePlayback() {
    player.togglePlayback();
}

function stopPlayback() {
    player.stopPlayback();
}