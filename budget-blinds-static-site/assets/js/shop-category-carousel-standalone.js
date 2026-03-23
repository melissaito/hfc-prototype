/**
 * Shop category card carousel – standalone (works without bundler).
 * Powers image slider + dots + arrows on each category card.
 * Includes one-time swipe-nudge hint when a card with 2+ images first enters view.
 * Places the consultation block beside the last card only when that row has one card;
 * otherwise the consultation stays full width on the following row (CSS default).
 */
(function() {
  var STORAGE_INTERACTED = 'shopCategoryCarouselInteracted';

  function markCarouselInteracted() {
    try {
      sessionStorage.setItem(STORAGE_INTERACTED, '1');
    } catch (e) {}
  }

  function init() {
    var cards = document.querySelectorAll('.shop-category__card-image');
    cards.forEach(function(cardEl, cardIndex) {
      var inner = cardEl.querySelector('.shop-category__card-carousel-inner');
      var dotsContainer = cardEl.querySelector('.shop-category__card-dots');
      if (!inner || !dotsContainer) return;

      var slides = inner.querySelectorAll('img, video');
      var count = slides.length;
      if (count === 0) return;

      var currentIndex = 0;

      function setSlide(index) {
        markCarouselInteracted();
        index = Math.max(0, Math.min(index, count - 1));
        currentIndex = index;
        inner.style.transform = 'translateX(-' + (index * 100) + '%)';

        dotsContainer.querySelectorAll('.shop-category__card-dot').forEach(function(dot, i) {
          dot.classList.toggle('is-active', i === index);
          dot.setAttribute('aria-selected', i === index);
        });

        inner.querySelectorAll('video').forEach(function(video, i) {
          try {
            if (i === index) {
              video.play();
            } else {
              video.pause();
            }
          } catch (e) {}
        });

        if (index > 0) {
          cardEl.classList.add('shop-category__card-image--can-prev');
        } else {
          cardEl.classList.remove('shop-category__card-image--can-prev');
        }
      }

      if (count > 1) {
        dotsContainer.classList.add('is-visible');
        for (var i = 0; i < count; i++) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'shop-category__card-dot' + (i === 0 ? ' is-active' : '');
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-selected', i === 0);
          dot.setAttribute('aria-label', 'Image ' + (i + 1) + ' of ' + count);
          dot.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var idx = parseInt(this.getAttribute('data-index'), 10);
            setSlide(idx);
          });
          dot.setAttribute('data-index', String(i));
          dotsContainer.appendChild(dot);
        }

        var arrowsWrap = document.createElement('div');
        arrowsWrap.className = 'shop-category__card-arrows';
        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'shop-category__card-arrow shop-category__card-arrow--prev';
        prevBtn.setAttribute('aria-label', 'Previous image');
        prevBtn.innerHTML = '<img src="assets/images/arrow-left.svg" alt="" width="24" height="24">';
        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'shop-category__card-arrow shop-category__card-arrow--next';
        nextBtn.setAttribute('aria-label', 'Next image');
        nextBtn.innerHTML = '<img src="assets/images/arrow-right.svg" alt="" width="24" height="24">';

        prevBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          setSlide(currentIndex - 1);
        });
        nextBtn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          setSlide(currentIndex + 1);
        });

        arrowsWrap.appendChild(prevBtn);
        arrowsWrap.appendChild(nextBtn);
        cardEl.appendChild(arrowsWrap);
      }

      var touchStartX = 0;
      var touchEndX = 0;
      cardEl.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      cardEl.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        var diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          markCarouselInteracted();
          if (diff > 0) setSlide(currentIndex + 1);
          else setSlide(currentIndex - 1);
        }
      }, { passive: true });
    });

    initSwipeNudge();
    initConsultationLayout();
  }

  function getShopCategoryColumnCount() {
    if (window.matchMedia && window.matchMedia('(max-width: 1029px)').matches) return 1;
    if (window.matchMedia && window.matchMedia('(max-width: 1200px)').matches) return 2;
    var g = document.querySelector('.shop-category__grid');
    if (!g) return 3;
    return g.getAttribute('data-view') === 'small' ? 5 : 3;
  }

  function snapRowTop(t) {
    return Math.round(t / 8) * 8;
  }

  function rowTopsAligned(a, b) {
    var t1 = a.getBoundingClientRect().top;
    var t2 = b.getBoundingClientRect().top;
    return Math.abs(t1 - t2) < 3;
  }

  function findGridRowMatchingLast(grid, consultation, last, maxProbe) {
    var cap = maxProbe || 80;
    for (var r = 1; r <= cap; r++) {
      consultation.style.gridRow = r + ' / ' + (r + 1);
      grid.offsetHeight;
      if (rowTopsAligned(consultation, last)) {
        return r + ' / ' + (r + 1);
      }
    }
    consultation.style.gridRow = '';
    return '';
  }

  /**
   * If the bottom-most row of product cards has exactly one card, pin that card
   * to column 1 and place the consultation in columns 2–end on the same row.
   * If that row has two or more cards, clear inline placement so the consultation
   * is full width on the following row (CSS default).
   */
  function layoutShopCategoryConsultation() {
    var grid = document.querySelector('.shop-category__grid');
    var consultation = grid && grid.querySelector('.shop-category__consultation');
    var cardNodes = grid && grid.querySelectorAll('.shop-category__card');
    if (!grid || !consultation || !cardNodes.length) return;

    function clear() {
      grid.removeAttribute('data-consultation-placement');
      consultation.style.gridColumn = '';
      consultation.style.gridRow = '';
      consultation.style.gridRowStart = '';
      consultation.style.gridRowEnd = '';
      var resetCards = grid.querySelectorAll('.shop-category__card');
      for (var x = 0; x < resetCards.length; x++) {
        resetCards[x].style.gridColumn = '';
        resetCards[x].style.gridRow = '';
        resetCards[x].style.gridRowStart = '';
        resetCards[x].style.gridRowEnd = '';
      }
    }

    clear();
    if (getShopCategoryColumnCount() < 2) {
      return;
    }

    grid.offsetHeight;

    var cards = Array.prototype.slice.call(cardNodes);
    var snaps = cards.map(function(c) {
      return { el: c, snap: snapRowTop(c.getBoundingClientRect().top) };
    });
    var maxSnap = -Infinity;
    for (var i = 0; i < snaps.length; i++) {
      if (snaps[i].snap > maxSnap) maxSnap = snaps[i].snap;
    }
    var lastRow = [];
    for (var j = 0; j < snaps.length; j++) {
      if (snaps[j].snap === maxSnap) lastRow.push(snaps[j].el);
    }

    if (lastRow.length !== 1) {
      return;
    }

    var last = lastRow[0];
    var cs = window.getComputedStyle(last);
    var rowStr = '';
    if (cs.gridRow && cs.gridRow.trim() !== 'auto' && cs.gridRow.trim() !== 'auto / auto') {
      rowStr = cs.gridRow.trim();
    } else if (cs.gridRowStart && cs.gridRowStart !== 'auto') {
      rowStr =
        cs.gridRowStart +
        ' / ' +
        (cs.gridRowEnd && cs.gridRowEnd !== 'auto' ? cs.gridRowEnd : 'span 1');
    }

    if (rowStr) {
      last.style.gridRow = rowStr;
    }
    last.style.gridColumn = '1 / 2';
    grid.offsetHeight;

    grid.setAttribute('data-consultation-placement', 'inline');
    consultation.style.gridColumn = '2 / -1';

    function tryRowShorthand(shorthand) {
      if (!shorthand) return false;
      consultation.style.gridRow = shorthand;
      grid.offsetHeight;
      return rowTopsAligned(consultation, last);
    }

    var csLast = window.getComputedStyle(last);
    var gr = csLast.gridRow ? csLast.gridRow.trim() : '';
    var placed =
      (gr && gr !== 'auto' && gr !== 'auto / auto' && tryRowShorthand(gr)) ||
      (csLast.gridRowStart &&
        csLast.gridRowStart !== 'auto' &&
        tryRowShorthand(
          csLast.gridRowStart +
            ' / ' +
            (csLast.gridRowEnd && csLast.gridRowEnd !== 'auto' ? csLast.gridRowEnd : 'span 1')
        ));

    if (!placed) {
      var found = findGridRowMatchingLast(grid, consultation, last, cards.length + 24);
      if (found) {
        consultation.style.gridRow = found;
      } else {
        clear();
      }
    }
  }

  function scheduleConsultationLayout() {
    requestAnimationFrame(function() {
      requestAnimationFrame(layoutShopCategoryConsultation);
    });
  }

  function initConsultationLayout() {
    scheduleConsultationLayout();
    var grid = document.querySelector('.shop-category__grid');
    if (grid && typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function() {
        scheduleConsultationLayout();
      }).observe(grid);
    }
    window.addEventListener('resize', function() {
      scheduleConsultationLayout();
    });
    window.addEventListener('load', function() {
      scheduleConsultationLayout();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        scheduleConsultationLayout();
      });
    }
    var imgs = grid ? grid.querySelectorAll('img') : [];
    for (var k = 0; k < imgs.length; k++) {
      if (!imgs[k].complete) {
        imgs[k].addEventListener('load', function() {
          scheduleConsultationLayout();
        }, { once: true });
      }
    }
    setTimeout(function() {
      scheduleConsultationLayout();
    }, 300);
  }

  window.layoutShopCategoryConsultation = layoutShopCategoryConsultation;
  window.scheduleShopCategoryConsultationLayout = scheduleConsultationLayout;

  function initSwipeNudge() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {
      return;
    }

    var allowNudge = false;
    try {
      allowNudge = sessionStorage.getItem(STORAGE_INTERACTED) !== '1' || (window.location.search || '').indexOf('nudge=1') !== -1;
    } catch (e) {
      allowNudge = true;
    }
    if (!allowNudge) return;

    var section = document.getElementById('shop-by-category');
    if (!section) return;

    var firstCard = section.querySelector('.shop-category__card-image');
    if (!firstCard) return;

    var inner = firstCard.querySelector('.shop-category__card-carousel-inner');
    var dotsContainer = firstCard.querySelector('.shop-category__card-dots');
    if (!inner || !dotsContainer || inner.querySelectorAll('img').length < 2) return;

    var scrollSettleMs = 600;
    var initialSettleMs = 400;
    var scrollTimer = null;
    var hasScrolled = false;

    function runNudge() {
      try {
        if (sessionStorage.getItem(STORAGE_INTERACTED) === '1' && (window.location.search || '').indexOf('nudge=1') === -1) return;
      } catch (e) {}
      var card = section.querySelector('.shop-category__card-image');
      var inr = card && card.querySelector('.shop-category__card-carousel-inner');
      var dots = card && card.querySelector('.shop-category__card-dots');
      if (!inr || !dots || inr.querySelectorAll('img').length < 2) return;

      dots.classList.remove('shop-category__card-dots--hint');
      inr.classList.remove('shop-category__card-carousel-inner--nudge');
      var savedTransform = inr.style.transform || '';
      inr.style.transform = '';

      requestAnimationFrame(function() {
        inr.style.transform = '';
        requestAnimationFrame(function() {
          inr.offsetHeight;
          dots.classList.add('shop-category__card-dots--hint');
          inr.classList.add('shop-category__card-carousel-inner--nudge');
          inr.addEventListener('animationend', function onEnd() {
            inr.classList.remove('shop-category__card-carousel-inner--nudge');
            inr.style.transform = savedTransform;
          }, { once: true });
          setTimeout(function() {
            dots.classList.remove('shop-category__card-dots--hint');
          }, 900);
        });
      });
    }

    function scheduleNudge(useInitialDelay) {
      if (scrollTimer) clearTimeout(scrollTimer);
      var delay = !hasScrolled && useInitialDelay ? initialSettleMs : scrollSettleMs;
      scrollTimer = setTimeout(function() {
        scrollTimer = null;
        var rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          runNudge();
        }
      }, delay);
    }

    window.addEventListener('scroll', function() {
      hasScrolled = true;
      scheduleNudge(false);
    }, { passive: true });

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        try {
          if (sessionStorage.getItem(STORAGE_INTERACTED) === '1' && (window.location.search || '').indexOf('nudge=1') === -1) return;
        } catch (e) {}
        scheduleNudge(true);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px 80px 0px' });

    observer.observe(section);

    var rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      scheduleNudge(true);
    }

    setTimeout(function() {
      rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        runNudge();
      }
    }, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
