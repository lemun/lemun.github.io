const domCache = new Map();

function getElement(selector, useCache = true) {
  if (useCache && domCache.has(selector)) {
    return domCache.get(selector);
  }
  const element = document.querySelector(selector);
  if (useCache && element) {
    domCache.set(selector, element);
  }
  return element;
}

function syncContactInfo(dataTestName) {
  const headerSelector = `[data-test-location="header"][data-test-name="${dataTestName}"]`;
  const sidebarSelector = `[data-test-location="sidebar"][data-test-name="${dataTestName}"]`;
  
  const headerElement = getElement(headerSelector);
  const sidebarElement = getElement(sidebarSelector);

  if (headerElement && sidebarElement) {
    headerElement.innerHTML = sidebarElement.innerHTML;
  }
}

async function loadPortfolioData() {
  const response = await fetch('data.json');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Failed to load data.json`);
  }
  return response.json();
}

function validateData(data) {
  const required = ['personal', 'experience', 'education', 'technicalSkills', 'projects'];
  const missing = required.filter(section => !data[section]);
  if (missing.length > 0) {
    throw new Error(`Missing required sections: ${missing.join(', ')}`);
  }
}

const escapeCache = new Map();
let tempDiv = null;

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  
  if (escapeCache.has(text)) {
    return escapeCache.get(text);
  }
  
  if (!tempDiv) {
    tempDiv = document.createElement('div');
  }
  
  tempDiv.textContent = text;
  const escaped = tempDiv.innerHTML;
  
  escapeCache.set(text, escaped);
  return escaped;
}

function buildHighlights(highlights) {
  if (!Array.isArray(highlights)) return '';
  return highlights.map(highlight => `<li>${highlight}</li>`).join('');
}

function buildHeaderSummary(data) {
  const container = getElement('.header-summary p');
  
  if (!container) {
    console.warn('Header summary container not found');
    return;
  }
  
  if (!data.personal?.summary) {
    console.warn('No summary data available');
    return;
  }

  container.innerHTML = data.personal.summary;
  container.classList.remove('loading-placeholder');
}

function buildExperienceSection(data) {
  const container = getElement('.experience-list');
  if (!container || !Array.isArray(data.experience)) {
    console.warn('Experience container not found or invalid data');
    return;
  }

  try {
    const html = data.experience.map(job => {
      const highlights = buildHighlights(job.highlights);
      return `
        <li class="experience-position">
          <div class="experience-header">
            <h3 class="experience-company">${escapeHtml(job.company)}</h3>
            <div class="experience-title">${escapeHtml(job.title)}</div>
            <time datetime="${job.startDate || ''}">${escapeHtml(job.period)}</time>
          </div>
          <ul class="sub-list">
            ${highlights}
          </ul>
        </li>
      `;
    }).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Error building experience section:', error);
  }
}

function buildEducationSection(data) {
  const container = getElement('.education-list');
  if (!container || !Array.isArray(data.education)) {
    console.warn('Education container not found or invalid data');
    return;
  }

  try {
    const html = data.education.map(cert => `
      <li>
        <strong>${escapeHtml(cert.name)}</strong> – 
        ${escapeHtml(cert.issuer)} 
        (<time datetime="${cert.dateTime || ''}">${escapeHtml(cert.date)}</time>)
      </li>
    `).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Error building education section:', error);
  }
}

function buildSkillsSection(data) {
  const container = getElement('.technical-skills dl');
  if (!container || !data.technicalSkills) {
    console.warn('Skills container not found or invalid data');
    return;
  }

  try {
    const html = Object.entries(data.technicalSkills).map(([category, skills]) => `
      <dt>${escapeHtml(category)}</dt>
      <dd>${escapeHtml(skills)}</dd>
    `).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Error building skills section:', error);
  }
}

function buildProjectsSection(data) {
  const container = getElement('.key-projects dl');
  if (!container || !Array.isArray(data.projects)) {
    console.warn('Projects container not found or invalid data');
    return;
  }

  try {
    const html = data.projects.map(project => {
      const isExternal = project.url?.startsWith('http');
      const linkAttrs = isExternal ? 'target="_blank" rel="noopener"' : '';
      
      return `
        <dt>
          <a href="${escapeHtml(project.url)}" ${linkAttrs}>
            <span class="github-prefix">github.com/</span>${escapeHtml(project.name)}
          </a>
        </dt>
        <dd>${escapeHtml(project.description)}</dd>
      `;
    }).join('');

    container.innerHTML = html;
  } catch (error) {
    console.error('Error building projects section:', error);
  }
}

async function initPortfolioContent() {
  const startTime = performance.now();
  
  try {
    const data = await loadPortfolioData();
    validateData(data);
    
    requestAnimationFrame(() => {
      buildHeaderSummary(data);
      buildExperienceSection(data);
      buildEducationSection(data);
      buildSkillsSection(data);
      buildProjectsSection(data);
      
      document.body.classList.add('content-loaded');
      
      const endTime = performance.now();
      console.debug(`Portfolio content loaded in ${(endTime - startTime).toFixed(2)}ms`);
    });
    
  } catch (error) {
    console.error('Failed to load dynamic content:', error.message);
    // Fallback: still show content-loaded class to hide loading placeholders
    document.body.classList.add('content-loaded');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const contactTypes = ["contact-location", "contact-email", "contact-github", "contact-linkedin", "contact-pdf"];
  
  requestAnimationFrame(() => {
    contactTypes.forEach(syncContactInfo);
  });

  await initPortfolioContent();
});
