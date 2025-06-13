document.addEventListener('DOMContentLoaded', () => {
    const reelsContainer = document.getElementById('reels-container');
    const unmutePrompt = document.getElementById('unmute-prompt');
    const homeBtn = document.getElementById('home-btn');
    
    let allVideoFiles = [];
    let currentPlaylist = [];
    let currentIndex = 0;
    
    let activeReel = null;
    // NEW: Variables to hold preloaded reels
    let preloadedNextReel = null;
    let preloadedPrevReel = null;

    let isScrolling = false;
    let userInteracted = false;
    let touchStartY = 0;

    homeBtn.addEventListener('click', () => { window.location.reload(); });

    function shuffleArray(array) {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async function initialize() {
        try {
            const response = await fetch('videos.txt');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allVideoFiles = (await response.text()).split('\n').filter(name => name.trim() !== '');

            if (allVideoFiles.length > 0) {
                currentPlaylist = shuffleArray(allVideoFiles);
                currentIndex = Math.floor(Math.random() * currentPlaylist.length);
                
                // Create the first active reel (but don't set src yet)
                activeReel = createReelElement(currentPlaylist[currentIndex], true); // true = load immediately
                activeReel.classList.add('active');
                reelsContainer.appendChild(activeReel);
                playActiveVideo();

                // Preload adjacent reels
                preloadAdjacentReels();
            }

            reelsContainer.addEventListener('wheel', handleScroll, { passive: false });
            reelsContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
            reelsContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            reelsContainer.addEventListener('touchend', handleTouchEnd);
        } catch (error) {
            console.error("Could not load videos:", error);
        }
    }
    
    // CHANGED: createReelElement now takes a second argument `loadImmediately`
    function createReelElement(fileName, loadImmediately = false) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const video = document.createElement('video');
        
        video.dataset.src = `./reels/${fileName}`;
        // If it's an active video, load its source immediately.
        if (loadImmediately) {
            video.src = video.dataset.src;
        }
        
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto"; // Changed to 'auto' for better preloading

        const interactionHandler = () => { /* ... */ };
        reel.addEventListener('click', interactionHandler);
        unmutePrompt.addEventListener('click', interactionHandler, { once: true });
        
        reel.appendChild(video);
        reel.appendChild(createOverlay(fileName));
        return reel;
    }

    // NEW: Function to preload next and previous reels
    function preloadAdjacentReels() {
        // Preload next reel
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        if (nextIndex !== currentIndex) {
            preloadedNextReel = createReelElement(currentPlaylist[nextIndex], true);
        }
        
        // Preload previous reel
        const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        if (prevIndex !== currentIndex) {
            preloadedPrevReel = createReelElement(currentPlaylist[prevIndex], true);
        }
    }

    // --- Scroll Logic now uses preloaded elements ---
    function scrollDown() {
        if (!preloadedNextReel || isScrolling) return;
        isScrolling = true;
        
        const reelToAnimate = preloadedNextReel;
        
        // Update index
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        
        // Animate and update active reel
        animateToNextReel(reelToAnimate, 'down');

        // After scrolling, preload the *new* next reel
        preloadedNextReel = null;
        preloadAdjacentReels();
    }
    
    function scrollUp() {
        if (!preloadedPrevReel || isScrolling) return;
        isScrolling = true;
        
        const reelToAnimate = preloadedPrevReel;

        // Update index
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        
        animateToNextReel(reelToAnimate, 'up');

        // After scrolling, preload the *new* previous reel
        preloadedPrevReel = null;
        preloadAdjacentReels();
    }
    
    // AnimateToNextReel is simplified as the element is already created
    function animateToNextReel(newReel, direction) {
        if (direction === 'down') {
            newReel.classList.add('next');
            reelsContainer.appendChild(newReel);
        } else {
            newReel.classList.add('prev');
            reelsContainer.insertBefore(newReel, activeReel);
        }

        setTimeout(() => {
            if (direction === 'down') activeReel.classList.add('prev');
            else activeReel.classList.add('next');
            
            newReel.classList.remove('prev', 'next');
            newReel.classList.add('active');

            activeReel.querySelector('video').pause();
            activeReel = newReel;
            playActiveVideo();
        }, 50);

        setTimeout(() => {
            const oldReels = (direction === 'down') ? document.querySelectorAll('.reel.prev') : document.querySelectorAll('.reel.next');
            oldReels.forEach(r => { if (r !== activeReel) r.remove(); });
            isScrolling = false;
        }, 600);
    }
    
    function playActiveVideo() {
        if (!activeReel) return;
        const activeVideo = activeReel.querySelector('video');
        activeVideo.currentTime = 0;
        activeVideo.muted = !userInteracted;
        activeVideo.play().catch(e => console.error("Autoplay failed", e));
    }
    
    // --- Other functions (unchanged) ---
    function handleScroll(e) { e.preventDefault(); if (!isScrolling) { if (e.deltaY > 0) scrollDown(); else scrollUp(); } }
    function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
    function handleTouchMove(e) { e.preventDefault(); }
    function handleTouchEnd(e) { if (isScrolling) return; const touchEndY = e.changedTouches[0].clientY; if (touchStartY - touchEndY > 50) scrollDown(); else if (touchStartY - touchEndY < -50) scrollUp(); }
    function handleReelClick() { const video = this.querySelector('video'); if (!userInteracted) { userInteracted = true; unmutePrompt.classList.add('hidden'); document.querySelectorAll('video').forEach(v => { v.muted = false; }); video.muted = false; } else { video.muted = !video.muted; } showVolumeIcon(video); }
    function createOverlay(fileName) { /* ... same as before ... */ }
    async function shareReel(button) { /* ... same as before ... */ }
    function forceDownload(url, fileName) { /* ... same as before ... */ }
    function showVolumeIcon(video) { /* ... same as before ... */ }
    
    initialize();
});

