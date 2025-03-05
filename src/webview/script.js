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

// Expand failed tests by default
window.addEventListener('DOMContentLoaded', () => {
    const failedTestsSection = document.querySelector('.test-section');
    if (failedTestsSection) {
        const failedCount = parseInt(failedTestsSection.querySelector('.vscode-collapsable h2').textContent.match(/\d+/)[0]);
        if (failedCount > 0) {
            const sectionButton = failedTestsSection.querySelector('.vscode-collapsable');
        }
    }
});
