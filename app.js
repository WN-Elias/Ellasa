/* Ellasa Barbershop — interactions
   - scroll-reveal (.reveal -> .in)
   - magnetic buttons ([data-magnetic])
   - hero scroll-scrub (sticky product video: scroll position drives currentTime)
   - mobile nav toggle
   All motion is disabled under prefers-reduced-motion. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scroll reveal ---------- */
  var els = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    document.querySelectorAll('[data-magnetic]').forEach(function (btn) {
      var raf;
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.25;
        var y = (e.clientY - r.top - r.height / 2) * 0.35;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { btn.style.transform = 'translate(' + x + 'px,' + y + 'px)'; });
      });
      btn.addEventListener('mouseleave', function () { cancelAnimationFrame(raf); btn.style.transform = ''; });
    });
  }

  /* ---------- hero scroll-scrub (sticky video driven by scroll position) ---------- */
  var video = document.getElementById('hero-video');
  var content = document.getElementById('hero-content');
  var scrim2 = document.getElementById('hero-scrim2');
  var heroSection = document.getElementById('top');

  if (!reduce && video && content && scrim2 && heroSection) {
    var ticking = false;
    var videoDuration = 0;
    var lastSeek = 0;
    // Minimum time between video seeks. Seeking decodes forward from the
    // last keyframe, which is far more expensive than normal playback —
    // doing it on every scroll frame (~60/s) is what causes stutter.
    // ~12 scrub-updates/sec still reads as smooth motion but cuts the
    // decode load roughly 5x.
    var SEEK_INTERVAL_MS = 80;

    video.addEventListener('loadedmetadata', function () {
      videoDuration = video.duration || 0;
      // Playing and immediately pausing "primes" the decoder so the very
      // first scroll-driven seek actually paints a frame instead of
      // staying on the poster image. Safe to autoplay: muted + playsinline.
      var playPromise = video.play();
      if (playPromise && playPromise.then) {
        playPromise.then(function () { video.pause(); }).catch(function () {});
      } else {
        video.pause();
      }
    });

    function renderHero() {
      ticking = false;
      // progress 0 -> 1 across the scrollable height of the pinned hero stage
      var travel = heroSection.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      var p = window.scrollY / travel;
      if (p < 0) p = 0; else if (p > 1) p = 1;

      // scroll position scrubs the video's playback position (throttled)
      var now = performance.now();
      if (videoDuration > 0 && now - lastSeek >= SEEK_INTERVAL_MS) {
        var t = p * videoDuration;
        if (Math.abs(video.currentTime - t) > 0.05) {
          video.currentTime = t;
          lastSeek = now;
        }
      }

      // overlay darkens as the next section rises over the hero
      scrim2.style.opacity = (p * 0.72).toFixed(3);
      // headline fades and lifts away
      content.style.opacity = (1 - Math.min(1, p * 1.35)).toFixed(3);
      content.style.transform = 'translateY(' + (-p * 64) + 'px)';
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(renderHero); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    renderHero();
  }

  /* ---------- mobile nav toggle ---------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.getElementById('nav-links');

  if (nav && navToggle && navLinks) {
    function closeNav() {
      nav.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
    function openNav() {
      nav.classList.add('nav-open');
      navToggle.setAttribute('aria-expanded', 'true');
    }

    navToggle.addEventListener('click', function () {
      if (nav.classList.contains('nav-open')) closeNav(); else openNav();
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('nav-open')) return;
      if (!nav.contains(e.target)) closeNav();
    });
  }
})();
