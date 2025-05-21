// Expand all button functionality
const expandAllButton = document.getElementById('expandAllButton');
let allExpanded = false;

expandAllButton.addEventListener('click', function () {
    allExpanded = !allExpanded;
    const allContents = document.querySelectorAll('details.vscode-collapsible');

    this.setAttribute('appearance', allExpanded ? 'primary' : 'secondary');

    allContents.forEach(content => {
        if (allExpanded) {
            content.setAttribute('open', '');
        } else {
            content.removeAttribute('open');
        }
    });

    this.textContent = allExpanded ? 'Collapse All Sections' : 'Expand All Sections';
});

// Handle initial section states
window.addEventListener('DOMContentLoaded', () => {
    // Ensure all sections start collapsed
    document.querySelectorAll('details.vscode-collapsible').forEach(section => {
        section.removeAttribute('open');
    });

    // Only expand failed tests section if there are failures
    const failedTestsSection = document.querySelector('.test-section details.vscode-collapsible h2');
    if (failedTestsSection) {
        const failedCountMatch = failedTestsSection.textContent.match(/Failed Tests \((\d+)\)/);
        if (failedCountMatch) {
            const failedCount = parseInt(failedCountMatch[1]);
            if (failedCount > 0) {
                failedTestsSection.closest('details').setAttribute('open', '');
            }
        }
    }
});
