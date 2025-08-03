// Solo Mode - Continuous Scrolling Experience

class SoloKaraokePlayer extends BaseKaraokePlayer {
    constructor() {
        super();
        
        // DOM elements
        this.songSelect = document.querySelector('.song-select');
        this.help = document.querySelector('.help');
        this.lyricsDisplay = document.querySelector('.lyrics-display');
        this.lyricsContent = document.querySelector('.lyrics-content');
        this.statusMessage = document.querySelector('.status-message');
        this.karaokeBtn = document.querySelector('.load-karaoke-btn');
        this.currentLyricsTitle = document.querySelector('.current-lyrics-title');
        this.modeRadios = document.querySelectorAll('input[name="mode"]');
        this.speedSlider = document.querySelector('.speed-slider');
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentSong = null;
        
        // Solo mode specific
        this.soloScrollInterval = null;
        this.currentSoloSongIndex = 0;
        this.soloAnimationStartTime = null;
        this.soloAnimationPauseTime = null;
        this.scrollRate = 50; // pixels per second
        
        // Audio speed control
        this.audioSpeed = 1.0;
        
        this.init();
    }
    
    init() {
        this.initializeEventListeners();
        this.loadAvailableContent().then((success) => {
            console.log('Content loaded successfully:', success);
            console.log('Available songs:', this.songsData.songs);
            this.populateSelects();
            this.setupSoloMode();
            this.updateStatus('Ready - Select song and click Play to begin');
        
        // Initialize mode styling
        this.handleModeChange(document.querySelector('input[name="mode"]:checked')?.value || 'blessing');
        });
    }

    initializeEventListeners() {
        this.songSelect.addEventListener('change', (e) => {
            this.updatePlayButton();
            this.handleSongChange();
        });
        
        // Mode change listeners
        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleModeChange(e.target.value);
            });
        });
    }

    populateSelects() {
        // Songs only
        this.songSelect.innerHTML = '<option value="">-- Select Instrumental --</option>';
        this.songsData.songs.forEach(song => {
            const option = document.createElement('option');
            option.value = song.id;
            option.textContent = `${song.title}${song.artist ? ` - ${song.artist}` : ''}`;
            this.songSelect.appendChild(option);
        });
    }

    updatePlayButton() {
        const songSelected = this.songSelect.value;
        
        if (songSelected) {
            if (!this.isPlaying && !this.isPaused) {
                const root = document.documentElement;
                root.style.setProperty('--h2-text-color', 'var(--text-color)');
                root.style.setProperty('--h2-shadow-color', 'var(--shadow-color)');
                this.karaokeBtn.querySelector('h2').textContent = '🎤 Start Karaoke';
            }
        } else {
            this.karaokeBtn.querySelector('h2').textContent = 'Select song to begin';
        }
    }

    setupSoloMode() {
        console.log('Setting up solo mode');
        
        if (!this.lyricsData.lyrics || this.lyricsData.lyrics.length === 0) {
            this.updateStatus('No lyrics available for solo mode');
            return;
        }
        
        // Chain all lyrics together but don't start animation yet
        this.displayAllLyricsForSolo();
    }

    displayAllLyricsForSolo() {
        const container = this.lyricsDisplay;
        const lyricsContent = this.lyricsContent;

        
        lyricsContent.innerHTML = '';
        
        // Create scrolling container (but don't start animation yet)
        const lyricsContainer = document.createElement('div');
        lyricsContainer.className = 'lyrics-scroll-container';
        
        // Filter lyrics by selected mode
        const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'blessing';
        const filteredLyrics = this.lyricsData.lyrics.filter(lyrics => 
            lyrics.genre?.toLowerCase() === selectedMode
        );
        
        // Add filtered lyrics in order
        filteredLyrics.forEach((lyricsData, index) => {
            const lyricsSection = document.createElement('div');
            lyricsSection.className = 'lyrics-section';
            lyricsSection.dataset.songIndex = index;
            
            // Add song title marker
            const lyricsDetails = document.createElement('div');
            lyricsDetails.className = 'lyrics-details';
            lyricsDetails.innerHTML = `
                <h1 class="lyrics-title">${lyricsData.title}</h1>
                <h1>Date: ${lyricsData.date}</h1>
                <h1>Location: ${lyricsData.location || 'Unknown'}</h1>
            `;
            lyricsSection.appendChild(lyricsDetails);
            
            // Add lyrics content
            lyricsData.lyrics.forEach(lyricsString => {
                if (!lyricsString.trim()) return;
                
                const lines = this.breakLyricsByPunctuation(lyricsString.trim());
                lines.forEach(line => {
                    if (!line.trim()) return;
                    
                    const lineElement = document.createElement('div');
                    lineElement.className = 'lyrics-line';
                    lineElement.textContent = line.trim();
                    
                    lyricsSection.appendChild(lineElement);
                });
            });
            
            lyricsContainer.appendChild(lyricsSection);
        });
        
        lyricsContent.appendChild(lyricsContainer);
        
        // Force layout calculation by temporarily making visible
        lyricsContent.classList.remove('hidden');
        
        // Force a reflow to ensure the element is rendered
        lyricsContainer.offsetHeight;
        
        // Calculate total scroll duration based on content height and scroll rate
        const totalHeight = lyricsContainer.scrollHeight || lyricsContainer.offsetHeight;
        const scrollDuration = Math.max(10, totalHeight / this.scrollRate); // Minimum 10 seconds
        
        console.log(`Solo mode: Total height ${totalHeight}px, duration ${scrollDuration}s`);
        console.log('Container dimensions:', lyricsContainer.offsetWidth, 'x', lyricsContainer.offsetHeight);
        
        // Set CSS custom property for animation duration
        container.style.setProperty('--scroll-duration', `${scrollDuration}s`);
        
        // Hide again until playback starts
        lyricsContent.classList.add('hidden');
    }

    startPlayback() {
        if (!this.songSelect.value) {
            this.updateStatus('Please select a song first');
            return;
        }

        // Setup audio if needed
        if (!this.currentSong || this.currentSong.id !== this.songSelect.value || !this.audioElement) {
            this.currentSong = this.songsData.songs.find(s => s.id === this.songSelect.value);
            console.log('Found song:', this.currentSong);
            if (this.currentSong) {
                console.log('Setting up audio for:', this.currentSong.audioFile);
                const audioSetupResult = this.setupAudio(this.songSelect.value);
                console.log('Audio setup result:', audioSetupResult);
                console.log('Audio element after setup:', this.audioElement);
                
                // Add audio looping event listener
                if (this.audioElement) {
                    this.audioElement.addEventListener('ended', () => {
                        if (this.isPlaying) {
                            console.log('Audio ended, restarting for loop');
                            this.audioElement.currentTime = 0;
                            this.audioElement.play().catch(e => console.warn('Audio restart failed:', e));
                        }
                    });
                }
            } else {
                console.error('Could not find song with ID:', this.songSelect.value);
                this.updateStatus('Error: Song not found');
                return;
            }
        }

        this.isPlaying = true;
        this.isPaused = false;
        
        // Reset pause time when starting fresh
        this.soloAnimationPauseTime = null;

        // Start audio
        console.log('Audio element:', this.audioElement);
        console.log('Audio error:', this.audioElement ? this.audioElement.error : 'No audio element');
        
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.volume = this.audioVolume;
            this.audioElement.playbackRate = this.audioSpeed;
            this.audioElement.currentTime = 0;
            console.log('Attempting to play audio...');
            this.audioElement.play()
                .then(() => {
                    console.log('Audio started playing successfully');
                })
                .catch(e => {
                    console.error('Audio play failed:', e);
                    this.updateStatus('Audio play failed, but scrolling continues');
                });
        } else {
            console.log('No audio element or audio error, playing without sound');
            if (this.audioElement && this.audioElement.error) {
                console.error('Audio element error:', this.audioElement.error);
            }
        }

        // Start scrolling animation
        this.startSoloScrolling();
        
        this.karaokeBtn.querySelector('h2').textContent = 'Pause';
        this.updateStatus('Playing...');
        console.log('Button text updated to Pause');

        //
        this.lyricsContent.classList.remove('hidden');
        this.help.classList.add('hidden');
    }

    pausePlayback() {
        this.isPlaying = false;
        this.isPaused = true;
        
        // Track when the animation was paused
        this.soloAnimationPauseTime = Date.now();
        
        // Pause audio
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.pause();
        }
        
        // Pause scrolling by stopping the animation
        const container = this.lyricsDisplay;
        const lyricsContainer = container.querySelector('.lyrics-scroll-container');
        if (lyricsContainer) {
            lyricsContainer.style.animationPlayState = 'paused';
        }
        
        // Stop interval
        if (this.soloScrollInterval) {
            clearInterval(this.soloScrollInterval);
            this.soloScrollInterval = null;
        }
        
        this.karaokeBtn.querySelector('h2').textContent = 'Play';

        this.updateStatus('Paused');
    }

    resumePlayback() {
        this.isPlaying = true;
        this.isPaused = false;
        
        // Adjust animation start time to account for pause duration
        if (this.soloAnimationStartTime && this.soloAnimationPauseTime) {
            const pauseDuration = Date.now() - this.soloAnimationPauseTime;
            this.soloAnimationStartTime += pauseDuration;
        }
        
        // Resume audio
        if (this.audioElement && !this.audioElement.error) {
            this.audioElement.play().catch(e => console.warn('Audio play failed:', e));
        }
        
        // Resume scrolling animation
        const container = this.lyricsDisplay;
        const lyricsContainer = container.querySelector('.lyrics-scroll-container');
        if (lyricsContainer) {
            lyricsContainer.style.animationPlayState = 'running';
        }
        
        // Restart interval for title tracking (but don't reset animation start time)
        this.resumeSoloScrolling();
        
        this.karaokeBtn.querySelector('h2').textContent = 'Pause';
        this.updateStatus('Playing...');
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else if (this.isPaused) {
            this.resumePlayback();
        } else {
            this.startPlayback();
        }
    }

    startSoloScrolling() {
        console.log('Starting solo scrolling');
        
        // Set animation start time
        this.soloAnimationStartTime = Date.now();
        
        // Add CSS class to trigger animation
        const container = this.lyricsDisplay;
        container.classList.add('solo-mode');
        
        // Set initial title and update current song title based on scroll position
        const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'blessing';
        const filteredLyrics = this.lyricsData.lyrics.filter(lyrics => 
            lyrics.genre?.toLowerCase() === selectedMode
        );
        this.currentLyricsTitle.textContent = filteredLyrics[0]?.title || 'Unknown Title';
        this.updateLyricsTitle();
        
        // Set up interval to track scroll progress and update title
        this.soloScrollInterval = setInterval(() => {
            this.updateLyricsTitle();
        }, 1000); // Update every second
    }

    resumeSoloScrolling() {
        console.log('Resuming solo scrolling');
        
        // Add CSS class to trigger animation (if not already present)
        const container = this.lyricsDisplay;
        container.classList.add('solo-mode');
        
        // Don't reset title - keep current position
        // Just restart the interval for title tracking
        this.soloScrollInterval = setInterval(() => {
            this.updateLyricsTitle();
        }, 1000); // Update every second
    }

    updateLyricsTitle() {
        const container = this.lyricsDisplay;
        const lyricsContainer = container.querySelector('.lyrics-scroll-container');
        
        if (!lyricsContainer || !this.currentLyricsTitle) return;
        
        // Get filtered lyrics based on current mode
        const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'blessing';
        const filteredLyrics = this.lyricsData.lyrics.filter(lyrics => 
            lyrics.genre?.toLowerCase() === selectedMode
        );
        
        // Set initial title if not playing
        if (!this.isPlaying && filteredLyrics.length > 0) {
            this.currentLyricsTitle.textContent = filteredLyrics[0].title || 'Unknown Title';
            return;
        }
        
        // Don't update during animation if no animation time set
        if (!this.soloAnimationStartTime) return;
        
        // Calculate current scroll progress based on animation time
        const animationDuration = parseFloat(container.style.getPropertyValue('--scroll-duration')) || 60;
        const animationStartTime = this.soloAnimationStartTime || Date.now();
        const elapsed = (Date.now() - animationStartTime) / 1000;
        
        // Handle looping by using modulo operation
        const cyclicProgress = (elapsed % animationDuration) / animationDuration;
        
        // Find which song section should be visible
        const lyricsSections = lyricsContainer.querySelectorAll('.lyrics-section');
        const targetSectionIndex = Math.floor(cyclicProgress * lyricsSections.length);
        const clampedIndex = Math.max(0, Math.min(targetSectionIndex, lyricsSections.length - 1));
        
        if (this.currentSoloSongIndex !== clampedIndex && filteredLyrics[clampedIndex]) {
            this.currentSoloSongIndex = clampedIndex;
            const currentLyrics = filteredLyrics[clampedIndex];
            
            this.currentLyricsTitle.textContent = currentLyrics.title || 'Unknown Title';
            
            console.log('Solo mode: Now showing', currentLyrics.title);
        }
    }

    resetSoloScroll() {
        console.log('Resetting solo scroll');
        
        // Clear interval
        if (this.soloScrollInterval) {
            clearInterval(this.soloScrollInterval);
        }
        
        // Reset animation by removing and re-adding the class
        const container = this.lyricsDisplay;
        const lyricsContainer = container.querySelector('.lyrics-scroll-container');
        
        if (lyricsContainer) {
            // Remove animation temporarily
            lyricsContainer.style.animation = 'none';
            lyricsContainer.offsetHeight; // Force reflow
            
            // Restart animation
            lyricsContainer.style.animation = '';
            this.soloAnimationStartTime = Date.now();
            this.soloAnimationPauseTime = null;
            this.currentSoloSongIndex = 0;
            
            // Restart scrolling if playing
            if (this.isPlaying) {
                this.startSoloScrolling();
            }
        }
    }

    handleSongChange() {
        // In solo mode, song selection doesn't affect the lyrics animation
        // The text continues its animation independent of the song
        console.log('Song changed to:', this.songSelect.value);
        
        // Update the current song for audio playback
        if (this.songSelect.value) {
            this.currentSong = this.songsData.songs.find(s => s.id === this.songSelect.value);
            console.log('Song changed - found song:', this.currentSong);
            
            // If currently playing, switch audio
            if (this.isPlaying && this.currentSong) {
                console.log('Currently playing, switching audio to:', this.currentSong.audioFile);
                this.setupAudio(this.songSelect.value);
                if (this.audioElement && !this.audioElement.error) {
                    // Add audio looping event listener for the new audio element
                    this.audioElement.addEventListener('ended', () => {
                        if (this.isPlaying) {
                            console.log('Audio ended, restarting for loop');
                            this.audioElement.currentTime = 0;
                            this.audioElement.play().catch(e => console.warn('Audio restart failed:', e));
                        }
                    });
                    
                    this.audioElement.volume = this.audioVolume;
                    this.audioElement.playbackRate = this.audioSpeed;
                    this.audioElement.currentTime = 0;
                    this.audioElement.play().catch(e => console.warn('Audio play failed:', e));
                }
            }
        }
        
        this.updatePlayButton();
    }

    updateStatus(message) {
        this.statusMessage.textContent = `${message}`;
    }
    
    handleModeChange(mode) {
        console.log('Mode changed to:', mode);
        
        // Store if we were playing to restart after mode change
        const wasPlaying = this.isPlaying;
        
        // Stop current playback completely
        if (this.isPlaying || this.isPaused) {
            // Stop audio
            if (this.audioElement && !this.audioElement.error) {
                this.audioElement.pause();
                this.audioElement.currentTime = 0;
            }
            
            // Clear animation interval
            if (this.soloScrollInterval) {
                clearInterval(this.soloScrollInterval);
                this.soloScrollInterval = null;
            }
            
            // Remove solo mode class to stop animation
            this.lyricsDisplay.classList.remove('solo-mode');
            
            // Reset state
            this.isPlaying = false;
            this.isPaused = false;
            this.soloAnimationStartTime = null;
            this.soloAnimationPauseTime = null;
            this.currentSoloSongIndex = 0;
        }
        
        // Apply CSS color theme
        const root = document.documentElement;
        if (mode === 'curse') {
            root.style.setProperty('--text-color', 'var(--curse-text-color)');
            root.style.setProperty('--text-darker-color', 'var(--curse-text-darker-color)');
            root.style.setProperty('--shadow-color', 'var(--curse-shadow-color)');
            root.style.setProperty('--shadow-darker-color', 'var(--curse-shadow-darker-color)');
        } else {
            root.style.setProperty('--text-color', 'var(--blessing-text-color)');
            root.style.setProperty('--text-darker-color', 'var(--blessing-text-darker-color)');
            root.style.setProperty('--shadow-color', 'var(--blessing-shadow-color)');
            root.style.setProperty('--shadow-darker-color', 'var(--blessing-shadow-darker-color)');
        }
        
        // Reload lyrics with new filter
        this.displayAllLyricsForSolo();
        
        // Update current title to first song of new mode
        if (this.lyricsData.lyrics) {
            const filteredLyrics = this.lyricsData.lyrics.filter(lyrics => 
                lyrics.genre?.toLowerCase() === mode
            );
            if (filteredLyrics.length > 0) {
                this.currentLyricsTitle.textContent = filteredLyrics[0].title || 'Unknown Title';
            }
        }
        
        // Update button text
        this.updatePlayButton();
        
        // If we were playing, restart playback with new lyrics
        if (wasPlaying && this.songSelect.value) {
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                this.startPlayback();
            }, 100);
        } else {
            this.updateStatus('Ready - Select instrumental and click Play to begin');
        }
    }
    
    setScrollSpeed(speed) {
        this.scrollRate = parseFloat(speed);
        
        // Update animation duration live if currently playing
        if (this.isPlaying) {
            const container = this.lyricsDisplay;
            const lyricsContainer = container.querySelector('.lyrics-scroll-container');
            
            if (lyricsContainer) {
                const totalHeight = lyricsContainer.scrollHeight || lyricsContainer.offsetHeight;
                const newDuration = Math.max(2, totalHeight / this.scrollRate);
                
                // Update CSS custom property for live animation speed change
                container.style.setProperty('--scroll-duration', `${newDuration}s`);
                
                console.log(`Speed updated: ${speed}px/s, new duration: ${newDuration}s`);
            }
        }
    }

    setAudioSpeed(speed) {
        this.audioSpeed = Math.max(1, Math.min(5, parseFloat(speed)));
        
        // Update the audio element if it exists
        if (this.audioElement) {
            this.audioElement.playbackRate = this.audioSpeed;
        }
        
        // Update the display value
        const valueDisplay = document.querySelector('.speed-control-value');
        if (valueDisplay) {
            valueDisplay.textContent = `${this.audioSpeed.toFixed(1)}x`;
        }
    }
}

// Initialize the solo mode player
const player = new SoloKaraokePlayer();
window.player = player; // Make available for volume controls

// Global functions for HTML onclick handlers
function handlePlayButton() {
    player.togglePlayback();
}

function setScrollSpeed(speed) {
    player.setScrollSpeed(speed);
}

function setAudioSpeed(speed) {
    player.setAudioSpeed(speed);
}