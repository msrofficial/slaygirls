document.addEventListener('DOMContentLoaded', () => {
    const reelsContainer = document.getElementById('reels-container');
    const unmutePrompt = document.getElementById('unmute-prompt');
    const homeBtn = document.getElementById('home-btn');
    
    let allVideoFiles = [];
    let currentPlaylist = [];
    let currentIndex = 0;
    
    let activeReel = null;
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
                
                activeReel = createReelElement(currentPlaylist[currentIndex], true);
                activeReel.classList.add('active');
                reelsContainer.appendChild(activeReel);
                playActiveVideo();

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
    
    function createReelElement(fileName, loadImmediately = false) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const video = document.createElement('video');
        
        video.dataset.src = `./reels/${fileName}`;
        if (loadImmediately) {
            video.src = video.dataset.src;
        }
        
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";

        reel.addEventListener('click', handleReelClick);
        unmutePrompt.addEventListener('click', handleReelClick, { once: true });
        
        reel.appendChild(video);
        reel.appendChild(createOverlay(fileName)); // This will now work correctly
        return reel;
    }

    function preloadAdjacentReels() {
        if (allVideoFiles.length < 2) return;
        
        // Preload next reel
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        preloadedNextReel = createReelElement(currentPlaylist[nextIndex], true);
        
        // Preload previous reel
        const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        preloadedPrevReel = createReelElement(currentPlaylist[prevIndex], true);
    }

    function scrollDown() {
        if (!preloadedNextReel || isScrolling) return;
        isScrolling = true;
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        animateToNextReel(preloadedNextReel, 'down');
        preloadAdjacentReels();
    }
    
    function scrollUp() {
        if (!preloadedPrevReel || isScrolling) return;
        isScrolling = true;
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        animateToNextReel(preloadedPrevReel, 'up');
        preloadAdjacentReels();
    }
    
    function animateToNextReel(newReel, direction) {
        if (direction === 'down') {
            newReel.classList.add('next');
            reelsContainer.appendChild(newReel);
        } else {
            newReel.classList.add('prev');
            reelsContainer.insertBefore(newReel, activeReel);
        }
        setTimeout(() => {
            activeReel.classList.add(direction === 'down' ? 'prev' : 'next');
            newReel.classList.remove('prev', 'next');
            newReel.classList.add('active');
            activeReel.querySelector('video').pause();
            activeReel = newReel;
            playActiveVideo();
        }, 50);
        setTimeout(() => {
            const oldReels = document.querySelectorAll(`.reel.${direction === 'down' ? 'prev' : 'next'}`);
            oldReels.forEach(r => { if (r !== activeReel) r.remove(); });
            isScrolling = false;
        }, 600);
    }
    
    function playActiveVideo() {
        if (!activeReel) return;
        const activeVideo = activeReel.querySelector('video');
        activeVideo.currentTime = 0;
        activeVideo.muted = !userInteracted;
        if (!activeVideo.src) {
            activeVideo.src = activeVideo.dataset.src;
        }
        activeVideo.play().catch(e => console.error("Autoplay failed", e));
    }
    
    // --- Helper functions (Now included fully) ---

    function handleScroll(e) { e.preventDefault(); if (!isScrolling) { if (e.deltaY > 0) scrollDown(); else scrollUp(); } }
    function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
    function handleTouchMove(e) { e.preventDefault(); }
    function handleTouchEnd(e) { if (isScrolling) return; const touchEndY = e.changedTouches[0].clientY; if (touchStartY - touchEndY > 50) scrollDown(); else if (touchStartY - touchEndY < -50) scrollUp(); }
    
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

    async function shareReel(button) {
        const shareText = button.querySelector('.share-text');
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

    function forceDownload(url, fileName) {
        fetch(url).then(response => response.blob()).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(link.href);
            link.remove();
        }).catch(console.error);
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
                                      
