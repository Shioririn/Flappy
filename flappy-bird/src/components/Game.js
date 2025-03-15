import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/Game.css';

// Import sounds directly
import jumpSoundFile from '../sounds/boing.mp3';
import celebrationSoundFile from '../sounds/celebration.mp3';
import powerUpSoundFile from '../sounds/powerup.mp3';

// Physics constants
const GRAVITY_UP = 0.2;             // Upward gravity
const GRAVITY_DOWN = 0.25;          // Downward gravity
const JUMP_FORCE = -3.6;            // Initial jump force (reduced by 20%)
const JUMP_BOOST_FRAMES = 2;        // Number of boost frames
const JUMP_BOOST_FORCE = -0.64;     // Additional boost per frame (reduced by 20%)
const MAX_VELOCITY_UP = -6.5;       // Maximum upward velocity
const MAX_VELOCITY_DOWN = 7;        // Maximum downward velocity
const PIPE_SPEED = 2;               // Pipe movement speed
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const MIN_POWER_UP_OFFSET = 50;     // Minimum horizontal distance from pipe
const MAX_POWER_UP_OFFSET = 150;    // Maximum horizontal distance from pipe
const POWER_UP_MARGIN = 20;         // Minimum distance from edges
const POWER_UP_VERTICAL_RANGE = 100; // How far above/below pipe gap power-ups can spawn
const MIN_SCREEN_MARGIN = 30;       // Minimum distance from screen top/bottom

// Animal emoji options
const ANIMAL_EMOJIS = ['🐦', '🦊', '🐸', '🐱', '🐰', '🦁', '🐼', '🐨', '🦄'];
const CELEBRATION_EMOJIS = ['👏', '🎉', '🎊', '🥳', '🎈', '✨', '🏆'];

// Pipe styles
const PIPE_STYLES = ['classic', 'metal', 'bamboo', 'crystal'];

// Add power-up emojis constant
const POWER_UP_EMOJIS = {
    classic: '☀️',
    bamboo: '🍃',
    crystal: '❄️',
    metal: '⚡'
};

const Game = () => {
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(
        parseInt(localStorage.getItem('highScore')) || 0
    );
    const [birdPosition, setBirdPosition] = useState(250);
    const [birdVelocity, setBirdVelocity] = useState(0);
    const [boostFramesLeft, setBoostFramesLeft] = useState(0);
    const [pipes, setPipes] = useState([]);
    const [leaderboard, setLeaderboard] = useState(
        JSON.parse(localStorage.getItem('leaderboard')) || []
    );
    const [showNameInput, setShowNameInput] = useState(false);
    const [playerName, setPlayerName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('');
    const [emojiOptions, setEmojiOptions] = useState([]);
    const [clouds, setClouds] = useState([
        { id: 1, x: Math.random() * 800, y: Math.random() * 200 },
        { id: 2, x: Math.random() * 800, y: Math.random() * 200 },
        { id: 3, x: Math.random() * 800, y: Math.random() * 200 },
    ]);
    const [trees, setTrees] = useState([
        { id: 1, x: Math.random() * 800, height: 200 + Math.random() * 100 },
        { id: 2, x: Math.random() * 800, height: 200 + Math.random() * 100 },
        { id: 3, x: Math.random() * 800, height: 200 + Math.random() * 100 },
        { id: 4, x: Math.random() * 800, height: 200 + Math.random() * 100 },
    ]);
    const [gears, setGears] = useState([
        { id: 1, x: 100, y: 100, size: 60 + Math.random() * 40, speed: 1 },
        { id: 2, x: 200, y: 300, size: 60 + Math.random() * 40, speed: -1 },
        { id: 3, x: 600, y: 150, size: 60 + Math.random() * 40, speed: 1 },
        { id: 4, x: 700, y: 400, size: 60 + Math.random() * 40, speed: -1 },
    ]);
    const [snowflakes, setSnowflakes] = useState(
        Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 800,
            y: Math.random() * 500,
            size: 2 + Math.random() * 4,
            speed: 1 + Math.random() * 2,
            sway: Math.random() * 2 - 1,
        }))
    );
    const [celebrationEmojis, setCelebrationEmojis] = useState([]);
    const [showCelebration, setShowCelebration] = useState(false);
    const [highScoreHandled, setHighScoreHandled] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [volume, setVolume] = useState(parseInt(localStorage.getItem('gameVolume')) || 50);
    const [pipeStyle, setPipeStyle] = useState('classic');
    const [themePreference, setThemePreference] = useState(localStorage.getItem('themePreference') || 'random');
    const lastStyleRef = useRef('classic');

    // Sound refs with fallback handling
    const jumpSoundRef = useRef(null);
    const celebrationSoundRef = useRef(null);
    const powerUpSoundRef = useRef(null);
    const [soundEnabled, setSoundEnabled] = useState(false);

    // Add timeoutRef to store celebration timeout
    const celebrationTimeoutRef = useRef(null);

    // Add new state for leaderboard visibility
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Clean up power-up timer on unmount and game over
    useEffect(() => {
        return () => {
            if (celebrationTimeoutRef.current) {
                clearTimeout(celebrationTimeoutRef.current);
            }
        };
    }, []);

    // Play sound with error handling and volume control
    const playSound = useCallback((soundRef) => {
        console.log('Attempting to play sound:', {
            soundEnabled,
            hasRef: !!soundRef,
            hasAudio: !!(soundRef && soundRef.current)
        });
        
        if (soundEnabled && soundRef && soundRef.current) {
            try {
                soundRef.current.currentTime = 0;
                soundRef.current.volume = volume / 100; // Use volume state
                const playPromise = soundRef.current.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Audio play error:", error);
                        soundRef.current.load();
                    });
                }
            } catch (error) {
                console.error("Error playing sound:", error);
                console.error("Sound ref state:", {
                    current: !!soundRef.current,
                    readyState: soundRef.current ? soundRef.current.readyState : 'N/A'
                });
            }
        }
    }, [soundEnabled, volume]);

    // Get random style excluding last used
    const getRandomStyle = useCallback(() => {
        if (themePreference !== 'random') {
            return themePreference;
        }
        const availableStyles = PIPE_STYLES.filter(style => style !== lastStyleRef.current);
        const newStyle = availableStyles[Math.floor(Math.random() * availableStyles.length)];
        lastStyleRef.current = newStyle;
        return newStyle;
    }, [themePreference]);

    // Handle bird jump
    const handleJump = useCallback(() => {
        if (!gameStarted && selectedEmoji) {
            setGameStarted(true);
            setBirdVelocity(0);
            setBirdPosition(250);
            // Set random pipe style excluding last used
            const newStyle = getRandomStyle();
            setPipeStyle(newStyle);
            // Initialize with first pipe and properly positioned power-up
            const initialPipeHeight = Math.random() * 180 + 120;
            // Generate random horizontal offset
            const randomHorizontalOffset = MIN_POWER_UP_OFFSET + Math.random() * (MAX_POWER_UP_OFFSET - MIN_POWER_UP_OFFSET);
            
            // Calculate vertical position with extended range
            let powerUpY;
            const random = Math.random();
            if (random < 0.6) { // 60% chance to be in the gap
                const safeGapRange = PIPE_GAP - (2 * POWER_UP_MARGIN);
                powerUpY = initialPipeHeight + POWER_UP_MARGIN + (Math.random() * safeGapRange);
            } else { // 40% chance to be above or below
                if (Math.random() < 0.5) { // Above the gap
                    const minY = MIN_SCREEN_MARGIN;
                    const maxY = Math.max(minY, initialPipeHeight - POWER_UP_VERTICAL_RANGE);
                    powerUpY = minY + (Math.random() * (maxY - minY));
                } else { // Below the gap
                    const minY = initialPipeHeight + PIPE_GAP;
                    const maxY = Math.min(500 - MIN_SCREEN_MARGIN, minY + POWER_UP_VERTICAL_RANGE);
                    powerUpY = minY + (Math.random() * (maxY - minY));
                }
            }
            
            setPipes([
                {
                    x: 800,
                    height: initialPipeHeight,
                    passed: false,
                    hasPowerUp: true,
                    powerUpOffset: randomHorizontalOffset,
                    powerUpY: powerUpY
                }
            ]);
            setBoostFramesLeft(0);
            setScore(0);
        } else if (gameStarted && !gameOver) {
            if (birdPosition > 20) {
                playSound(jumpSoundRef);
                setBirdVelocity(JUMP_FORCE);
                setBoostFramesLeft(JUMP_BOOST_FRAMES);
            }
        }
    }, [gameStarted, gameOver, selectedEmoji, birdPosition, playSound, getRandomStyle]);

    // Initialize sounds with more debug info
    useEffect(() => {
        // Create audio context on first user interaction
        const initializeAudio = () => {
            console.log('Initializing audio with direct imports...');
            
            try {
                // Create new Audio objects with direct imports
                const jumpAudio = new Audio(jumpSoundFile);
                const celebrationAudio = new Audio(celebrationSoundFile);
                const powerUpAudio = new Audio(powerUpSoundFile);

                console.log('Audio objects created:', {
                    jumpAudio: !!jumpAudio,
                    celebrationAudio: !!celebrationAudio,
                    powerUpAudio: !!powerUpAudio,
                    powerUpPath: powerUpSoundFile
                });

                // Set initial volume
                jumpAudio.volume = volume / 100;
                celebrationAudio.volume = volume / 100;
                powerUpAudio.volume = volume / 100;

                // Preload the audio
                jumpAudio.preload = 'auto';
                celebrationAudio.preload = 'auto';
                powerUpAudio.preload = 'auto';

                // Add load event listeners
                powerUpAudio.addEventListener('loadeddata', () => {
                    console.log('Power-up sound loaded successfully');
                });

                powerUpAudio.addEventListener('error', (e) => {
                    console.error('Power-up sound load error:', e);
                });

                // Store the audio objects
                jumpSoundRef.current = jumpAudio;
                celebrationSoundRef.current = celebrationAudio;
                powerUpSoundRef.current = powerUpAudio;

                // Enable sound after a user interaction
                setSoundEnabled(true);
                console.log('Sound initialization complete');
                
                // Remove the event listeners
                document.removeEventListener('click', initializeAudio);
                document.removeEventListener('keydown', initializeAudio);
            } catch (error) {
                console.error('Error in audio initialization:', error);
            }
        };

        // Add event listeners for user interaction
        document.addEventListener('click', initializeAudio);
        document.addEventListener('keydown', initializeAudio);

        return () => {
            document.removeEventListener('click', initializeAudio);
            document.removeEventListener('keydown', initializeAudio);
        };
    }, [volume]);

    // Initialize emoji options
    useEffect(() => {
        if (!selectedEmoji) {
            const shuffled = [...ANIMAL_EMOJIS].sort(() => 0.5 - Math.random());
            setEmojiOptions(shuffled.slice(0, 3));
        }
    }, [selectedEmoji]);

    // Handle name submission
    const handleNameSubmit = (e) => {
        e.preventDefault();
        const newLeaderboard = [...leaderboard, { name: playerName, score, emoji: selectedEmoji }]
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
        
        setLeaderboard(newLeaderboard);
        localStorage.setItem('leaderboard', JSON.stringify(newLeaderboard));
        setShowNameInput(false);
        setPlayerName('');
        setHighScoreHandled(true);
        
        // Start celebration
        setShowCelebration(true);
        setCelebrationEmojis(generateCelebrationEmojis());
        
        // Play celebration sound
        playSound(celebrationSoundRef);
        
        // Clear any existing timeout
        if (celebrationTimeoutRef.current) {
            clearTimeout(celebrationTimeoutRef.current);
        }
        
        // Store the new timeout
        celebrationTimeoutRef.current = setTimeout(() => {
            setShowCelebration(false);
            setCelebrationEmojis([]);
            setGameOver(true);
            celebrationTimeoutRef.current = null;
        }, 3000);
    };

    // Handle game restart
    const handleRestart = () => {
        // Clear any pending celebration timeout
        if (celebrationTimeoutRef.current) {
            clearTimeout(celebrationTimeoutRef.current);
            celebrationTimeoutRef.current = null;
        }

        // Reset all game states synchronously
        setGameStarted(false);
        setGameOver(false);
        setScore(0);
        setBirdPosition(250);
        setBirdVelocity(0);
        setBoostFramesLeft(0);
        setPipes([]);
        setShowNameInput(false);
        setPlayerName('');
        setShowCelebration(false);
        setCelebrationEmojis([]);
        setHighScoreHandled(false);  // Reset the flag
        
        // Reset and reinitialize sound elements
        if (jumpSoundRef.current) {
            try {
                jumpSoundRef.current.currentTime = 0;
                jumpSoundRef.current.pause();
                jumpSoundRef.current.load();
            } catch (error) {
                console.error('Error resetting jump sound:', error);
            }
        }
        if (celebrationSoundRef.current) {
            try {
                celebrationSoundRef.current.currentTime = 0;
                celebrationSoundRef.current.pause();
                celebrationSoundRef.current.load();
            } catch (error) {
                console.error('Error resetting celebration sound:', error);
            }
        }
        if (powerUpSoundRef.current) {
            try {
                powerUpSoundRef.current.currentTime = 0;
                powerUpSoundRef.current.pause();
                powerUpSoundRef.current.load();
                console.log('Power-up sound reset successfully');
            } catch (error) {
                console.error('Error resetting power-up sound:', error);
            }
        }
    };

    // Handle player change
    const handleChangePlayer = () => {
        handleRestart();  // This will also reset highScoreHandled
        setSelectedEmoji('');
    };

    // Generate random celebration emojis
    const generateCelebrationEmojis = () => {
        const emojis = [];
        for (let i = 0; i < 30; i++) {
            emojis.push({
                id: i,
                emoji: CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)],
                x: Math.random() * 800,
                y: Math.random() * 500,
                scale: 0.5 + Math.random() * 1.5,
                rotation: Math.random() * 360,
            });
        }
        return emojis;
    };

    // Update clouds position
    useEffect(() => {
        if (gameStarted && !gameOver) {
            const interval = setInterval(() => {
                // Update clouds (only in classic theme)
                if (pipeStyle === 'classic') {
                    setClouds(prevClouds => 
                        prevClouds.map(cloud => ({
                            ...cloud,
                            x: cloud.x <= -100 ? 900 : cloud.x - 1
                        }))
                    );
                }

                // Update trees (only in bamboo theme)
                if (pipeStyle === 'bamboo') {
                    setTrees(prevTrees => 
                        prevTrees.map(tree => ({
                            ...tree,
                            x: tree.x <= -50 ? 850 : tree.x - 1.5
                        }))
                    );
                }

                // Update gears (only in metal theme)
                if (pipeStyle === 'metal') {
                    setGears(prevGears => 
                        prevGears.map(gear => ({
                            ...gear,
                            rotation: (gear.rotation || 0) + gear.speed
                        }))
                    );
                }

                // Update snowflakes (only in crystal theme)
                if (pipeStyle === 'crystal') {
                    setSnowflakes(prevSnowflakes => 
                        prevSnowflakes.map(flake => ({
                            ...flake,
                            y: flake.y >= 500 ? 0 : flake.y + flake.speed,
                            x: flake.x + flake.sway,
                            sway: flake.x <= 0 || flake.x >= 800 ? -flake.sway : flake.sway
                        }))
                    );
                }
            }, 16);
            return () => clearInterval(interval);
        }
    }, [gameStarted, gameOver, pipeStyle]);

    // Collision detection helper - moved before game loop
    const checkCollision = useCallback((rect1, rect2) => {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }, []);

    // Handle power-up collection
    const handlePowerUpCollection = useCallback((pipe, powerUpX, powerUpY) => {
        setFlashingPowerUp({
            x: powerUpX,
            y: powerUpY,
            type: pipeStyle
        });
        
        // Add debug logging for power-up sound
        console.log('Power-up collected, attempting to play sound:', {
            hasRef: !!powerUpSoundRef,
            hasAudio: !!(powerUpSoundRef && powerUpSoundRef.current),
            soundEnabled,
            volume
        });
        
        // Play power-up sound with additional error handling
        if (powerUpSoundRef.current) {
            try {
                powerUpSoundRef.current.currentTime = 0;
                powerUpSoundRef.current.volume = volume / 100;
                console.log('Playing power-up sound...');
                const playPromise = powerUpSoundRef.current.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Power-up sound played successfully');
                        })
                        .catch(error => {
                            console.error("Power-up sound play error:", error);
                            // Try to reload and play again
                            powerUpSoundRef.current.load();
                            powerUpSoundRef.current.play().catch(e => 
                                console.error("Second attempt failed:", e)
                            );
                        });
                }
            } catch (error) {
                console.error("Error playing power-up sound:", error);
            }
        } else {
            console.error("Power-up sound ref not initialized");
        }
        
        // Remove flash effect after animation
        setTimeout(() => {
            setFlashingPowerUp(null);
        }, 300);
        
        // Add score
        setScore(s => s + 2);
    }, [pipeStyle, powerUpSoundRef, soundEnabled, volume]);

    // Game loop
    useEffect(() => {
        let gameLoop;
        if (gameStarted && !gameOver && selectedEmoji) {
            gameLoop = setInterval(() => {
                // Apply boost if we have boost frames left
                if (boostFramesLeft > 0) {
                    setBirdVelocity(prev => prev + JUMP_BOOST_FORCE);
                    setBoostFramesLeft(prev => prev - 1);
                }
                
                // Update bird velocity with asymmetric gravity
                setBirdVelocity(prevVelocity => {
                    const currentGravity = prevVelocity < 0 ? GRAVITY_UP : GRAVITY_DOWN;
                    return Math.max(MAX_VELOCITY_UP, Math.min(MAX_VELOCITY_DOWN, prevVelocity + currentGravity));
                });

                // Update bird position
                setBirdPosition(prevPosition => {
                    const newPosition = prevPosition + birdVelocity;
                    if (newPosition > 485 || newPosition < 15) {
                        setGameOver(true);
                        return prevPosition;
                    }
                    return Math.max(15, Math.min(485, newPosition));
                });

                // Update pipes and power-ups
                setPipes(prevPipes => {
                    const movedPipes = prevPipes.map(pipe => ({
                        ...pipe,
                        x: pipe.x - PIPE_SPEED
                    }));

                    const filteredPipes = movedPipes.filter(pipe => pipe.x > -PIPE_WIDTH);

                    // Add new pipes
                    if (filteredPipes.length < 2) {
                        const lastPipe = filteredPipes[filteredPipes.length - 1];
                        if (!lastPipe || lastPipe.x < 400) {
                            const height = Math.random() * 180 + 120;
                            // Generate random horizontal offset
                            const randomHorizontalOffset = MIN_POWER_UP_OFFSET + Math.random() * (MAX_POWER_UP_OFFSET - MIN_POWER_UP_OFFSET);
                            
                            // Calculate vertical position with extended range
                            let powerUpY;
                            const random = Math.random();
                            if (random < 0.6) { // 60% chance to be in the gap
                                const safeGapRange = PIPE_GAP - (2 * POWER_UP_MARGIN);
                                powerUpY = height + POWER_UP_MARGIN + (Math.random() * safeGapRange);
                            } else { // 40% chance to be above or below
                                if (Math.random() < 0.5) { // Above the gap
                                    const minY = MIN_SCREEN_MARGIN;
                                    const maxY = Math.max(minY, height - POWER_UP_VERTICAL_RANGE);
                                    powerUpY = minY + (Math.random() * (maxY - minY));
                                } else { // Below the gap
                                    const minY = height + PIPE_GAP;
                                    const maxY = Math.min(500 - MIN_SCREEN_MARGIN, minY + POWER_UP_VERTICAL_RANGE);
                                    powerUpY = minY + (Math.random() * (maxY - minY));
                                }
                            }
                            
                            filteredPipes.push({
                                x: 800,
                                height,
                                passed: false,
                                hasPowerUp: true,
                                powerUpOffset: randomHorizontalOffset,
                                powerUpY: powerUpY
                            });
                        }
                    }

                    // Check collisions
                    filteredPipes.forEach(pipe => {
                        const birdRight = 170;
                        const birdLeft = 150;
                        const birdVerticalSize = 20;
                        
                        // Check pipe collision
                        if (
                            !pipe.passed &&
                            pipe.x < birdRight &&
                            pipe.x + PIPE_WIDTH > birdLeft &&
                            (birdPosition < pipe.height - 2 ||
                             birdPosition + birdVerticalSize > pipe.height + PIPE_GAP + 2)
                        ) {
                            setGameOver(true);
                        }
                        
                        // Check power-up collision
                        if (pipe.hasPowerUp && !pipe.powerUpCollected) {
                            const powerUpX = pipe.x + PIPE_WIDTH + pipe.powerUpOffset;
                            const birdRect = {
                                x: birdLeft,
                                y: birdPosition,
                                width: 20,
                                height: 20
                            };
                            
                            const powerUpRect = {
                                x: powerUpX,
                                y: pipe.powerUpY - 15,
                                width: 30,
                                height: 30
                            };
                            
                            if (checkCollision(birdRect, powerUpRect)) {
                                pipe.powerUpCollected = true;
                                handlePowerUpCollection(pipe, powerUpX, pipe.powerUpY);
                            }
                        }
                        
                        if (!pipe.passed && pipe.x < 40) {
                            pipe.passed = true;
                            setScore(s => {
                                const newScore = s + 1;
                                if (newScore > highScore) {
                                    setHighScore(newScore);
                                    localStorage.setItem('highScore', newScore);
                                }
                                return newScore;
                            });
                        }
                    });

                    return filteredPipes;
                });
            }, 16);
        }
        return () => {
            if (gameLoop) {
                clearInterval(gameLoop);
            }
        };
    }, [gameStarted, gameOver, selectedEmoji, birdVelocity, boostFramesLeft, highScore, birdPosition, checkCollision, handlePowerUpCollection]);

    // Check if score qualifies for leaderboard
    useEffect(() => {
        if (gameOver && !showNameInput && !showCelebration && !highScoreHandled) {
            const lowestScore = leaderboard.length === 3 ? leaderboard[2].score : 0;
            if (leaderboard.length < 3 || score > lowestScore) {
                setShowNameInput(true);
            }
        }
    }, [gameOver, score, leaderboard, showNameInput, showCelebration, highScoreHandled]);

    // Handle keyboard controls
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.code === 'Space') {
                handleJump();
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [handleJump]);

    // Handle volume change
    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        localStorage.setItem('gameVolume', newVolume);
    };

    // Handle theme change
    const handleThemeChange = (theme) => {
        setThemePreference(theme);
        localStorage.setItem('themePreference', theme);
        if (theme !== 'random') {
            setPipeStyle(theme);
        }
    };

    const [flashingPowerUp, setFlashingPowerUp] = useState(null);

    return (
        <div className="game-container">
            <div className={`game game-${pipeStyle}`} onClick={handleJump}>
                {/* Settings Button */}
                <button 
                    className="settings-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowSettings(!showSettings);
                    }}
                >
                    ⚙️
                </button>

                {/* Settings Panel */}
                {showSettings && (
                    <div 
                        className="settings-panel"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3>Settings</h3>
                        {/* Volume Control */}
                        <div className="settings-section">
                            <h4>Volume</h4>
                            <div className="volume-control">
                                <label htmlFor="volume">Volume: {volume}%</label>
                                <input
                                    type="range"
                                    id="volume"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                />
                            </div>
                        </div>
                        
                        {/* Theme Selection */}
                        <div className="settings-section">
                            <h4>Theme</h4>
                            <div className="theme-options">
                                <button 
                                    className={`theme-button ${themePreference === 'random' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('random')}
                                >
                                    🎲
                                </button>
                                <button 
                                    className={`theme-button ${themePreference === 'classic' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('classic')}
                                >
                                    ☀️
                                </button>
                                <button 
                                    className={`theme-button ${themePreference === 'metal' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('metal')}
                                >
                                    ⚡
                                </button>
                                <button 
                                    className={`theme-button ${themePreference === 'bamboo' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('bamboo')}
                                >
                                    🍃
                                </button>
                                <button 
                                    className={`theme-button ${themePreference === 'crystal' ? 'active' : ''}`}
                                    onClick={() => handleThemeChange('crystal')}
                                >
                                    ❄️
                                </button>
                            </div>
                        </div>
                        
                        <button 
                            className="close-settings"
                            onClick={() => setShowSettings(false)}
                        >
                            Close
                        </button>
                    </div>
                )}

                {/* Background Elements */}
                {pipeStyle === 'classic' && clouds.map(cloud => (
                    <div
                        key={cloud.id}
                        className="cloud"
                        style={{ left: cloud.x, top: cloud.y }}
                    />
                ))}

                {pipeStyle === 'bamboo' && trees.map(tree => (
                    <div
                        key={tree.id}
                        className="tree"
                        style={{ 
                            left: tree.x,
                            '--tree-height': `${tree.height}px`,
                            '--tree-width': `${tree.height * 0.6}px`
                        }}
                    >
                        <span></span>
                        <div className="trunk"></div>
                    </div>
                ))}

                {pipeStyle === 'metal' && gears.map(gear => (
                    <div
                        key={gear.id}
                        className="gear"
                        style={{ 
                            left: gear.x,
                            top: gear.y,
                            '--gear-size': `${gear.size}px`,
                            transform: `rotate(${gear.rotation || 0}deg)`
                        }}
                    />
                ))}

                {pipeStyle === 'crystal' && snowflakes.map(flake => (
                    <div
                        key={flake.id}
                        className="snowflake"
                        style={{ 
                            left: flake.x,
                            top: flake.y,
                            width: flake.size,
                            height: flake.size
                        }}
                    />
                ))}

                {/* Celebration emojis */}
                {showCelebration && celebrationEmojis.map(emoji => (
                    <div
                        key={emoji.id}
                        className="celebration-emoji"
                        style={{
                            left: emoji.x,
                            top: emoji.y,
                            transform: `scale(${emoji.scale}) rotate(${emoji.rotation}deg)`,
                        }}
                    >
                        {emoji.emoji}
                    </div>
                ))}
                
                {/* Game elements */}
                {!gameStarted && !selectedEmoji && (
                    <div className="emoji-selection">
                        <h2>Choose your character:</h2>
                        <div className="emoji-options">
                            {emojiOptions.map((emoji, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedEmoji(emoji)}
                                    className="emoji-button"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {!gameStarted && selectedEmoji && (
                    <div className="start-message">Click or press Space to start</div>
                )}
                
                {gameOver && !showNameInput && (
                    <div className="game-over">
                        <p>Game Over! Score: {score}</p>
                        <div className="game-over-buttons">
                            <button onClick={handleRestart} className="restart-button">
                                Play Again
                            </button>
                            <button onClick={handleChangePlayer} className="change-player-button">
                                Change Player
                            </button>
                            <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="leaderboard-button">
                                {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
                            </button>
                        </div>
                    </div>
                )}
                
                {showNameInput && (
                    <div className="name-input-container">
                        <p>New High Score! Enter your name:</p>
                        <form onSubmit={handleNameSubmit}>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                maxLength={15}
                                required
                                autoFocus
                            />
                            <button type="submit">Submit</button>
                        </form>
                    </div>
                )}
                
                <div 
                    className={`bird`}
                    style={{
                        top: birdPosition,
                    }}
                >
                    {selectedEmoji}
                </div>
                
                {pipes.map((pipe, index) => (
                    <React.Fragment key={index}>
                        <div
                            className={`pipe top pipe-${pipeStyle}`}
                            style={{
                                height: pipe.height,
                                left: pipe.x,
                            }}
                        />
                        <div
                            className={`pipe bottom pipe-${pipeStyle}`}
                            style={{
                                height: 500 - pipe.height - PIPE_GAP,
                                left: pipe.x,
                                top: pipe.height + PIPE_GAP,
                            }}
                        />
                        {pipe.hasPowerUp && !pipe.powerUpCollected && (
                            <div
                                className="power-up"
                                style={{
                                    left: pipe.x + PIPE_WIDTH + pipe.powerUpOffset,
                                    top: pipe.powerUpY - 15,
                                }}
                            >
                                {POWER_UP_EMOJIS[pipeStyle]}
                            </div>
                        )}
                    </React.Fragment>
                ))}
                
                {/* Flash effect for collected power-up */}
                {flashingPowerUp && (
                    <div
                        className="power-up power-up-flash"
                        style={{
                            left: flashingPowerUp.x,
                            top: flashingPowerUp.y,
                        }}
                    >
                        {POWER_UP_EMOJIS[flashingPowerUp.type]}
                    </div>
                )}
                
                <div className="score">Score: {score}</div>
                <div className="high-score">High Score: {highScore}</div>
            </div>
            
            {/* Leaderboard */}
            {showLeaderboard && (
                <div className="leaderboard">
                    <h2>Top 3 Players</h2>
                    {leaderboard.map((entry, index) => (
                        <div key={index} className="leaderboard-entry">
                            <span className="player-emoji">{entry.emoji}</span>
                            <span className="player-name">{entry.name}</span>
                            <span className="player-score">{entry.score}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Game; 