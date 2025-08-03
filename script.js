// Shared classes and utilities for Karaoke Sabbath

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
            
            // Real song patterns
            apt: [0.25, 0.125, 0.125, 0.25, 0.125, 0.25, 0.125, 0.375], // APT by ROSÉ & Bruno Mars - bouncy K-pop rhythm
            dancingQueen: [0.25, 0.25, 0.125, 0.125, 0.25, 0.25, 0.375], // Dancing Queen - disco beat
            callMeMaybe: [0.125, 0.25, 0.125, 0.25, 0.25, 0.25, 0.375], // Call Me Maybe - pop rhythm
            oopsIDidItAgain: [0.25, 0.125, 0.25, 0.125, 0.25, 0.25, 0.25], // Oops I Did It Again - pop/dance
            littleApple: [0.25, 0.25, 0.125, 0.125, 0.25, 0.125, 0.375], // Little Apple - Chinese pop rhythm
            
            // Ancient rhythmic patterns for curses/blessings
            ancient: [0.5, 0.25, 0.5, 0.75], // Slow, ritualistic timing
            incantation: [0.375, 0.125, 0.375, 0.125, 0.375, 0.5], // Spell-like rhythm
            ceremonial: [0.75, 0.25, 0.25, 0.75] // Formal, religious timing
        };
        
        // TTS speed mapping for different patterns
        this.ttsRates = {
            basic: 1.5,
            
            // Real song patterns
            apt: 2.5,
            dancingQueen: 1.5,
            callMeMaybe: 1.5,
            oopsIDidItAgain: 1,
            littleApple: 1.75,
            
            // Ancient rhythmic patterns
            ancient: 1.0,
            incantation: 2.0,
            ceremonial: 0.8
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
    
    getTTSRate() {
        return this.ttsRates[this.currentPattern] || this.ttsRates.basic;
    }

    calculateTiming(words, delayMs = 0) {
        const pattern = this.getPattern();
        const wholeNoteMs = (60000 / this.bpm) * 4; // Whole note duration in milliseconds
        const timings = [];
        let currentTime = delayMs; // Start with delay offset

        words.forEach((word, index) => {
            const beatValue = pattern[index % pattern.length];
            const duration = wholeNoteMs * beatValue;
            
            timings.push({
                word: word,
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

// Base class with shared functionality
class BaseKaraokePlayer {
    constructor() {
        // Configuration
        this.availableSongs = ['dancing-queen', 'oops-i-did-it-again', 'call-me-maybe','APT', 'little-apple'];
        this.availableLyrics = ['against-damaro-I', 'against-damaro-II', 'curse-against-theagenes-and-other-cooks', 'curse-on-the-murderers-of-heraklea-and-marthine', 'curses-from-the-temple-of-demeter-at-knidos-I', 'curses-from-the-temple-of-demeter-at-knidos-II', 'curses-from-the-temple-of-demeter-at-knidos-III', 'docimedis', 'oropos', 'thetima-dionysophon', 'tretia-maria', 'vilbia', 'maqlu', 'protect-the-bearer', 'fabia', 'spirit-tablet'];
        
        // Data storage
        this.songsData = { songs: [] };
        this.lyricsData = { lyrics: [] };
        
        // Audio
        this.audioVolume = 0.3;
        this.audioElement = null;
    }

    async loadAvailableContent() {
        console.log('Loading available content...');
        
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
            
            console.log(`Loaded ${this.songsData.songs.length} songs and ${this.lyricsData.lyrics.length} lyrics`);
            return true;
        } catch (error) {
            console.error('Error loading content:', error);
            return false;
        }
    }

    setupAudio(songId) {
        console.log('setupAudio called with songId:', songId);
        console.log('Available songs in setupAudio:', this.songsData.songs.map(s => s.id));
        
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement = null;
        }

        const song = this.songsData.songs.find(s => s.id === songId);
        console.log('Found song in setupAudio:', song);
        if (!song) {
            console.error('Song not found in setupAudio for ID:', songId);
            return false;
        }

        console.log('Creating audio element for:', song.audioFile);
        this.audioElement = new Audio();
        this.audioElement.src = song.audioFile;
        this.audioElement.preload = 'auto';
        this.audioElement.volume = this.audioVolume;
        
        console.log('Audio element created:', this.audioElement);

        this.audioElement.addEventListener('loadedmetadata', () => {
            console.log(`Audio loaded: ${song.title}`);
        });

        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio file error:', song.audioFile, e);
        });

        return true;
    }

    setAudioVolume(volume) {
        this.audioVolume = Math.max(0, Math.min(1, volume));
        if (this.audioElement) {
            this.audioElement.volume = this.audioVolume;
        }
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

    cleanWordForTTS(word) {
        // Remove punctuation and clean up the word for natural speech
        let cleanWord = word
            .replace(/[.,!?;:\"'()\\[\\]{}\u2014\u2013-]/g, '') // Remove punctuation
            .replace(/['']/g, '') // Remove smart quotes
            .replace(/[…]/g, '') // Remove ellipsis
            .replace(/[""]/g, '') // Remove curly quotes
            .trim();
        
        // Handle common abbreviations and symbols that TTS reads poorly
        cleanWord = cleanWord
            .replace(/&/g, 'and')
            .replace(/@/g, 'at')
            .replace(/#/g, 'hashtag')
            .replace(/\\$/g, 'dollar')
            .replace(/%/g, 'percent');
        
        // Special handling for "I" - use lowercase "i" to avoid "capital I" pronunciation
        if (cleanWord.toUpperCase() === 'I') {
            return 'i';
        }
        
        // Convert to lowercase to avoid "Capital X" pronunciation for other words
        cleanWord = cleanWord.toLowerCase();
        
        // Return empty string for words that are empty or just punctuation
        if (cleanWord.length === 0) {
            return '';
        }
        
        // Allow all single-character words (a, i, etc.) - they're important for speech
        // Only filter out if it's not a valid letter
        if (cleanWord.length === 1 && !/^[a-z]$/i.test(cleanWord)) {
            return '';
        }
        
        // Return empty string for words that are just punctuation marks written out
        const punctuationWords = ['comma', 'period', 'ellipsis', 'semicolon', 'colon', 'exclamation', 'question'];
        if (punctuationWords.includes(cleanWord)) {
            return '';
        }
        
        return cleanWord;
    }

    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Global volume control functions
function setAudioVolume(volume) {
    if (window.player) {
        window.player.setAudioVolume(volume);
    }
}

function setTTSVolume(volume) {
    if (window.player && typeof window.player.setTTSVolume === 'function') {
        window.player.setTTSVolume(volume);
    }
}

// Adjust lyrics display height based on controls panel height
function adjustLyricsDisplayHeight() {
    const controlsPanel = document.querySelector('.controls-panel');
    const lyricsDisplay = document.querySelector('.lyrics-display');
    
    if (controlsPanel && lyricsDisplay) {
        // Force layout calculation
        controlsPanel.offsetHeight;
        
        const controlsHeight = controlsPanel.offsetHeight;
        const newLyricsHeight = `calc(100vh - ${controlsHeight}px)`;
        
        lyricsDisplay.style.height = newLyricsHeight;
        
        console.log(`Controls panel height: ${controlsHeight}px, Lyrics display height: ${newLyricsHeight}`);
    }
}

// Run on page load and window resize
window.addEventListener('DOMContentLoaded', adjustLyricsDisplayHeight);
window.addEventListener('resize', adjustLyricsDisplayHeight);