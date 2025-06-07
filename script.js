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

    // Home button reloads the page
    homeBtn.addEventListener('click', () => {
        window.location.reload();
    });

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

    function createReelElement(fileName) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const video = document.createElement('video');
        video.src = `./reels/${fileName}`;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        
        // Use prompt for first interaction, then manage sound
        const interactionHandler = () => {
            if (!userInteracted) {
                userInteracted = true;
                unmutePrompt.classList.add('hidden');
                document.querySelectorAll('video').forEach(v => { v.muted = false; });
                video.muted = false; // Ensure the first clicked video is unmuted
            } else {
                video.muted = !video.muted;
            }
            showVolumeIcon(video);
        };
        
        reel.addEventListener('click', interactionHandler);
        unmutePrompt.addEventListener('click', interactionHandler, { once: true });

        reel.appendChild(video);
        reel.appendChild(createOverlay(fileName));
        return reel;
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
                <div class="action-item comment-icon"><i class="fa-solid fa-comment-dots"></i><span>345K</span></div>
                <div class="action-item share-btn"><i class="fa-solid fa-paper-plane"></i><span class="share-text">Share</span></div>
            </div>
        `;

        const likeBtn = overlay.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent reel click event
            const heartIcon = likeBtn.querySelector('i');
            heartIcon.classList.toggle('fa-regular'); // Switch between regular and solid
            heartIcon.classList.toggle('fa-solid');
            heartIcon.classList.toggle('liked'); // Add red color
        });

        const shareBtn = overlay.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            shareReel(shareBtn);
        });

        return overlay;
    }

    // --- All other functions (scroll, animate, helpers) remain the same ---
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
    function playActiveVideo() {
        if (!activeReel) return;
        const activeVideo = activeReel.querySelector('video');
        activeVideo.currentTime = 0;
        activeVideo.muted = !userInteracted;
        activeVideo.play().catch(e => console.error("Autoplay failed", e));
    }
    async function shareReel(button) {
        const shareText = button.querySelector('.share-text');
        // Use hardcoded link as requested
        const shareUrl = 'https://msrofficial.github.io/slaygirls';
        const shareData = { title: 'Check out this Reel!', text: 'Yohohoho 🌚', url: shareUrl };

        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) { console.error("Share failed:", err); }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                const originalText = shareText.textContent;
                shareText.textContent = 'Copied!';
                setTimeout(() => { shareText.textContent = originalText; }, 2000);
            } catch (err) { console.error('Failed to copy link:', err); }
        }
    }
    function showVolumeIcon(video) {
        let volumeIcon = video.parentElement.querySelector('.volume-icon');
        if (!volumeIcon) {
            volumeIcon = document.createElement('i');
            volumeIcon.className = 'volume-icon';
            video.parentElement.appendChild(volumeIcon);
        }
        volumeIcon.className = `volume-icon fa-solid ${video.muted ? 'fa-volume-xmark' : 'fa-volume-high'}`;
        volumeIcon.style.opacity = 1;
        setTimeout(() => { volumeIcon.style.opacity = 0; }, 800);
    }
    
    initialize();
});
