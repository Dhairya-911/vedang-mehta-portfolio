// Main JavaScript for Vedang Cinematography Portfolio (No GSAP)

// Performance-optimized portfolio manager
class OptimizedPortfolio {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.init();
        this.initHeroTextAnimation();
    }

    init() {
        // Use requestIdleCallback for non-critical initialization
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.initPortfolioFilters();
                this.initIntersectionObserver();
                this.initScrollOptimizations();
            });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                this.initPortfolioFilters();
                this.initIntersectionObserver();
                this.initScrollOptimizations();
            }, 100);
        }

        // Initialize critical features immediately
        this.initNavigation();
        this.initSmoothScrolling();
        this.initContactForm();
    }

    // Hero text animation without GSAP
    initHeroTextAnimation() {
        const heroTitle = document.getElementById('heroTitle');
        if (!heroTitle) return;

        // Prevent any interaction
        heroTitle.style.userSelect = 'none';
        heroTitle.style.webkitUserSelect = 'none';
        heroTitle.style.mozUserSelect = 'none';
        heroTitle.style.msUserSelect = 'none';
        heroTitle.style.pointerEvents = 'none';
        heroTitle.setAttribute('unselectable', 'on');

        const texts = [
            'CINEMATIC STORYTELLING',
            'VISUAL EXCELLENCE',
            'CREATIVE DIRECTION',
            'PROFESSIONAL PHOTOGRAPHY',
            'WEDDING CINEMATOGRAPHY',
            'EVENT DOCUMENTATION',
            'CORPORATE FILMS'
        ];

        let currentIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const typeSpeed = 100;
        const deleteSpeed = 50;
        const pauseTime = 2000;

        function typeWriter() {
            const currentText = texts[currentIndex];
            
            if (isDeleting) {
                // Remove characters
                heroTitle.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
                
                if (charIndex === 0) {
                    isDeleting = false;
                    currentIndex = (currentIndex + 1) % texts.length;
                    setTimeout(typeWriter, 500);
                } else {
                    setTimeout(typeWriter, deleteSpeed);
                }
            } else {
                // Add characters
                heroTitle.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
                
                if (charIndex === currentText.length) {
                    isDeleting = true;
                    setTimeout(typeWriter, pauseTime);
                } else {
                    setTimeout(typeWriter, typeSpeed);
                }
            }
        }

        // Start the animation
        setTimeout(typeWriter, 1000);
    }

    // Navigation functionality
    initNavigation() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (menuToggle && navMenu) {
            menuToggle.addEventListener('click', () => {
                const isActive = menuToggle.classList.toggle('active');
                navMenu.classList.toggle('active', isActive);
                document.body.classList.toggle('menu-open', isActive);
            });

            // Close menu when clicking on a link
            const navLinks = navMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    document.body.classList.remove('menu-open');
                });
            });
        }
    }

    // Portfolio filters
    initPortfolioFilters() {
        const portfolioGrid = document.querySelector('.portfolio-grid');
        if (!portfolioGrid) return;

        // Create filter buttons
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-buttons';
        
        const filters = [
            { key: 'all', label: 'All' },
            { key: 'weddings', label: 'Weddings' },
            { key: 'events', label: 'Events' },
            { key: 'concerts', label: 'Concerts' },
            { key: 'food', label: 'Food' }
        ];

        filters.forEach(filter => {
            const button = document.createElement('button');
            button.className = `filter-btn ${filter.key === 'all' ? 'active' : ''}`;
            button.textContent = filter.label;
            button.addEventListener('click', () => this.filterPortfolio(filter.key));
            filterContainer.appendChild(button);
        });

        // Insert filter buttons before portfolio grid
        portfolioGrid.parentNode.insertBefore(filterContainer, portfolioGrid);
    }

    filterPortfolio(category) {
        const items = document.querySelectorAll('.portfolio-item');
        const buttons = document.querySelectorAll('.filter-btn');

        // Update active button
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Filter items with CSS transitions
        items.forEach(item => {
            const itemCategory = item.dataset.category;
            if (category === 'all' || itemCategory === category) {
                item.style.display = 'block';
                item.style.opacity = '0';
                setTimeout(() => {
                    item.style.opacity = '1';
                }, 50);
            } else {
                item.style.opacity = '0';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }

    // Smooth scrolling without GSAP
    initSmoothScrolling() {
        // Smooth scroll for navigation links
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                
                if (targetId.startsWith('#')) {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });

        // Smooth scroll for CTA buttons
        const ctaButtons = document.querySelectorAll('.btn[href^="#"]');
        ctaButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = button.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Intersection Observer for animations
    initIntersectionObserver() {
        if (!('IntersectionObserver' in window)) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Add staggered animation for portfolio items
                    if (entry.target.classList.contains('portfolio-item')) {
                        const delay = Array.from(entry.target.parentNode.children).indexOf(entry.target) * 100;
                        entry.target.style.animationDelay = `${delay}ms`;
                    }
                }
            });
        }, observerOptions);

        // Observe elements for animations
        const animatedElements = document.querySelectorAll('.portfolio-item, .about-content, .contact-content');
        animatedElements.forEach(el => observer.observe(el));
    }

    // Contact form functionality (basic)
    initContactForm() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;

        // Form validation and submission will be handled by contact.js
        console.log('📧 Contact form initialized (handled by contact.js)');
    }

    // Scroll optimizations
    initScrollOptimizations() {
        let isScrolling = false;

        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                requestAnimationFrame(() => {
                    this.handleScroll();
                    isScrolling = false;
                });
                isScrolling = true;
            }
        });
    }

    handleScroll() {
        const scrollY = window.pageYOffset;
        const header = document.querySelector('.header');
        
        if (header) {
            if (scrollY > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Optimized Portfolio (No GSAP)...');
    new OptimizedPortfolio();
    console.log('✅ Portfolio initialized successfully');
});

// Initialize on window load as fallback
window.addEventListener('load', () => {
    if (!window.portfolioInitialized) {
        console.log('🔄 Fallback: Initializing portfolio on window load');
        new OptimizedPortfolio();
        window.portfolioInitialized = true;
    }
});

// Add CSS for animations via JavaScript
const animationCSS = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-in {
    animation: fadeInUp 0.6s ease-out forwards;
}

.filter-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    justify-content: center;
}

.filter-btn {
    padding: 10px 20px;
    background: transparent;
    border: 2px solid #d4d2a7;
    color: #d4d2a7;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
}

.filter-btn:hover,
.filter-btn.active {
    background: #d4d2a7;
    color: #2c3e50;
}

.header.scrolled {
    background: rgba(44, 62, 80, 0.95);
    backdrop-filter: blur(10px);
}

.portfolio-item {
    transition: all 0.3s ease;
}
`;

// Inject animation CSS
const style = document.createElement('style');
style.textContent = animationCSS;
document.head.appendChild(style);
