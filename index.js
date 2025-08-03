function wrapHeadingCharacters() {
    document.querySelectorAll('h1, h2').forEach(heading => {
        const chars = heading.textContent.split('');
        heading.innerHTML = chars.map((char, i) => {
            const cls = i % 2 === 0 ? 'curse' : 'blessing';
            return `<span class="${cls}">${char}</span>`;
        }).join('');
    });
}

// Call the function after DOM is loaded
document.addEventListener('DOMContentLoaded', wrapHeadingCharacters);