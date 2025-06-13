document.addEventListener('DOMContentLoaded', () => {
    const reelsContainer = document.getElementById('reels-container');
    const unmutePrompt = document.getElementById('unmute-prompt');
    const homeBtn = document.getElementById('home-btn');
    
    let allVideoFiles = [];
    let currentPlaylist = [];
    let currentIndex = 0;
    let activeReel = null;
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
                const firstVideo = currentPlaylist[currentIndex];
                activeReel = createReelElement(firstVideo);
                activeReel.classList.add('active');
                reelsContainer.appendChild(activeReel);
                playActiveVideo();
            }

            reelsContainer.addEventListener('wheel', handleScroll, { passive: false });
            reelsContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
            reelsContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            reelsContainer.addEventListener('touchend', handleTouchEnd);
        } catch (error) {
            console.error("Could not load videos:", error);
        }
    }

    // CHANGED: Lazy loading implemented here
    function createReelElement(fileName) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const video = document.createElement('video');
        
        // Don't set src immediately. Store it in a data attribute.
        video.dataset.src = `./reels/${fileName}`; 
        
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "metadata"; // Only load basic info initially

        const interactionHandler = () => { /* ... same as before ... */ };
        reel.addEventListener('click', interactionHandler);
        unmutePrompt.addEventListener('click', interactionHandler, { once: true });
        
        reel.appendChild(video);
        reel.appendChild(createOverlay(fileName));
        return reel;
    }
    
    // --- Scroll and other functions remain the same ---
    // ... (All other functions like handleScroll, scrollDown, scrollUp, animateToNextReel etc. are unchanged)
    
    // CHANGED: playActiveVideo now handles lazy loading the src
    function playActiveVideo() {
        if (!activeReel) return;
        const activeVideo = activeReel.querySelector('video');
        activeVideo.currentTime = 0;
        activeVideo.muted = !userInteracted;

        // If the video source hasn't been set yet, set it now.
        if (!activeVideo.getAttribute('src')) {
            activeVideo.src = activeVideo.dataset.src;
            // Wait for the video metadata to load before playing
            activeVideo.addEventListener('loadeddata', () => {
                activeVideo.play().catch(e => console.error("Autoplay failed", e));
            }, { once: true });
        } else {
            // If src is already set, just play
            activeVideo.play().catch(e => console.error("Autoplay failed", e));
        }
    }

    // --- All other functions from the previous version should be here ---
    // (I am including them all for a complete copy-paste solution)
    function handleReelClick() {
        const video = this.querySelector('video');
        if (!userInteracted) {
            userInteracted = true;
            unmutePrompt.classList.add('hidden');
            document.querySelectorAll('video').forEach(v => { v.muted = false; });
            video.muted = false;
        } else {
            video.muted = !video.muted;
        }
        showVolumeIcon(video);
    }
    function createOverlay(fileName) {
        const overlay = document.createElement('div');
        overlay.className = 'reel-overlay';
        overlay.innerHTML = `
            <div class="reel-info">
                <div class="username">
                    <a href="https://instagram.com/msr.sakibur" target="_blank" rel="noopener noreferrer">
                        <img src="https://i.pravatar.cc/50?u=msr.sakibur" alt="avatar">
                        msr.sakibur
                    </a>
                </div>
                <div class="caption">Yohohoho 🌚</div>
            </div>
            <div class="reel-actions">
                <div class="action-item like-btn"><i class="fa-regular fa-heart"></i><span>6.9M</span></div>
                <div class="action-item download-btn"><i class="fa-solid fa-download"></i><span>Save</span></div>
                <div class="action-item share-btn"><i class="fa-solid fa-paper-plane"></i><span class="share-text">Share</span></div>
            </div>
        `;
        const likeBtn = overlay.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const heartIcon = likeBtn.querySelector('i');
            heartIcon.classList.toggle('fa-regular');
            heartIcon.classList.toggle('fa-solid');
            heartIcon.classList.toggle('liked');
        });
        const downloadBtn = overlay.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            forceDownload(`./reels/${fileName}`, fileName);
        });
        const shareBtn = overlay.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareReel(shareBtn);
        });
        return overlay;
    }
    function handleScroll(e) { e.preventDefault(); if (!isScrolling) { if (e.deltaY > 0) scrollDown(); else scrollUp(); } }
    function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
    function handleTouchMove(e) { e.preventDefault(); }
    function handleTouchEnd(e) { if (isScrolling) return; const touchEndY = e.changedTouches[0].clientY; if (touchStartY - touchEndY > 50) scrollDown(); else if (touchStartY - touchEndY < -50) scrollUp(); }
    function scrollDown() {
        isScrolling = true;
        let nextVideoFile;
        if (currentIndex >= currentPlaylist.length - 1) {
            const lastVideoOfOldPlaylist = currentPlaylist[currentIndex];
            let newPlaylist = shuffleArray(allVideoFiles);
            if (newPlaylist[0] === lastVideoOfOldPlaylist && newPlaylist.length > 1) {
                [newPlaylist[0], newPlaylist[newPlaylist.length - 1]] = [newPlaylist[newPlaylist.length - 1], newPlaylist[0]];
            }
            currentPlaylist = newPlaylist;
            currentIndex = 0;
            nextVideoFile = currentPlaylist[currentIndex];
        } else {
            currentIndex++;
            nextVideoFile = currentPlaylist[currentIndex];
        }
        animateToNextReel(nextVideoFile, 'down');
    }
    function scrollUp() {
        if (currentIndex <= 0) { isScrolling = false; return; }
        isScrolling = true;
        currentIndex--;
        const prevVideoFile = currentPlaylist[currentIndex];
        animateToNextReel(prevVideoFile, 'up');
    }
    function animateToNextReel(fileName, direction) {
        const newReel = createReelElement(fileName);
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
    async function shareReel(button) { /* ... same as before ... */ }
    function forceDownload(url, fileName) { /* ... same as before ... */ }
    function showVolumeIcon(video) { /* ... same as before ... */ }

    // Initial load
    initialize();
});
