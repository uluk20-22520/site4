const STORAGE_KEY = 'uluk_site_content_v2';
const LEADS_KEY = 'uluk_site_leads_v2';
const TEMP_RETENTION_DAYS = 45;

let siteData = null;

const defaultDataPromise = fetch('data.json')
  .then((response) => response.json())
  .catch(() => null);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeData(defaults, stored) {
  if (Array.isArray(defaults)) {
    return Array.isArray(stored) ? stored : defaults;
  }
  if (defaults && typeof defaults === 'object') {
    const output = { ...defaults };
    if (!stored || typeof stored !== 'object') {
      return output;
    }
    Object.keys(stored).forEach((key) => {
      output[key] = key in defaults ? mergeData(defaults[key], stored[key]) : stored[key];
    });
    return output;
  }
  return stored ?? defaults;
}

async function getDefaultData() {
  const data = await defaultDataPromise;
  return data ? deepClone(data) : null;
}

async function loadSiteData() {
  const defaults = await getDefaultData();
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    siteData = defaults;
    return siteData;
  }

  try {
    const parsed = JSON.parse(saved);
    siteData = defaults ? mergeData(defaults, parsed) : parsed;
  } catch (error) {
    console.error('Could not parse site data', error);
    siteData = defaults;
  }

  return siteData;
}

function getLeads() {
  cleanupExpiredLeads();
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
  } catch (error) {
    console.error('Could not parse leads', error);
    return [];
  }
}

function saveLeads(leads) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function cleanupExpiredLeads() {
  const raw = localStorage.getItem(LEADS_KEY);
  if (!raw) return;

  try {
    const leads = JSON.parse(raw);
    const now = Date.now();
    const maxAge = TEMP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const filtered = leads.filter((lead) => now - new Date(lead.createdAt).getTime() <= maxAge);

    if (filtered.length !== leads.length) {
      localStorage.setItem(LEADS_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('Could not cleanup leads', error);
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch (error) {
    return value;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element && value !== undefined && value !== null) {
    element.textContent = value;
  }
}

function setLink(id, value, type) {
  const element = document.getElementById(id);
  if (!element || !value) return;
  element.textContent = value;
  element.href = `${type}:${value}`;
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3800);
}

function setPageTitle(title) {
  if (title) {
    document.title = `${title} — УЛУК ИНТЕРНЕШЕНЛ`;
  }
}

function getServiceLink(service) {
  return `service-detail.html?slug=${encodeURIComponent(slugify(service.title))}`;
}

function getCaseLink(item) {
  return `case-detail.html?slug=${encodeURIComponent(slugify(item.title))}`;
}

function renderHero() {
  if (!siteData?.hero) return;

  setText('hero-eyebrow', siteData.hero.eyebrow);
  setText('hero-tagline', siteData.hero.tagline);
  setText('hero-subtitle', siteData.hero.subtitle);

  const cta = document.getElementById('hero-cta');
  if (cta) cta.textContent = siteData.hero.cta || 'Оставить заявку';

  const stats = document.getElementById('hero-stats');
  if (stats && Array.isArray(siteData.hero.stats)) {
    stats.innerHTML = siteData.hero.stats.map((item) => `
      <div class="stat-card">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `).join('');
  }
}

function renderCompany() {
  if (!siteData?.company) return;

  setText('company-name', siteData.company.name);
  setText('company-name-footer', siteData.company.name);
  setText('company-city', siteData.company.city);
  setText('company-address', siteData.company.address);
  setText('footer-city', siteData.company.city);
  setText('footer-address', siteData.company.address);
  setText('company-whatsapp', siteData.company.whatsapp);
  setText('company-telegram', siteData.company.telegram);
  setText('company-email-text', siteData.company.email);
  setText('company-phone-text', siteData.company.phone);
  setText('footer-phone-text', siteData.company.phone);
  setText('footer-email-text', siteData.company.email);

  setLink('company-phone-link', siteData.company.phone, 'tel');
  setLink('company-email-link', siteData.company.email, 'mailto');
  setLink('footer-phone-link', siteData.company.phone, 'tel');
  setLink('footer-email-link', siteData.company.email, 'mailto');
}

function renderAbout() {
  if (!siteData?.about) return;
  setText('about-headline', siteData.about.headline);
  setText('about-text', siteData.about.text);
}

function renderServices(targetId, items, compact = false) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.className = `cards-grid services-grid${compact ? ' compact' : ''}`;
  container.innerHTML = items.map((service) => `
    <article class="card service-card glow-border card-with-action">
      <div class="service-top">
        <div class="service-icon">${escapeHtml(service.icon || '🛠️')}</div>
        <span class="meta">${escapeHtml(service.category || 'Услуга')}</span>
      </div>
      <div>
        <h3>${escapeHtml(service.title)}</h3>
      </div>
      <p>${escapeHtml(service.desc || '')}</p>
      <ul class="features-list">
        ${(service.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
      </ul>
      <div class="card-actions">
        <a class="btn-secondary btn-block" href="${getServiceLink(service)}">Подробнее</a>
      </div>
    </article>
  `).join('');
}

function renderCases(targetId, items) {
  const container = document.getElementById(targetId);
  if (!container) return;

  container.className = 'cards-grid case-grid';
  container.innerHTML = items.map((item, index) => `
    <article class="card case-card glow-border card-with-action">
      <div class="case-top">
        <div class="case-icon">${['⚙️', '📦', '🏪', '📈', '🧩', '🔐'][index % 6]}</div>
        <span class="meta">${escapeHtml(item.industry || 'Кейс')}</span>
      </div>
      <div class="case-body">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="case-block">
          <strong>Задача</strong>
          <p>${escapeHtml(item.task || '')}</p>
        </div>
        <div class="case-block">
          <strong>Результат</strong>
          <p>${escapeHtml(item.result || '')}</p>
        </div>
        <ul class="metrics-list">
          ${(item.metrics || []).map((metric) => `<li>${escapeHtml(metric)}</li>`).join('')}
        </ul>
      </div>
      <div class="card-actions">
        <a class="btn-secondary btn-block" href="${getCaseLink(item)}">Открыть кейс</a>
      </div>
    </article>
  `).join('');
}

function renderTestimonials() {
  const container = document.getElementById('testimonials-grid');
  if (!container || !Array.isArray(siteData?.testimonials)) return;

  container.innerHTML = siteData.testimonials.map((item) => `
    <article class="card testimonial-card glow-border">
      <div class="testimonial-top">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="meta">${escapeHtml(item.company || 'Клиент')}</span>
        </div>
      </div>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join('');
}

function renderFaq() {
  const container = document.getElementById('faq-list');
  if (!container || !Array.isArray(siteData?.faq)) return;

  container.innerHTML = siteData.faq.map((item, index) => `
    <article class="card faq-card">
      <div class="service-top">
        <h3>${escapeHtml(item.q)}</h3>
        <span class="meta">#${index + 1}</span>
      </div>
      <p>${escapeHtml(item.a)}</p>
    </article>
  `).join('');
}

function populateServiceOptions(preferredValue = '') {
  const selects = document.querySelectorAll('[data-service-select]');
  if (!selects.length || !Array.isArray(siteData?.services)) return;

  const optionsHtml = ['<option value="">Выберите услугу</option>']
    .concat(siteData.services.map((service) => {
      const title = escapeHtml(service.title);
      const selected = preferredValue && preferredValue === service.title ? ' selected' : '';
      return `<option value="${title}"${selected}>${title}</option>`;
    }))
    .join('');

  selects.forEach((select) => {
    select.innerHTML = optionsHtml;
  });
}

function prefillContactFormFromQuery() {
  const serviceValue = getQueryParam('service');
  const commentValue = getQueryParam('comment');
  const serviceSelect = document.querySelector('[data-service-select]');
  const commentInput = document.getElementById('contact_comment');

  if (serviceValue && serviceSelect) {
    serviceSelect.value = serviceValue;
  }
  if (commentValue && commentInput && !commentInput.value) {
    commentInput.value = commentValue;
  }
}

function saveLeadLocally(formData) {
  const leads = getLeads();

  const lead = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    status: 'new',
    name: formData.name,
    phone: formData.phone,
    company: formData.company || '',
    service: formData.service || 'Не указано',
    channel: formData.channel || 'Телефон',
    comment: formData.comment || '',
    page: formData.page || document.title
  };

  leads.push(lead);
  saveLeads(leads);
  return lead;
}

function getLeadSuccessMessage(syncResult) {
  const settings = getCloudSettings();
  if (syncResult?.cloudSaved) {
    return settings.telegramEnabled
      ? 'Заявка отправлена. Уведомление передано в Telegram.'
      : 'Заявка отправлена.';
  }
  return 'Заявка отправлена.';
}

function setupLeadForms() {
  const forms = document.querySelectorAll('.js-lead-form');
  if (!forms.length) return;

  forms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = Object.fromEntries(new FormData(form).entries());
      if (!formData.name || !formData.phone) {
        showToast('Заполните имя и телефон.');
        return;
      }

      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        const lead = saveLeadLocally(formData);
        const syncResult = await syncLeadEverywhere(lead).catch((error) => {
          console.error(error);
          return null;
        });

        form.reset();
        populateServiceOptions();
        prefillContactFormFromQuery();
        reapplyDetailFormContext();
        showToast(getLeadSuccessMessage(syncResult));
        renderStorageNote();
      } catch (error) {
        console.error(error);
        showToast('Не удалось сохранить заявку.');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
}

function renderStorageNote() {
  const updatedEl = document.getElementById('local-updated-at');
  if (!updatedEl) return;

  const leads = getLeads();
  if (leads.length) {
    updatedEl.textContent = `Получено заявок: ${leads.length}. Последняя заявка: ${formatDate(leads[leads.length - 1].createdAt)}.`;
    return;
  }

  updatedEl.textContent = 'Оставьте заявку, и мы свяжемся с вами после обработки обращения.';
}

function renderCloudBadges() {
  const settings = getCloudSettings();
  document.querySelectorAll('[data-retention-days]').forEach((el) => {
    el.textContent = TEMP_RETENTION_DAYS;
  });

  const notes = document.querySelectorAll('[data-cloud-mode]');
  notes.forEach((el) => {
    el.textContent = settings.useCloud
      ? 'Облако Supabase подключено. Заявки доступны с разных устройств.'
      : 'Форма заявок подключена.';
  });
}

function getServiceFitItems(service) {
  const category = (service.category || '').toLowerCase();
  const title = (service.title || '').toLowerCase();

  if (category.includes('безопас') || title.includes('камер')) {
    return [
      { title: 'Офисы и магазины', text: 'Если нужно контролировать кассу, вход, склад, офисные зоны и архив записей.' },
      { title: 'Склады и объекты', text: 'Если важно видеть погрузку, периметр, входы и удалённо наблюдать за объектом.' },
      { title: 'Руководители бизнеса', text: 'Если нужен доступ к камерам с телефона и понятный архив событий.' }
    ];
  }

  if (category.includes('офис')) {
    return [
      { title: 'Новые рабочие места', text: 'Для открытия офиса, расширения команды и быстрого запуска сотрудников.' },
      { title: 'Текущая инфраструктура', text: 'Для обновления техники, устранения сбоев и унификации оборудования.' },
      { title: 'Руководитель и HR', text: 'Когда нужно быстро подготовить рабочее место для нового сотрудника.' }
    ];
  }

  if (category.includes('поставка') || category.includes('по')) {
    return [
      { title: 'Компании с закупками', text: 'Когда нужно подобрать оборудование и ПО без лишних ошибок и лишних закупок.' },
      { title: 'Бизнес с несколькими точками', text: 'Если нужно согласовать единый состав техники и лицензий для всех объектов.' },
      { title: 'Руководители и бухгалтерия', text: 'Если важны прозрачные спецификации, бюджеты и учёт лицензий.' }
    ];
  }

  return [
    { title: 'Малый и средний бизнес', text: 'Для компаний, которым нужен понятный и практичный IT-подрядчик.' },
    { title: 'Офисы, магазины, склады', text: 'Для объектов, где важна стабильная техника, связь и поддержка.' },
    { title: 'Разовые и постоянные задачи', text: 'Для разового внедрения или регулярного сопровождения по заявкам.' }
  ];
}

function getServiceSteps(service) {
  return [
    { title: '1. Уточняем задачу', text: `Обсуждаем объект, сроки, бюджет и детали по услуге «${service.title}».` },
    { title: '2. Готовим решение', text: 'Подбираем технику, ПО, схему подключения и согласовываем состав работ.' },
    { title: '3. Выполняем работы', text: 'Проводим монтаж, настройку, тестирование и передаём готовое решение.' }
  ];
}

function getCaseSteps(item) {
  return [
    { title: 'Старт', text: item.task || 'Уточнили задачу и ограничения клиента.' },
    { title: 'Реализация', text: item.solution || 'Выполнили настройку, внедрение и запуск решения.' },
    { title: 'Итог', text: item.result || 'Получили измеримый результат и понятный эффект для бизнеса.' }
  ];
}

function renderStepList(targetId, steps) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = steps.map((step) => `
    <div class="step-card">
      <strong>${escapeHtml(step.title)}</strong>
      <p>${escapeHtml(step.text)}</p>
    </div>
  `).join('');
}

function renderInfoList(targetId, items) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = items.map((item) => `
    <div class="info-item">
      <strong>${escapeHtml(item.title)}</strong>${escapeHtml(item.text)}
    </div>
  `).join('');
}

function renderNotFound(blockId, message, backLink, backText) {
  const block = document.getElementById(blockId);
  if (!block) return;
  block.innerHTML = `
    <div class="panel glow-border detail-missing">
      <h1>${escapeHtml(message)}</h1>
      <a class="btn-primary" href="${escapeHtml(backLink)}">${escapeHtml(backText)}</a>
    </div>
  `;
}

function renderServiceDetailPage() {
  const marker = document.getElementById('detailServiceTitle');
  if (!marker || !Array.isArray(siteData?.services)) return;

  const slug = getQueryParam('slug');
  const service = siteData.services.find((item) => slugify(item.title) === slug) || siteData.services[0];
  if (!service) return;

  setPageTitle(service.title);
  setText('detailServiceTitle', service.title);
  setText('detailServiceCategory', service.category || 'Услуга');
  setText('detailServiceDesc', service.desc || 'Описание услуги недоступно.');
  setText('detailServiceIcon', service.icon || '🛠️');

  const features = document.getElementById('detailServiceFeatures');
  if (features) {
    features.innerHTML = (service.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join('') || '<li>Состав работ уточняется по заявке.</li>';
  }

  renderStepList('detailServiceSteps', getServiceSteps(service));
  renderInfoList('detailServiceBenefits', getServiceFitItems(service));

  const hidden = document.getElementById('detailServiceHidden');
  const shown = document.getElementById('detail_service_name');
  const comment = document.getElementById('detail_comment');
  if (hidden) hidden.value = service.title;
  if (shown) shown.value = service.title;
  if (comment && !comment.value) {
    comment.placeholder = `Например: нужен расчёт по услуге «${service.title}»`;
  }
}

function renderCaseDetailPage() {
  const marker = document.getElementById('detailCaseTitle');
  if (!marker || !Array.isArray(siteData?.cases)) return;

  const slug = getQueryParam('slug');
  const item = siteData.cases.find((entry) => slugify(entry.title) === slug) || siteData.cases[0];
  if (!item) return;

  setPageTitle(item.title);
  setText('detailCaseTitle', item.title);
  setText('detailCaseIndustry', item.industry || 'Кейс');
  setText('detailCaseLead', item.solution || item.task || 'Описание кейса недоступно.');
  setText('detailCaseTask', item.task || 'Задача кейса не указана.');
  setText('detailCaseResult', item.result || 'Результат кейса не указан.');
  setText('detailCaseIcon', '📁');

  const metrics = document.getElementById('detailCaseMetrics');
  if (metrics) {
    metrics.innerHTML = (item.metrics || []).map((metric) => `<li>${escapeHtml(metric)}</li>`).join('') || '<li>Результаты уточняются по запросу.</li>';
  }

  renderStepList('detailCaseSteps', getCaseSteps(item));

  const hidden = document.getElementById('detailCaseHidden');
  const shown = document.getElementById('case_project_name');
  const comment = document.getElementById('case_comment');
  const projectTitle = `Похожий проект: ${item.title}`;
  if (hidden) hidden.value = projectTitle;
  if (shown) shown.value = item.title;
  if (comment && !comment.value) {
    comment.placeholder = `Например: нужен похожий проект для направления «${item.industry || item.title}»`;
  }
}

function reapplyDetailFormContext() {
  const serviceHidden = document.getElementById('detailServiceHidden');
  const serviceShown = document.getElementById('detail_service_name');
  if (serviceHidden && serviceShown && !serviceShown.value) {
    serviceShown.value = serviceHidden.value;
  }

  const caseHidden = document.getElementById('detailCaseHidden');
  const caseShown = document.getElementById('case_project_name');
  if (caseHidden && caseShown && !caseShown.value) {
    caseShown.value = caseHidden.value.replace(/^Похожий проект:\s*/, '');
  }
}

async function renderPage() {
  await loadSiteData();
  if (!siteData) return;

  renderHero();
  renderCompany();
  renderAbout();
  populateServiceOptions(getQueryParam('service'));
  prefillContactFormFromQuery();

  if (Array.isArray(siteData.services)) {
    renderServices('services-grid', siteData.services.slice(0, 6), true);
    renderServices('servicesGridFull', siteData.services);
  }

  if (Array.isArray(siteData.cases)) {
    renderCases('cases-preview-grid', siteData.cases.slice(0, 3));
    renderCases('casesGrid', siteData.cases);
  }

  renderServiceDetailPage();
  renderCaseDetailPage();
  renderTestimonials();
  renderFaq();
  renderCloudBadges();
  setupLeadForms();
  renderStorageNote();
  reapplyDetailFormContext();
}

document.addEventListener('DOMContentLoaded', renderPage);
