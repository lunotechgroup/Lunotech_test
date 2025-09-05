// ==========================
//  THREE.js Scene (no change)
// ==========================
class LunarExplorer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.moon = null;
    this.stars = null;
    this.mountain = null;
    this.prefersReducedMotion = false;
    this.assetsLoaded = false;
    this.moonriseAnimationStarted = false;
    this.loadingBarElement = document.getElementById("loading-bar");

    this.init();
  }

  init() {
    const container = document.getElementById("canvas-container");
    this.moonUrl = container?.dataset.moonUrl;
    this.mountainUrl = container?.dataset.mountainUrl;
    this.checkReducedMotion();
    this.setupScene();
    this.createStarfield();
    this.loadAssets(); // This will now use the LoadingManager
    this.setupLighting();
    this.setupEventListeners();
    this.animate();
  }

  checkReducedMotion() {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.prefersReducedMotion = mediaQuery.matches;
    mediaQuery.addEventListener("change", (e) => {
      this.prefersReducedMotion = e.matches;
    });
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 0, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById("canvas-container");
    if (container) {
      container.appendChild(this.renderer.domElement);
    }
  }

  createStarfield() {
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.9,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  loadAssets() {
    const manager = new THREE.LoadingManager();

    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = (itemsLoaded / itemsTotal) * 100;
      this.updateLoadingProgress(progress);
    };

    manager.onLoad = () => {
      this.assetsLoaded = true;
      this.hideLoadingScreen(); // Hide loading screen after all assets are loaded
      this.animateMoonRise();
    };

    const textureLoader = new THREE.TextureLoader(manager); // Pass the manager to the loader

    // Load Moon Texture
    textureLoader.load(
      this.moonUrl, // Moon texture URL
      (texture) => {
        this.createMoon(texture);
      },
      undefined, // onProgress handled by manager
      (error) => {
        console.error("Failed to load moon texture:", error);
        // Fallback to procedural texture if image fails to load
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.createImageData(512, 512);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % 512;
            const y = Math.floor(i / 4 / 512);
            const noise = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 0.5 + 0.5;
            const craters = Math.sin(x * 0.1) * Math.sin(y * 0.1) * 0.3 + 0.7;
            const base = 0.4;
            const gray = Math.floor((base + noise * 0.3 + craters * 0.3) * 255);
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
            data[i + 3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
        }
        this.createMoon(new THREE.CanvasTexture(canvas));
      }
    );

    // Load Mountain Texture
    textureLoader.load(
      this.mountainUrl, // Generated transparent mountain texture URL
      (texture) => {
        this.createMountain(texture);
      },
      undefined, // onProgress handled by manager
      (error) => {
        console.warn("Failed to load mountain texture. Mountain will not be rendered.", error);
        // No mountain created if texture fails
      }
    );
  }

  updateLoadingProgress(progress) {
    if (this.loadingBarElement) {
      this.loadingBarElement.style.width = `${progress}%`;
    }
  }

  createMoon(moonTexture) {
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: moonTexture,
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.0,
    });

    this.moon = new THREE.Mesh(geometry, material);
    this.moon.castShadow = true;
    this.moon.receiveShadow = true;

    // Set initial position for the moon behind the mountain and a bit lower
    this.moon.position.set(0, -3, -1); // Lower Y value to make it seem lower in the scene initially
    this.moon.scale.set(0, 0, 0); // Start the scale small
    this.scene.add(this.moon);
  }

  createMountain(mountainTexture) {
    const aspectRatio = mountainTexture.image.width / mountainTexture.image.height;
    const planeHeight = 2; // Increase the height to make the mountain taller
    const planeWidth = planeHeight * aspectRatio;

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
      map: mountainTexture,
      transparent: true,
      alphaTest: 0.1,
    });

    // Position the mountain at the bottom of the scene and slightly in front of the moon
    this.mountain = new THREE.Mesh(geometry, material);
    this.mountain.position.set(0, 0, 4); // Adjusted to be more forward in the scene
    this.scene.add(this.mountain);
  }

  animateMoonRise() {
    if (!this.moon || this.moonriseAnimationStarted) return;
    this.moonriseAnimationStarted = true;

    if (!this.prefersReducedMotion) {
      const tl = gsap.timeline();

      // Animate the moon to rise from behind the mountain
      tl.to(this.moon.scale, {
        x: 0.765,
        y: 0.765,
        z: 0.765,
        duration: 4,
        ease: "power3.out",
      }).to(
        this.moon.position,
        {
          x: 0,
          y: 0, // Adjusted to rise above the mountain
          z: 0, // Position the moon closer to the camera
          duration: 4,
          ease: "power3.out",
        },
        0
      ); // Start at the same time as scale animation
    } else {
      // Final state for reduced motion
      this.moon.scale.set(0.765, 0.765, 0.765);
      this.moon.position.set(0, 0, 0);
    }
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4a90e2, 0.3);
    pointLight.position.set(-10, -10, -10);
    this.scene.add(pointLight);
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize());
  }

  onWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.classList.add("hidden");
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500); // Match CSS transition duration
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.stars && !this.prefersReducedMotion) {
      this.stars.rotation.y += 0.0002;
    }

    if (this.moon && !this.prefersReducedMotion && this.moonriseAnimationStarted) {
      this.moon.rotation.y += 0.05 * 0.016;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LunarExplorer();
});

// ===========================================
//  Header (with i18n for FA/EN & persistence)
// ===========================================
const ICON_GLOBE =
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
     <circle cx="12" cy="12" r="10"></circle>
     <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
     <path d="M2 12h20"></path>
   </svg>`;

const ICON_CHEVRON =
  `<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
     <polyline points="6,9 12,15 18,9"></polyline>
   </svg>`;

const I18N = {
  en: {
    _name: "English",
    home: "Home",
    about: "About",
    services: "Services",
    blog: "Blog",
    contact: "Contact Us",
    
  },
  fa: {
    _name: "فارسی",
    home: "خانه",
    about: "درباره ما",
    services: "خدمات",
    blog: "بلاگ",
    contact: "تماس با ما",

  },
};

class GlassmorphismHeader {
  constructor() {
    this.activeItem = "Home";
    this.isMobileMenuOpen = false;

    // language state
    this.lang = this.getInitialLang(); // 'en' | 'fa'

    this.init();
  }

  getInitialLang() {
    const saved = localStorage.getItem("siteLang");
    if (saved === "fa" || saved === "en") return saved;

    // fallback from current document direction (if server set it)
    const dir = document.documentElement.getAttribute("dir");
    if (dir === "rtl") return "fa";
    return "en";
  }

  init() {
    this.applyLanguage(this.lang); // set texts + dir before binding events
    this.bindEvents();
    this.syncTriggersLabel();
  }

  // --- i18n helpers ---
  normalizeToLang(value) {
    const t = (value || "").toLowerCase().trim();
    if (t.includes("fa") || t.includes("فار") || t.includes("persian") || t.includes("farsi")) return "fa";
    return "en";
  }

  setDirFor(lang) {
    const isFA = lang === "fa";
    document.documentElement.setAttribute("lang", isFA ? "fa" : "en");
    document.documentElement.setAttribute("dir", isFA ? "rtl" : "ltr");
    document.body.classList.toggle("rtl", isFA);
  }

  // Update visible label on triggers to current language
  syncTriggersLabel() {
    const dropdownTrigger = document.querySelector(".dropdown-trigger");
    if (dropdownTrigger) dropdownTrigger.innerHTML = `${ICON_GLOBE} ${I18N[this.lang]._name} ${ICON_CHEVRON}`;

    const mobileDropdownTrigger = document.querySelector(".mobile-dropdown-trigger");
    if (mobileDropdownTrigger) {
      const span = mobileDropdownTrigger.querySelector("span");
      if (span) span.textContent = I18N[this.lang]._name;
    }
  }

  applyLanguage(lang) {
    // Direction + attrs
    this.setDirFor(lang);

    // Desktop nav items by order: Home, About, Services, Blog
    const desktopItems = document.querySelectorAll(".nav-items .nav-item");
    if (desktopItems[0]) desktopItems[0].textContent = I18N[lang].home;
    if (desktopItems[1]) desktopItems[1].textContent = I18N[lang].about;
    if (desktopItems[2]) desktopItems[2].textContent = I18N[lang].services;
    if (desktopItems[3]) desktopItems[3].textContent = I18N[lang].blog;

    // Mobile nav items by order
    const mobileItems = document.querySelectorAll(".mobile-nav-items .mobile-nav-item");
    if (mobileItems[0]) mobileItems[0].textContent = I18N[lang].home;
    if (mobileItems[1]) mobileItems[1].textContent = I18N[lang].about;
    if (mobileItems[2]) mobileItems[2].textContent = I18N[lang].services;
    if (mobileItems[3]) mobileItems[3].textContent = I18N[lang].blog;

    // Contact buttons
    document.querySelectorAll(".contact-btn").forEach((b) => (b.textContent = I18N[lang].contact));
    document.querySelectorAll(".mobile-contact-btn").forEach((b) => (b.textContent = I18N[lang].contact));

    // Persist
    localStorage.setItem("siteLang", lang);

    // Update labels on triggers
    this.syncTriggersLabel();
  }

  changeLanguage(lang) {
    if (lang !== "fa" && lang !== "en") lang = "en";
    this.lang = lang;
    this.applyLanguage(lang);
  }

  bindEvents() {
    // Desktop navigation items (active highlight)
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        this.setActiveItem(e.target.dataset.item || e.target.textContent.trim());
      });
    });

    // Mobile navigation items
    const mobileNavItems = document.querySelectorAll(".mobile-nav-item");
    mobileNavItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        this.setActiveItem(e.target.dataset.item || e.target.textContent.trim());
        this.closeMobileMenu();
      });
    });

    // Mobile menu toggle
    const menuToggle = document.querySelector(".menu-toggle");
    menuToggle?.addEventListener("click", () => {
      this.toggleMobileMenu();
    });

    // Mobile close button
    const mobileCloseBtn = document.querySelector(".mobile-close-btn");
    mobileCloseBtn?.addEventListener("click", () => {
      this.closeMobileMenu();
    });

    // Mobile overlay
    const mobileOverlay = document.querySelector(".mobile-overlay");
    mobileOverlay?.addEventListener("click", () => {
      this.closeMobileMenu();
    });

    // Desktop dropdown
    const dropdown = document.querySelector(".dropdown");
    const dropdownTrigger = document.querySelector(".dropdown-trigger");
    dropdownTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle("active");
    });

    // Desktop dropdown items -> change language
    const dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const raw = e.target.getAttribute("data-lang") || e.target.textContent;
        const lang = this.normalizeToLang(raw);
        this.changeLanguage(lang);
        dropdown?.classList.remove("active");
      });
    });

    // Mobile dropdown
    const mobileDropdown = document.querySelector(".mobile-dropdown");
    const mobileDropdownTrigger = document.querySelector(".mobile-dropdown-trigger");
    mobileDropdownTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      mobileDropdown?.classList.toggle("active");
    });

    // Mobile dropdown items -> change language
    const mobileDropdownItems = document.querySelectorAll(".mobile-dropdown-item");
    mobileDropdownItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const raw = e.target.getAttribute("data-lang") || e.target.textContent;
        const lang = this.normalizeToLang(raw);
        this.changeLanguage(lang);
        mobileDropdown?.classList.remove("active");
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", () => {
      dropdown?.classList.remove("active");
      document.querySelector(".mobile-dropdown")?.classList.remove("active");
    });

    // Contact buttons
    const contactBtns = document.querySelectorAll(".contact-btn, .mobile-contact-btn");
    contactBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.closeMobileMenu();
      });
    });
  }

  setActiveItem(item) {
    this.activeItem = item;

    // Update desktop nav items
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((navItem) => {
      navItem.classList.remove("active");
      if (navItem.dataset.item === item) {
        navItem.classList.add("active");
      }
    });

    // Update mobile nav items
    const mobileNavItems = document.querySelectorAll(".mobile-nav-item");
    mobileNavItems.forEach((navItem) => {
      navItem.classList.remove("active");
      if (navItem.dataset.item === item) {
        navItem.classList.add("active");
      }
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.updateMobileMenu();
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.updateMobileMenu();
  }

  updateMobileMenu() {
    const mobileMenu = document.querySelector(".mobile-menu");
    const mobileOverlay = document.querySelector(".mobile-overlay");
    const menuIcon = document.querySelector(".menu-icon");
    const closeIcon = document.querySelector(".close-icon");

    if (this.isMobileMenuOpen) {
      mobileMenu?.classList.add("active");
      mobileOverlay?.classList.add("active");
      menuIcon?.classList.add("hidden");
      closeIcon?.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    } else {
      mobileMenu?.classList.remove("active");
      mobileOverlay?.classList.remove("active");
      menuIcon?.classList.remove("hidden");
      closeIcon?.classList.add("hidden");
      document.body.style.overflow = "";
    }
  }
}

// Initialize the header when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new GlassmorphismHeader();
});

// ======================
// Services (original code)
// ======================
const services = [
  {
    title: "طراحی برند و هویت بصری",
    description:
      "ما یک هویت بصری منحصربه‌فرد برای کسب‌وکار شما خلق می‌کنیم که داستان شما را روایت کرده و در ذهن مشتریان ماندگار می‌شود",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
            <path d="m21 12-6-3-6 3-6-3"/>
            <path d="m21 12-6 3-6-3-6 3"/>
            <path d="m12 1 6 3-6 3-6-3z"/>
        </svg>`,
    details: {
      fullDescription:
        "هویت بصری شما، اولین نقطه تماس با مشتری است. ما با درک عمیق از کسب‌وکار و مخاطبان شما، یک سیستم هویتی منسجم طراحی می‌کنیم که شامل لوگو، رنگ‌ها، فونت‌ها و الگوهای گرافیکی است تا برند شما در تمام پلتفرم‌ها حرفه‌ای و یکپارچه به نظر برسد.",
      features: [
        "جلسه کشف برند و تدوین استراتژی",
        "طراحی لوگوی اصلی و نسخه‌های فرعی",
        "انتخاب پالت رنگی و فونت‌های برند",
        "طراحی کارت ویزیت و ست اداری",
        "ارائه کتابچه راهنمای برند (Brand Guideline)",
      ],
      applications:
        "جذب مشتریان وفادار , ایجاد تمایز از رقبا , افزایش شناخت و اعتبار برند",
    },
  },
  {
    title: "طراحی و توسعه وب سایت",
    description:
      "وب‌ سایت شما، مرکز دنیای آنلاین شماست. ما وب‌سایت‌هایی واکنش‌گرا، سریع و کاربرپسند طراحی می‌کنیم که بازدیدکنندگان را به مشتری تبدیل می‌کنند",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 7L9 3 5 7l4 4 4-4z"/>
            <path d="m17 11 4 4-4 4-4-4 4-4z"/>
            <path d="m8 12 4 4 6-6-4-4Z"/>
            <path d="m16 8 3-3"/>
            <path d="M9 21a6 6 0 0 0-6-6"/>
        </svg>`,
    details: {
      fullDescription:
        "ما فراتر از یک طراحی زیبا، به تجربه کاربری (UX) و رابط کاربری (UI) اهمیت می‌دهیم. وب‌سایت شما بر اساس اهداف کسب‌وکارتان (فروش، جذب سرنخ، معرفی خدمات) و با استفاده از جدیدترین تکنولوژی‌ها ساخته می‌شود تا عملکردی بی‌نقص در تمام دستگاه‌ها داشته باشد",
      features: [
        "طراحی رابط کاربری (UI) و تجربه کاربری (UX)",
        "طراحی کاملاً واکنش‌گرا (Responsive)",
        "سرعت بارگذاری بهینه شده برای سئو",
        "تصال به درگاه‌های پرداخت آنلاین",
      ],
      applications:
        "طراحی کاملاً واکنش‌گرا (Responsive) , سرعت بارگذاری بهینه شده برای سئو , تصال به درگاه‌های پرداخت آنلاین",
    },
  },
  {
    title: "اتوماسیون هوشمند و ربات‌های آنلاین",
    description:
      "فرآیندهای تکراری کسب‌وکار خود را هوشمند کنید. ما ربات‌هایی طراحی می‌کنیم که بهره‌وری شما را افزایش داده و به مشتریان شما ۲۴ ساعته خدمات ارائه می‌دهند",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
            <path d="M10 9a3 3 0 0 0 0 6"/>
            <path d="M14 9a3 3 0 0 1 0 6"/>
        </svg>`,
    details: {
      fullDescription:
        "زمان شما ارزشمندترین دارایی شماست. ما با ساخت ربات‌های هوشمند (Chatbot) برای وب‌سایت و شبکه‌های اجتماعی شما، فرآیندهای پاسخگویی به مشتریان، رزرو وقت و جمع‌آوری اطلاعات را خودکار می‌کنیم. این به تیم شما اجازه می‌دهد تا بر روی کارهای مهم‌تر تمرکز کند و هزینه‌ها را کاهش دهد",
      features: [
        "ساخت ربات برای تلگرام و دیگر برنامه ها",
        "سیستم خودکار رزرو وقت و قرار ملاقات",
        "اتصال به سیستم‌های مدیریت مشتری (CRM)",
        "سیستم خودکار جمع آوری اطلاعات مشتریان",
      ],
      applications:
        "پاسخگویی فوری و ۲۴ ساعته به مشتریان , کاهش هزینه‌های نیروی انسانی برای پشتیبانی , بهبود تجربه و رضایت مشتریان , افزایش چشمگیر بهره‌وری و صرفه‌جویی در زمان",
    },
  },
];

// DOM elements
const servicesGrid = document.getElementById("servicesGrid");
const modalOverlay = document.getElementById("modalOverlay");
const modalBody = document.getElementById("modalBody");
const closeBtn = document.getElementById("closeBtn");

// Generate service cards
function generateServiceCards() {
  if (!servicesGrid) return;
  servicesGrid.innerHTML = services
    .map(
      (service) => `
        <div class="service-card" data-service="${service.title}">
            <div class="glowing-edge"></div>
            <div class="inner-glow"></div>
            <div class="service-content">
                <div class="service-icon">
                    ${service.icon}
                </div>
                <h3 class="service-title">${service.title}</h3>
                <p class="service-description">${service.description}</p>
                <div class="learn-more">بیشتر بدانید</div>
            </div>
            <div class="corner-tl"></div>
            <div class="corner-br"></div>
        </div>
    `
    )
    .join("");
}

// Show modal with service details
function showModal(service) {
  if (!modalBody || !modalOverlay) return;
  modalBody.innerHTML = `
        <div class="modal-header">
            <div class="modal-icon">
                ${service.icon}
            </div>
            <h3 class="modal-title">${service.title}</h3>
            <p class="modal-description">${service.details.fullDescription}</p>
        </div>
        
        <div class="features-section">
            <h4 class="features-title">ویژگی های کلیدی</h4>
            <ul class="features-list">
                ${service.details.features
                  .map(
                    (feature) => `
                    <li>
                        <div class="feature-bullet"></div>
                        ${feature}
                    </li>
                `
                  )
                  .join("")}
            </ul>
        </div>
        
        <div class="applications-section">
            <h4>اهداف استفاده</h4>
            <p>${service.details.applications}</p>
        </div>
    `;

  modalOverlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Hide modal
function hideModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("active");
  document.body.style.overflow = "auto";
}

// Event listeners
function setupEventListeners() {
  if (servicesGrid) {
    servicesGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".service-card");
      if (card) {
        const serviceTitle = card.dataset.service;
        const service = services.find((s) => s.title === serviceTitle);
        if (service) {
          showModal(service);
        }
      }
    });
  }

  closeBtn?.addEventListener("click", hideModal);

  modalOverlay?.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      hideModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay?.classList.contains("active")) {
      hideModal();
    }
  });
}

class ScrollAnimations {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    // Create intersection observer
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            // Add staggered delay based on card position
            const delay = index * 200;
            setTimeout(() => {
              entry.target.classList.add("animate");
            }, delay);

            // Stop observing this element once animated
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );
  }

  observeCards() {
    const cards = document.querySelectorAll(".service-card");
    cards.forEach((card) => {
      this.observer.observe(card);
    });
  }
}

// Initialize scroll animations
const scrollAnimations = new ScrollAnimations();

// Initialize the application
function init() {
  generateServiceCards();
  setupEventListeners();
  scrollAnimations.observeCards();
}

// Start the application when DOM is loaded
document.addEventListener("DOMContentLoaded", init);

// ===================
// Marquee (original)
// ===================
function generateMarqueeContent() {
  const marqueeContent = document.getElementById("marqueeContent");
  if (!marqueeContent) return;
  const text = "ignite you digital dream by moonlight creativity";

  // Create 8 items to ensure smooth infinite scroll
  for (let i = 0; i < 8; i++) {
    const item = document.createElement("div");
    item.className = "marquee-item";

    const textSpan = document.createElement("span");
    textSpan.className = "marquee-text";
    textSpan.textContent = text;

    item.appendChild(textSpan);
    marqueeContent.appendChild(item);
  }
}

// Initialize marquee when page loads
document.addEventListener("DOMContentLoaded", generateMarqueeContent);

// Optional: Add smooth scroll speed adjustment
function adjustScrollSpeed(speed = 10) {
  const marqueeContent = document.getElementById("marqueeContent");
  if (marqueeContent) marqueeContent.style.animationDuration = `${speed}s`;
}

// Optional: Add direction control
function reverseDirection() {
  const marqueeContent = document.getElementById("marqueeContent");
  if (!marqueeContent) return;
  const currentAnimation = marqueeContent.style.animationDirection;
  marqueeContent.style.animationDirection = currentAnimation === "reverse" ? "normal" : "reverse";
}

// ===================
// Projects (original)
// ===================
const projects = [
  {
    id: 1,
    title: "E-Commerce Platform",
    description:
      "A modern e-commerce solution built with Next.js and Stripe integration for seamless online shopping experiences.",
    label: "Project 01",
  },
  {
    id: 2,
    title: "Task Management App",
    description:
      "Collaborative task management tool with real-time updates, team collaboration features, and intuitive design.",
    label: "Project 02",
  },
  {
    id: 3,
    title: "Portfolio Website",
    description:
      "Responsive portfolio website showcasing creative work with smooth animations and optimized performance.",
    label: "Project 03",
  },
  {
    id: 4,
    title: "Mobile Banking App",
    description:
      "Secure mobile banking application with biometric authentication and comprehensive financial management tools.",
    label: "Project 04",
  },
  {
    id: 5,
    title: "AI Chat Interface",
    description:
      "Intelligent chat interface powered by machine learning with natural language processing capabilities.",
    label: "Project 05",
  },
];

// Generate project cards
function generateProjectCards() {
  const container = document.getElementById("projects-container");
  if (!container) return;

  projects.forEach((project, index) => {
    const cardElement = document.createElement("div");
    cardElement.className = "project-card";
    // Adjust the 'top' value for sticky positioning
    cardElement.style.top = `${100 + index * 25}px`;

    cardElement.innerHTML = `
            <div class="card-inner">
                <div class="glassmorphism-overlay"></div>
                <div class="card-header">
                    <div class="card-header-left">
                        <div class="project-number">${project.id}</div>
                        <span class="project-label">${project.label}</span>
                    </div>
                    <div class="card-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
                <div class="card-content">
                    <h2 class="project-title">${project.title}</h2>
                    <p class="project-description">${project.description}</p>
                    <div class="card-footer">
                        <button class="view-project-btn" onclick="viewProject(${project.id})">
                            <span style="position: relative; z-index: 10;">View Project</span>
                            <div class="btn-overlay"></div>
                        </button>
                        <div class="footer-dots">
                            <div class="footer-dot active"></div>
                            <div class="footer-dot inactive"></div>
                            <div class="footer-dot inactive"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    container.appendChild(cardElement);
  });
}

// View project function
function viewProject(projectId) {
  console.log(`[v0] Viewing project ${projectId}`);
  alert(`Opening project ${projectId}`);
}

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  generateProjectCards();
  console.log("[v0] Project cards generated successfully");
});

// ==========================
// Blog animations (original)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".grok-blog-header");
  if (header) {
    setTimeout(() => {
      header.classList.add("grok-blog-fade-in");
    }, 100);
  }

  const blogPosts = document.querySelectorAll(".grok-blog-post");
  blogPosts.forEach((post, index) => {
    setTimeout(() => {
      post.classList.add("grok-blog-slide-up");
    }, 200 + index * 200);
  });
});

document.querySelector(".grok-blog-explore-btn")?.addEventListener("click", () => {
  console.log("Explore more clicked");
});

document.querySelectorAll(".grok-blog-read-btn").forEach((button) => {
  button.addEventListener("click", () => {
    console.log("Read button clicked");
  });
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("grok-blog-slide-up");
    }
  });
}, observerOptions);

document.querySelectorAll(".grok-blog-post").forEach((post) => {
  observer.observe(post);
});
