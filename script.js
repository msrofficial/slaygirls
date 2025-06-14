document.addEventListener('DOMContentLoaded', () => {
    const reelsContainer = document.getElementById('reels-container');
    const unmutePrompt = document.getElementById('unmute-prompt');
    const homeBtn = document.getElementById('home-btn');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const navPanel = document.getElementById('nav-panel');
    const closeIcon = document.getElementById('close-icon');
    const navOverlay = document.getElementById('nav-overlay');
    const clickPrompt = document.getElementById('click-prompt');
    const autoScrollCheckbox = document.getElementById('auto-scroll-checkbox');

    let allVideoFiles = [], currentPlaylist = [], currentIndex = 0;
    let activeReel = null, preloadedNextReel = null, preloadedPrevReel = null;
    let isScrolling = false, userInteracted = false, touchStartY = 0;
    let isAutoScrollEnabled = localStorage.getItem('autoScrollEnabled') === 'true';

    autoScrollCheckbox.checked = isAutoScrollEnabled;

    const openMenu = () => {
        navPanel.classList.add('open');
        hamburgerIcon.classList.add('open');
        navOverlay.classList.add('active');
    };
    const closeMenu = () => {
        navPanel.classList.remove('open');
        hamburgerIcon.classList.remove('open');
        navOverlay.classList.remove('active');
    };

    hamburgerIcon.addEventListener('click', openMenu);
    closeIcon.addEventListener('click', closeMenu);
    navOverlay.addEventListener('click', closeMenu);
    
    setTimeout(() => {
        if(clickPrompt) clickPrompt.style.display = 'none';
    }, 7000);

    homeBtn.addEventListener('click', () => { window.location.reload(); });

    autoScrollCheckbox.addEventListener('change', () => {
        isAutoScrollEnabled = autoScrollCheckbox.checked;
        localStorage.setItem('autoScrollEnabled', isAutoScrollEnabled);
        if (activeReel) {
            const activeVideo = activeReel.querySelector('video');
            activeVideo.loop = !isAutoScrollEnabled;
            if (isAutoScrollEnabled && activeVideo.paused) {
                 activeVideo.play();
            }
        }
    });

    const handleFirstInteraction = () => {
        if (userInteracted) return;
        userInteracted = true;
        unmutePrompt.classList.add('hidden');
        document.querySelectorAll('video').forEach(v => { v.muted = false; });
        if (activeReel) {
            activeReel.querySelector('video').muted = false;
        }
    };
    unmutePrompt.addEventListener('click', handleFirstInteraction, { once: true });

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
                activeReel = createReelElement(currentPlaylist[currentIndex]);
                activeReel.classList.add('active');
                reelsContainer.appendChild(activeReel);
                await playActiveVideo();
                preloadAdjacentReels();
            }
            reelsContainer.addEventListener('wheel', handleScroll, { passive: false });
            reelsContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
            reelsContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
            reelsContainer.addEventListener('touchend', handleTouchEnd);
        } catch (error) { console.error("Could not load videos:", error); }
    }
    
    function createReelElement(fileName) {
        const reel = document.createElement('div');
        reel.className = 'reel';
        const video = document.createElement('video');
        video.src = `./reels/${fileName}`;
        video.playsInline = true;
        video.preload = "auto";
        reel.addEventListener('click', () => {
            if (!userInteracted) { handleFirstInteraction(); } 
            else { video.muted = !video.muted; showVolumeIcon(video); }
        });
        reel.appendChild(video);
        reel.appendChild(createOverlay(fileName));
        return reel;
    }
    
    function onVideoEnded() {
        if (isAutoScrollEnabled && !isScrolling) {
            setTimeout(scrollDown, 500);
        }
    }

    async function playActiveVideo() {
        if (!activeReel) return;
        const activeVideo = activeReel.querySelector('video');
        activeVideo.removeEventListener('ended', onVideoEnded);
        activeVideo.currentTime = 0;
        activeVideo.muted = !userInteracted;
        activeVideo.loop = !isAutoScrollEnabled;
        if (isAutoScrollEnabled) {
            activeVideo.addEventListener('ended', onVideoEnded);
        }
        try {
            await activeVideo.play();
        } catch (error) {
            console.error("Autoplay failed initially:", error);
            if (userInteracted) {
                activeVideo.muted = true;
                await activeVideo.play();
                activeVideo.muted = false;
            } else {
                 unmutePrompt.classList.remove('hidden');
            }
        }
    }

    function preloadAdjacentReels() {
        if (allVideoFiles.length < 2) return;
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        if(nextIndex !== currentIndex) preloadedNextReel = createReelElement(currentPlaylist[nextIndex]);
        const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        if(prevIndex !== currentIndex) preloadedPrevReel = createReelElement(currentPlaylist[prevIndex]);
    }

    function scrollDown() {
        if (!preloadedNextReel || isScrolling) return;
        isScrolling = true;
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        animateToNextReel(preloadedNextReel, 'down');
    }
    function scrollUp() {
        if (!preloadedPrevReel || isScrolling) return;
        isScrolling = true;
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        animateToNextReel(preloadedPrevReel, 'up');
    }

    async function animateToNextReel(newReel, direction) {
        if (direction === 'down') { newReel.classList.add('next'); reelsContainer.appendChild(newReel); } 
        else { newReel.classList.add('prev'); reelsContainer.insertBefore(newReel, activeReel); }
        await new Promise(resolve => setTimeout(resolve, 50));
        activeReel.classList.add(direction === 'down' ? 'prev' : 'next');
        newReel.classList.remove('prev', 'next');
        newReel.classList.add('active');
        activeReel.querySelector('video').pause();
        activeReel = newReel;
        await playActiveVideo();
        preloadAdjacentReels();
        setTimeout(() => {
            const oldReels = document.querySelectorAll(`.reel.${direction === 'down' ? 'prev' : 'next'}`);
            oldReels.forEach(r => { if (r !== activeReel) r.remove(); });
            isScrolling = false;
        }, 600);
    }
    function handleScroll(e) { e.preventDefault(); if (!isScrolling) { if (e.deltaY > 0) scrollDown(); else scrollUp(); } }
    function handleTouchStart(e) { touchStartY = e.touches[0].clientY; }
    function handleTouchMove(e) { e.preventDefault(); }
    function handleTouchEnd(e) { if (isScrolling) return; const touchEndY = e.changedTouches[0].clientY; if (touchStartY - touchEndY > 50) scrollDown(); else if (touchStartY - touchEndY < -50) scrollUp(); }
    function createOverlay(fileName) {
        const overlay = document.createElement('div');
        overlay.className = 'reel-overlay';
        overlay.innerHTML = `
            <div class="reel-info">
                <div class="username"><a href="https://instagram.com/msr.sakibur" target="_blank" rel="noopener noreferrer"><img src="https://i.pravatar.cc/50?u=msr.sakibur" alt="avatar">msr.sakibur</a></div>
                <div class="caption">Yohohoho 🌚</div>
            </div>
            <div class="reel-actions">
                <div class="action-item like-btn"><i class="fa-regular fa-heart"></i><span>6.9M</span></div>
                <div class="action-item download-btn"><i class="fa-solid fa-download"></i><span>Save</span></div>
                <div class="action-item share-btn"><i class="fa-solid fa-paper-plane"></i><span class="share-text">Share</span></div>
            </div>`;
        const likeBtn = overlay.querySelector('.like-btn');
        likeBtn.addEventListener('click', (e) => { e.stopPropagation(); const heartIcon = likeBtn.querySelector('i'); heartIcon.classList.toggle('fa-regular'); heartIcon.classList.toggle('fa-solid'); heartIcon.classList.toggle('liked'); });
        const downloadBtn = overlay.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => { e.stopPropagation(); forceDownload(`./reels/${fileName}`, fileName); });
        const shareBtn = overlay.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => { e.stopPropagation(); shareReel(shareBtn); });
        return overlay;
    }
    async function shareReel(button) {
        const shareText = button.querySelector('.share-text');
        const shareUrl = 'https://msrofficial.github.io/slaygirls';
        const shareData = { title: 'Check out this Reel!', text: 'Yohohoho 🌚', url: shareUrl };
        if (navigator.share) { try { await navigator.share(shareData); } catch (err) { console.error("Share failed:", err); }
        } else {
            try { await navigator.clipboard.writeText(shareUrl); const originalText = shareText.textContent; shareText.textContent = 'Copied!'; setTimeout(() => { shareText.textContent = originalText; }, 2000);
            } catch (err) { console.error('Failed to copy link:', err); }
        }
    }
    function forceDownload(url, fileName) {
        fetch(url).then(response => response.blob()).then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
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
                          
