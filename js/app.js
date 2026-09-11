// TapToReview - client side behaviors & Supabase integration
document.addEventListener('DOMContentLoaded', function () {
  // Initialize Supabase
  const supabaseUrl = 'https://zavspmqjmrinfxenbosz.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphdnNwbXFqbXJpbmZ4ZW5ib3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTkzOTksImV4cCI6MjEwNDAzNTM5OX0.7K-EFRRgLmLOh8BltHDH0qh61TDLbLlzCjJ5jBMXCc8';
  const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

  // year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  var navToggle = document.getElementById('nav-toggle');
  var navList = document.getElementById('nav-list');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      navList.classList.toggle('open');
      document.body.classList.toggle('no-scroll', !expanded);
    });
  }

  // Sticky header on scroll
  var header = document.getElementById('site-header');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 24) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#' || href.startsWith('http')) return;
      e.preventDefault();
      var el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (navList.classList.contains('open')) {
        navList.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('no-scroll');
      }
    });
  });

  // FAQ accordion
  document.querySelectorAll('.accordion-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      var panel = this.nextElementSibling;
      if (!expanded) {
        panel.style.display = 'block';
      } else {
        panel.style.display = 'none';
      }
    });
  });

  // Form: Save to Supabase and open WhatsApp
  var form = document.getElementById('order-form');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var biz = document.getElementById('biz-name').value.trim();
      var city = document.getElementById('biz-city').value.trim();
      var category = document.getElementById('biz-category').value;
      var rawGoogleInput = document.getElementById('biz-google').value.trim();
      var qty = document.getElementById('biz-qty').value;
      var contact = document.getElementById('biz-contact').value.trim();

      if (!biz || !rawGoogleInput || !contact || !category) {
        showToast('Please fill in all required fields including category.');
        return;
      }

      var submitButton = document.getElementById('form-submit');
      if (!supabaseClient) {
        showToast('Registration is temporarily unavailable. Please try again shortly.');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Preparing your review link...';

      var google;
      try {
        const { data, error } = await supabaseClient.functions.invoke('generate-review-link', {
          body: {
            url: rawGoogleInput,
            domain: window.location.hostname,
            platform: 'google'
          }
        });

        if (error || !data?.success || !data.destination_url) {
          console.error('Google review link generation error:', error || data);
          showToast('We could not find your Google Business link. Please check the URL and try again.');
          return;
        }

        google = data.destination_url;
      } catch (err) {
        console.error('Google review link generation exception:', err);
        showToast('We could not prepare your Google review link. Please try again.');
        return;
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Order on WhatsApp';
      }

      var baseText = city ? `${biz}-${city}` : biz;
      var slug = baseText
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (supabaseClient) {
        try {
          const { error } = await supabaseClient
            .from('registrations')
            .insert([{
              business_name: biz,
              city_location: city,
              category: category,
              destination_url: google,
              whatsapp_number: contact,
              card_quantity: qty,
              generated_slug: slug,
              platform: 'google'
            }]);

          if (error) {
            if (error.code === '23505') {
              showToast('This business is already registered with us!');
              return;
            } else {
              console.error('Supabase registration error:', error);
            }
          }
        } catch (err) {
          console.error('Network error during registration:', err);
        }
      }

      var ownerPhone = '917620952720';
      var businessUrl = new URL(`/${slug}`, window.location.origin).href;
      var message = [
        'Hi TapToReview,',
        `Business: ${biz}`,
        `City: ${city}`,
        `Category: ${category}`,
        `GoogleURL: ${google}`,
        `Quantity: ${qty}`,
        `WhatsApp: ${contact}`,
        `GeneratedSlug: ${slug}`,
        `BusinessURL: ${businessUrl}`,
        'Please confirm price and delivery.'
      ].join('\n');
      var url = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener');
      showToast('Opening WhatsApp with your order — please confirm the message and send.');
    });
  }

  function showToast(text) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.hidden = false;
    t.textContent = text;
    setTimeout(function () {
      t.hidden = true;
    }, 5000);
  }

  // Scroll-reveal animations
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // --- Animated stat counters & Live Supabase Stats ---
  var statEls = document.querySelectorAll('.stat-number');
  async function fetchAndAnimateStats() {
    if (statEls.length === 0) return;

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('get_platform_stats', {
          req_platform: 'google'
        });
        
        if (!error && data) {
          var bizEl = document.getElementById('stat-biz');
          var tapsEl = document.getElementById('stat-taps');
          
          if (bizEl) bizEl.setAttribute('data-target', data.businesses_onboarded);
          if (tapsEl) tapsEl.setAttribute('data-target', data.total_taps);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }

    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute('data-target')) || 0;
      var decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
      var duration = 1400;
      var start = performance.now();

      function step(now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window) {
      var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            statObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      statEls.forEach(function (el) {
        statObserver.observe(el);
      });
    } else {
      statEls.forEach(animateCount);
    }
  }

  fetchAndAnimateStats();

  // --- Dynamic Monthly Leaderboard with City ---
  async function loadLeaderboard(selectedCategory = 'All') {
    var tbody = document.getElementById('leaderboard-body');
    if (!tbody || !supabaseClient) return;

    try {
      const { data, error } = await supabaseClient.rpc('get_monthly_leaderboard', {
        req_platform: 'google',
        req_category: selectedCategory
      });

      if (error) {
        console.error('Error fetching leaderboard:', error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">Unable to load leaderboard at the moment.</td></tr>`;
        return;
      }

      if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--muted);">No taps recorded yet this month. Be the first!</td></tr>`;
        return;
      }

      let html = '';
      data.forEach((row, index) => {
        let rankBadge = index + 1;
        if (index === 0) rankBadge = '🥇 1';
        else if (index === 1) rankBadge = '🥈 2';
        else if (index === 2) rankBadge = '🥉 3';

        html += `
          <tr>
            <td><strong>${rankBadge}</strong></td>
            <td>${escapeHtml(row.business_name)}</td>
            <td><span class="city-text">${escapeHtml(row.city_location)}</span></td>
            <td><span class="cat-tag">${escapeHtml(row.category)}</span></td>
            <td><strong>${row.monthly_taps_count.toLocaleString('en-IN')} taps</strong></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } catch (err) {
      console.error('Leaderboard exception:', err);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var filterContainer = document.getElementById('lb-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', function (e) {
      if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        loadLeaderboard(e.target.getAttribute('data-cat'));
      }
    });
  }

  loadLeaderboard('All');
});
