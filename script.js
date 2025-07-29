class SyllableDetector {
    static vowels = 'aeiouyAEIOUY';
    static consonants = 'bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ';

    static countSyllables(word) {
        if (!word || word.length === 0) return 0;
        
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length === 0) return 0;

        let syllableCount = 0;
        let previousWasVowel = false;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const isVowel = this.vowels.includes(char);

            if (isVowel && !previousWasVowel) {
                syllableCount++;
            }
            previousWasVowel = isVowel;
        }

        if (word.endsWith('e') && syllableCount > 1) {
            syllableCount--;
        }

        if (word.endsWith('le') && word.length > 2 && !this.vowels.includes(word[word.length - 3])) {
            syllableCount++;
        }

        return Math.max(1, syllableCount);
    }

    static splitIntoSyllables(word) {
        if (!word || word.length === 0) return [word];
        
        const originalWord = word;
        word = word.toLowerCase();
        const syllableCount = this.countSyllables(word);
        
        if (syllableCount === 1) {
            return [originalWord];
        }

        const syllables = [];
        let currentSyllable = '';
        let vowelCount = 0;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const originalChar = originalWord[i];
            currentSyllable += originalChar;

            if (this.vowels.includes(char)) {
                vowelCount++;
                
                if (vowelCount < syllableCount) {
                    let nextConsonants = '';
                    let j = i + 1;
                    
                    while (j < word.length && !this.vowels.includes(word[j])) {
                        nextConsonants += originalWord[j];
                        j++;
                    }

                    if (nextConsonants.length > 1) {
                        const splitPoint = Math.floor(nextConsonants.length / 2);
                        currentSyllable += nextConsonants.substring(0, splitPoint);
                        syllables.push(currentSyllable);
                        currentSyllable = nextConsonants.substring(splitPoint);
                        i = j - nextConsonants.length + splitPoint;
                    } else if (nextConsonants.length === 1 && j < word.length) {
                        syllables.push(currentSyllable);
                        currentSyllable = '';
                    }
                }
            }
        }

        if (currentSyllable) {
            syllables.push(currentSyllable);
        }

        return syllables.length > 0 ? syllables : [originalWord];
    }
}

class RhythmEngine {
    constructor() {
        this.patterns = {
            basic: [0.25, 0.25, 0.25, 0.25],
            mixed: [0.125, 0.25, 0.375, 0.25, 0.125],
            syncopated: [0.165, 0.165, 0.165, 0.25, 0.125],
            ballad: [0.375, 0.25, 0.375, 0.5, 0.25],
            custom: [0.25, 0.25, 0.25, 0.25]
        };
        this.currentPattern = 'basic';
        this.bpm = 120;
    }

    setPattern(patternName, customPattern = null) {
        if (patternName === 'custom' && customPattern) {
            this.patterns.custom = customPattern;
        }
        this.currentPattern = patternName;
    }

    setBPM(bpm) {
        this.bpm = Math.max(60, Math.min(200, bpm));
    }

    getPattern() {
        return this.patterns[this.currentPattern] || this.patterns.basic;
    }

    calculateTiming(syllables, delayMs = 0) {
        const pattern = this.getPattern();
        const wholeNoteMs = (60000 / this.bpm) * 4; // Whole note duration in milliseconds
        const timings = [];
        let currentTime = delayMs; // Start with delay offset

        syllables.forEach((syllable, index) => {
            const beatValue = pattern[index % pattern.length];
            const duration = wholeNoteMs * beatValue;
            
            timings.push({
                syllable: syllable,
                startTime: currentTime,
                duration: duration,
                endTime: currentTime + duration
            });
            
            currentTime += duration;
        });

        return timings;
    }

    getTotalDuration(timings) {
        if (timings.length === 0) return 0;
        return timings[timings.length - 1].endTime;
    }
}

class KaraokePlayer {
    constructor() {
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

        this.songTitle = document.querySelector('.song-title');
        this.songArtist = document.querySelector('.song-artist');
        this.songBPM = document.querySelector('.song-bpm');
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.pausedTime = 0;
        this.currentSyllableIndex = 0;
        this.animationFrame = null;
        this.karaokeLoaded = false;
        
        // Content data
        this.currentSong = null;
        this.currentLyrics = null;
        this.audioElement = null;
        this.songsData = { songs: [] };
        this.lyricsData = { lyrics: [] };
        this.songDelay = 0;
        
        // Lyrics display
        this.currentLyricsStringIndex = 0;
        this.lyricsStrings = [];
        this.allStringTimings = [];
        this.syllableElements = [];
        this.lyricsBackground = null;
        this.bouncingBall = null;
        
        // Configuration
        this.availableSongs = ['dancing-queen', 'oops-i-did-it-again', 'call-me-maybe','APT', 'little-apple'];
        this.availableLyrics = ['against-damaro-I', 'against-damaro-II', 'curse-against-theagenes-and-other-cooks', 'curse-on-the-murderers-of-heraklea-and-marthine', 'curses-from-the-temple-of-demeter-at-knidos-I', 'curses-from-the-temple-of-demeter-at-knidos-II', 'curses-from-the-temple-of-demeter-at-knidos-III', 'docimedis', 'oropos', 'thetima-dionysophon', 'tretia-maria', 'vilbia', 'maqlu', 'protect-the-bearer', 'fabia', 'spirit-tablet'];
        this.availableImages = ["Roman_baths_2014_57.jpg", "Roman_baths_2014_58.jpg", "Roman_baths_2014_60.jpg", "Roman_baths_2014_61.jpg"];
        this.availableAnimations = ['spin-horizontal-3d', 'spin-vertical-3d', 'squish-upwards'];
        
        this.init();
    }
    
    init() {
        this.initializeEventListeners();
        this.loadAvailableContent();
    }

    initializeEventListeners() {
        this.songSelect.addEventListener('change', (e) => {
            this.updateKaraokeButton();
            this.handleSelectionChange();
        });

        this.lyricsSelect.addEventListener('change', (e) => {
            this.showLyricsInfo(e.target.value);
            this.updateKaraokeButton();
            this.handleSelectionChange();
        });

    }


    async loadAvailableContent() {
        this.updateStatus('Loading available content...');
        
        // Load songs and lyrics in parallel
        const songPromises = this.availableSongs.map(id => 
            fetch(`songs/${id}.json`).then(r => r.json()).catch(e => console.warn(`Could not load song: ${id}`, e))
        );
        const lyricsPromises = this.availableLyrics.map(id => 
            fetch(`lyrics/${id}.json`).then(r => r.json()).catch(e => console.warn(`Could not load lyrics: ${id}`, e))
        );
        
        try {
            const [songs, lyrics] = await Promise.all([
                Promise.all(songPromises),
                Promise.all(lyricsPromises)
            ]);
            
            this.songsData.songs = songs.filter(Boolean);
            this.lyricsData.lyrics = lyrics.filter(Boolean);
            
            this.populateSelects();
            this.updateStatus('Ready - Select instrumental and lyrics to begin');
        } catch (error) {
            console.error('Error loading content:', error);
            this.updateStatus('Error: Could not load content');
        }
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
        this.lyricsInfo.style.display = 'block';

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
            this.setRandomBackground();
            
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
            this.setupAudio();
            
            
            this.karaokeLoaded = true;
            this.updateStatus(`Ready: ${this.currentLyrics.title} with ${this.currentSong.title}`);
            return true;
        } catch (error) {
            console.error('Error loading karaoke:', error);
            this.updateStatus(`Error: Could not load selected combination`);
            return false;
        }
    }

    setupAudio() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
        }

        this.audioElement = new Audio();
        this.audioElement.src = this.currentSong.audioFile;
        this.audioElement.preload = 'auto';

        this.audioElement.addEventListener('loadedmetadata', () => {
            this.updateStatus(`Audio loaded: ${this.currentSong.title}`);
        });

        this.audioElement.addEventListener('error', () => {
            console.warn('Audio file not found:', this.currentSong.audioFile);
            this.updateStatus(`Audio file not found: ${this.currentSong.audioFile} (Add MP3 file to continue)`);
        });

        this.audioElement.addEventListener('ended', () => {
            this.stopPlayback();
            this.updateStatus('Song completed');
        });
    }

    breakLyricsByPunctuation(lyrics) {
        // Split by newlines first to preserve existing line breaks
        const originalLines = lyrics.split('\n');
        const processedLines = [];

        originalLines.forEach(line => {
            if (line.trim() === '') {
                // Preserve empty lines
                processedLines.push('');
                return;
            }

            // Split by major punctuation marks that indicate natural pauses
            // Keep the punctuation with the preceding text
            const segments = line.split(/([.!?;:])\s+/);
            
            let currentSegment = '';
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                
                // If this is a punctuation mark, add it to current segment
                if (/^[.!?;:,]$/.test(segment)) {
                    currentSegment += segment;
                    // If there's more content after this punctuation, finalize this segment
                    if (i < segments.length - 1 && segments[i + 1].trim()) {
                        processedLines.push(currentSegment.trim());
                        currentSegment = '';
                    }
                } else if (segment.trim()) {
                    // Add non-punctuation content
                    currentSegment += segment;
                }
            }
            
            // Add any remaining content
            if (currentSegment.trim()) {
                processedLines.push(currentSegment.trim());
            }
        });

        return processedLines;
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
            const stringSyllables = [];
            
            lines.forEach(line => {
                if (line.trim() === '') return;
                const words = line.trim().split(/\s+/);
                words.forEach(word => {
                    const syllables = SyllableDetector.splitIntoSyllables(word);
                    syllables.forEach(syllable => {
                        stringSyllables.push(syllable);
                    });
                });
            });
            
            // Calculate timing for this string starting from cumulative time
            const stringTimings = this.rhythmEngine.calculateTiming(stringSyllables, cumulativeTime);
            this.allStringTimings.push({
                stringIndex,
                syllables: stringSyllables,
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
        if (this.currentLyricsStringIndex >= this.lyricsStrings.length) {
            return;
        }

        const container = this.lyricsDisplay;
        
        // Preserve the background element if it exists
        let existingBackground = container.querySelector('.lyrics-background');
        let backgroundImage = '';
        if (existingBackground) {
            backgroundImage = existingBackground.style.backgroundImage;
        }
        
        container.innerHTML = '';

        // Create/restore lyrics background element
        const lyricsBackground = document.createElement('div');
        lyricsBackground.className = 'lyrics-background';
        if (backgroundImage) {
            lyricsBackground.style.backgroundImage = backgroundImage;
        } else if (this.pendingBackgroundImage) {
            lyricsBackground.style.backgroundImage = this.pendingBackgroundImage;
        }
        container.appendChild(lyricsBackground);

        // Create lyrics container
        const lyricsContainer = document.createElement('div');
        lyricsContainer.className = 'lyrics-container';

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
        
        // Break current string by punctuation and create display
        const lines = this.breakLyricsByPunctuation(currentLyricsString.trim());
        this.syllableElements = [];
        this.currentStringTimings = currentStringData.timings;
        
        let syllableIndex = 0;
        lines.forEach((line, lineIdx) => {
            if (line.trim() === '') return;
            
            const lineElement = document.createElement('div');
            lineElement.className = 'lyrics-line';
            lineElement.dataset.lineIndex = lineIdx;

            const words = line.trim().split(/\s+/);
            words.forEach((word, wordIdx) => {
                const wordElement = document.createElement('span');
                wordElement.className = 'word';
                wordElement.dataset.wordIndex = wordIdx;
                wordElement.dataset.lineIndex = lineIdx;

                const syllables = SyllableDetector.splitIntoSyllables(word);
                syllables.forEach(syllable => {
                    const syllableSpan = document.createElement('span');
                    syllableSpan.className = 'syllable-part';
                    syllableSpan.textContent = syllable;
                    syllableSpan.dataset.syllableIndex = syllableIndex;

                    syllableSpan.addEventListener('click', () => {
                        this.seekToSyllable(syllableIndex);
                    });

                    wordElement.appendChild(syllableSpan);
                    this.syllableElements.push(syllableSpan);
                    syllableIndex++;
                });

                lineElement.appendChild(wordElement);
            });

            lyricsContainer.appendChild(lineElement);
        });

        container.appendChild(lyricsContainer);
        
        // Update timings for current string
        this.timings = this.currentStringTimings;
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
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
            this.currentSyllableIndex = 0;
            if (this.audioElement && !this.audioElement.error) {
                this.audioElement.currentTime = 0;
                this.audioElement.play().catch(e => console.warn('Audio play failed:', e));
            }
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
        this.currentSyllableIndex = 0;
        
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
        
        if (this.karaokeLoaded) {
            this.karaokeBtn.querySelector('h2').textContent = 'Play';
        }
        this.updateStatus('Stopped');
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.clearHighlights();
    }

    resetPlayback() {
        this.stopPlayback();
        this.currentSyllableIndex = 0;
        this.pausedTime = 0;
        this.currentLyricsStringIndex = 0;
        
        // Display first lyrics string again
        if (this.lyricsStrings && this.lyricsStrings.length > 0) {
            this.displayCurrentLyricsString();
        }
        
        this.clearHighlights();
        this.updateStatus('Reset to beginning');
    }

    animate() {
        if (!this.isPlaying) return;

        const currentTime = performance.now() - this.startTime;
        // Timeline removed - no need to update current time display
        
        // Check if we need to advance to the next lyrics string
        this.checkAndAdvanceLyricsString(currentTime);
        
        this.updateSyllableHighlights(currentTime);

        // Check if all lyrics strings are completed
        const totalDuration = this.allStringTimings && this.allStringTimings.length > 0 
            ? this.allStringTimings[this.allStringTimings.length - 1].endTime 
            : this.rhythmEngine.getTotalDuration(this.timings);

        if (currentTime < totalDuration) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.stopPlayback();
            this.updateStatus('Playback completed');
        }
    }

    checkAndAdvanceLyricsString(currentTime) {
        if (!this.allStringTimings || this.allStringTimings.length <= 1) return;
        
        // Check if current string is completed and we need to advance
        const currentStringData = this.allStringTimings[this.currentLyricsStringIndex];
        if (currentTime >= currentStringData.endTime && this.currentLyricsStringIndex < this.lyricsStrings.length - 1) {
            
            // Apply random animation and change background before advancing
            this.animateBackgroundTransition();
            
            this.currentLyricsStringIndex++;
            this.displayCurrentLyricsString();
            
            // Reset bouncing ball position
            if (this.bouncingBall) {
                this.bouncingBall.classList.remove('active');
                this.bouncingBall.style.left = '0px';
                this.bouncingBall.style.top = '0px';
            }
            
            
            this.updateStatus(`Now showing section ${this.currentLyricsStringIndex + 1} of ${this.lyricsStrings.length}`);
        }
    }

    updateSyllableHighlights(currentTime) {
        if (!this.timings || this.timings.length === 0) return;
        
        // Get current string data for relative timing
        const currentStringData = this.allStringTimings[this.currentLyricsStringIndex];
        if (!currentStringData) return;
        
        // Calculate relative time within current string
        const relativeTime = currentTime - currentStringData.startTime;
        
        this.syllableElements.forEach((element, index) => {
            if (!this.timings[index]) return;
            
            const timing = this.timings[index];
            element.classList.remove('active', 'completed');

            // Adjust timing relative to current string's start
            const adjustedStartTime = timing.startTime - currentStringData.startTime;
            const adjustedEndTime = timing.endTime - currentStringData.startTime;

            if (relativeTime >= adjustedStartTime && relativeTime < adjustedEndTime) {
                element.classList.add('active');
                if (this.currentSyllableIndex !== index) {
                    this.currentSyllableIndex = index;
                    this.updateBouncingBall(element);
                    this.triggerBeatBounce();
                }
            } else if (relativeTime >= adjustedEndTime) {
                element.classList.add('completed');
            }
        });

        this.updateBackgroundSaturation(currentTime);
    }

    updateBouncingBall(activeSyllable) {
        if (!this.bouncingBall || !activeSyllable) return;

        const syllableRect = activeSyllable.getBoundingClientRect();
        const containerRect = this.lyricsDisplay.getBoundingClientRect();
        
        const relativeLeft = syllableRect.left - containerRect.left + (syllableRect.width / 2);
        const relativeTop = syllableRect.top - containerRect.top;

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

    updateBackgroundSaturation(currentTime) {
        const lyricsBackground = document.querySelector('.lyrics-background');
        if (!lyricsBackground) return;

        // Calculate progress through entire lyric set (all strings)
        const totalDuration = this.allStringTimings && this.allStringTimings.length > 0 
            ? this.allStringTimings[this.allStringTimings.length - 1].endTime 
            : this.rhythmEngine.getTotalDuration(this.timings);
        
        const percentage = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;
        
        // Convert percentage to red saturation
        // At 0%: normal background
        // At 100%: heavily red-saturated background
        const saturation = 1 + (percentage / 100) * 2; // 1.0 to 3.0
        const redBoost = 1 + (percentage / 100) * 1.5; // 1.0 to 2.5
        
        lyricsBackground.style.filter = `saturate(${saturation}) sepia(${percentage / 100}) hue-rotate(-10deg) contrast(${redBoost})`;
    }

    clearHighlights() {
        this.syllableElements.forEach(element => {
            element.classList.remove('active', 'completed');
        });

        if (this.bouncingBall) {
            this.bouncingBall.classList.remove('active');
        }

        // Reset background saturation
        const lyricsBackground = document.querySelector('.lyrics-background');
        if (lyricsBackground) {
            lyricsBackground.style.filter = '';
        }
    }

    seekToPosition(event) {
        // Timeline removed - seeking disabled
    }

    seekToPercentage(percentage) {
        // Timeline removed - seeking disabled
    }

    seekToSyllable(index) {
        if (index >= 0 && index < this.timings.length) {
            const targetTime = this.timings[index].startTime;
            
            if (this.isPlaying) {
                this.startTime = performance.now() - targetTime;
            } else {
                this.pausedTime = targetTime;
            }

            this.currentSyllableIndex = index;
        }
    }

    findCurrentSyllableIndex(currentTime) {
        for (let i = 0; i < this.timings.length; i++) {
            if (currentTime >= this.timings[i].startTime && currentTime < this.timings[i].endTime) {
                this.currentSyllableIndex = i;
                break;
            }
        }
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateStatus(message) {
        this.statusMessage.textContent = `${message}`;
    }

    setRandomBackground() {
        const randomIndex = Math.floor(Math.random() * this.availableImages.length);
        const imageName = this.availableImages[randomIndex];
        const imageUrl = `img/${imageName}`;
        this.setLyricsDisplayBackground(imageUrl);
        console.log(`Initial background set to: ${imageName}`);
    }

    setLyricsDisplayBackground(imageUrl) {
        const lyricsBackground = document.querySelector('.lyrics-background');
        if (lyricsBackground) {
            lyricsBackground.style.backgroundImage = `url("${imageUrl}")`;
        } else {
            // If no background element exists yet, store it for when it's created
            this.pendingBackgroundImage = `url("${imageUrl}")`;
        }
    }

    animateBackgroundTransition() {
        const lyricsBackground = document.querySelector('.lyrics-background');
        if (!lyricsBackground) {
            console.warn('No lyrics background element found for animation');
            return;
        }

        // Choose random animation
        const randomAnimation = this.availableAnimations[Math.floor(Math.random() * this.availableAnimations.length)];
        
        console.log(`Applying animation: ${randomAnimation}`);
        console.log('Available animations:', this.availableAnimations);
        console.log('Background element found:', lyricsBackground);
        
        // Clear any existing animation first
        lyricsBackground.style.animation = '';
        
        // Force reflow to ensure animation reset
        lyricsBackground.offsetHeight;
        
        // Apply animation
        lyricsBackground.style.animation = `${randomAnimation} 1s ease-in-out`;
        
        // Change background image after animation completes (1 second)
        setTimeout(() => {
            if (lyricsBackground) {
                // Clear animation
                lyricsBackground.style.animation = '';
                // Now change the background image
                this.setRandomBackgroundImage(lyricsBackground);
            }
        }, 1000);
    }

    setRandomBackgroundImage(lyricsBackground) {
        // Get current background to avoid repeating
        const currentBg = lyricsBackground.style.backgroundImage;
        console.log('Current background:', currentBg);
        
        // Filter out current image and shuffle remaining
        const availableImages = this.availableImages.filter(img => {
            const imgUrl = `url("img/${img}")`;
            return imgUrl !== currentBg;
        });
        
        if (availableImages.length === 0) {
            // If no other images, use any random one
            availableImages.push(...this.availableImages);
        }
        
        // Choose random image
        const randomIndex = Math.floor(Math.random() * availableImages.length);
        const imageName = availableImages[randomIndex];
        const imageUrl = `img/${imageName}`;
        
        lyricsBackground.style.backgroundImage = `url("${imageUrl}")`;
        console.log(`Background changed to: ${imageName}`);
    }

    // Public method to test background change without animation
    testBackgroundChange() {
        const lyricsBackground = document.querySelector('.lyrics-background');
        if (lyricsBackground) {
            this.setRandomBackgroundImage(lyricsBackground);
        } else {
            console.warn('No background element found');
        }
    }

    async handleSelectionChange() {
        // If karaoke is already loaded and playing, and selections change, auto-load new pairing
        if (this.karaokeLoaded && this.songSelect.value && this.lyricsSelect.value) {
            const success = await this.loadKaraoke();
            if (success) {
                this.startPlayback();
            }
        }
    }
}

const player = new KaraokePlayer();

function loadKaraoke() {
    player.loadKaraoke();
}

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

function resetPlayback() {
    player.resetPlayback();
}

function seekToPosition(event) {
    player.seekToPosition(event);
}

function testBackgroundAnimation() {
    player.animateBackgroundTransition();
}

function testBackgroundChange() {
    player.testBackgroundChange();
}