// static/js/contact.js

console.log("Contact page JavaScript has been loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    // Logic for fade-in animations on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    const contactForm = document.getElementById('contactForm');
    const contactInfo = document.getElementById('contactInfo');

    if (contactForm) observer.observe(contactForm);
    if (contactInfo) observer.observe(contactInfo);

    // Example: Add a click event to the title
    const title = document.querySelector('.contact-hero-title');
    if (title) {
        title.addEventListener('click', () => {
            alert('You clicked the title!');
        });
    }
});