const STORAGE_KEY = 'study-note-upgraded-state';

const avatarSvg =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="80" fill="%232563eb"/><text x="80" y="96" text-anchor="middle" font-size="58" font-family="Arial" fill="white">学</text></svg>';

const defaultState = {
  auth: {
    isLoggedIn: false,
    token: '',
    mode: 'login',
    settings: {
      theme: 'light',
      fontSize: 'medium',
    },
  },
  user: {
    id: 'u001',
    account: 'learner@example.com',
    password: '123456',
    name: '学习者',
    bio: '专注记录学习成长',
    avatar: avatarSvg,
  },
  activeProjectId: 'p1',
  projects: [
    {
      id: 'p1',
      title: '前端基础',
      lastModified: '2026-04-29',
      content: '# HTML / CSS / JavaScript\n\n1. HTML 负责页面结构\n2. CSS 负责视觉样式\n3. JavaScript 负责交互逻辑',
      attachments: [],
    },
    {
      id: 'p2',
      title: '机器学习',
      lastModified: '2026-04-29',
      content: '# YOLOv8 学习笔记\n\n- 数据集需要先完成标注和划分\n- 训练结束后重点查看 mAP、Precision、Recall\n- 图片和文档可以拖拽上传到附件管理栏',
      attachments: [],
    },
    {
      id: 'p3',
      title: '深度学习',
      lastModified: '2026-04-29',
      content: '# 深度学习\n\n记录模型结构、训练参数、实验结论和参考资料。',
      attachments: [],
    },
  ],
};

let state = loadState();
let projectKeyword = '';
let contentKeyword = '';
let toastTimer = null;

const dom = {
  authPage: document.querySelector('#authPage'),
  appPage: document.querySelector('#appPage'),
  authTitle: document.querySelector('#authTitle'),
  loginTab: document.querySelector('#loginTab'),
  registerTab: document.querySelector('#registerTab'),
  authForm: document.querySelector('#authForm'),
  accountInput: document.querySelector('#accountInput'),
  passwordInput: document.querySelector('#passwordInput'),
  confirmPasswordInput: document.querySelector('#confirmPasswordInput'),
  registerNicknameInput: document.querySelector('#registerNicknameInput'),
  authSubmitButton: document.querySelector('#authSubmitButton'),
  registerOnlyFields: document.querySelectorAll('.register-only'),
  profileEntry: document.querySelector('#profileEntry'),
  sidebarAvatar: document.querySelector('#sidebarAvatar'),
  sidebarNickname: document.querySelector('#sidebarNickname'),
  sidebarBio: document.querySelector('#sidebarBio'),
  projectSearchInput: document.querySelector('#projectSearchInput'),
  projectCount: document.querySelector('#projectCount'),
  projectList: document.querySelector('#projectList'),
  addProjectButton: document.querySelector('#addProjectButton'),
  settingsEntry: document.querySelector('#settingsEntry'),
  logoutButton: document.querySelector('#logoutButton'),
  editorPanel: document.querySelector('#editorPanel'),
  profilePanel: document.querySelector('#profilePanel'),
  settingsPanel: document.querySelector('#settingsPanel'),
  projectTitleInput: document.querySelector('#projectTitleInput'),
  saveStatus: document.querySelector('#saveStatus'),
  deleteProjectButton: document.querySelector('#deleteProjectButton'),
  saveNoteButton: document.querySelector('#saveNoteButton'),
  contentSearchInput: document.querySelector('#contentSearchInput'),
  contentSearchResult: document.querySelector('#contentSearchResult'),
  noteEditor: document.querySelector('#noteEditor'),
  dropZone: document.querySelector('#dropZone'),
  attachmentInput: document.querySelector('#attachmentInput'),
  attachmentList: document.querySelector('#attachmentList'),
  avatarInput: document.querySelector('#avatarInput'),
  profileAvatar: document.querySelector('#profileAvatar'),
  nicknameInput: document.querySelector('#nicknameInput'),
  bioInput: document.querySelector('#bioInput'),
  saveProfileButton: document.querySelector('#saveProfileButton'),
  themeToggleButton: document.querySelector('#themeToggleButton'),
  fontSizeGroup: document.querySelector('#fontSizeGroup'),
  toast: document.querySelector('#toast'),
};

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return structuredClone(defaultState);
  }

  try {
    const parsedState = JSON.parse(savedState);

    return {
      ...structuredClone(defaultState),
      ...parsedState,
      auth: {
        ...structuredClone(defaultState.auth),
        ...parsedState.auth,
        settings: {
          ...structuredClone(defaultState.auth.settings),
          ...parsedState.auth?.settings,
        },
      },
      user: {
        ...structuredClone(defaultState.user),
        ...parsedState.user,
      },
      projects: parsedState.projects?.length ? parsedState.projects : structuredClone(defaultState.projects),
    };
  } catch (error) {
    console.warn('本地数据解析失败，已恢复默认数据。', error);
    return structuredClone(defaultState);
  }
}

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getActiveProject = () => state.projects.find((project) => project.id === state.activeProjectId);

const getToday = () => new Date().toISOString().slice(0, 10);

const showToast = (message) => {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.classList.remove('show');
  }, 2200);
};

const applySettings = () => {
  const { theme, fontSize } = state.auth.settings;
  const sizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };

  document.body.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.setProperty('--app-font-size', sizeMap[fontSize] || sizeMap.medium);
  dom.themeToggleButton.textContent = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';

  dom.fontSizeGroup.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === fontSize);
  });
};

const showPanel = (panelName) => {
  const panelMap = {
    editor: dom.editorPanel,
    profile: dom.profilePanel,
    settings: dom.settingsPanel,
  };

  Object.values(panelMap).forEach((panel) => panel.classList.add('hidden'));
  panelMap[panelName].classList.remove('hidden');
};

const guardRoute = () => {
  if (state.auth.isLoggedIn && state.auth.token) {
    dom.authPage.classList.add('hidden');
    dom.appPage.classList.remove('hidden');
    showPanel('editor');
    return;
  }

  dom.authPage.classList.remove('hidden');
  dom.appPage.classList.add('hidden');
};

const setAuthMode = (mode) => {
  state.auth.mode = mode;
  dom.loginTab.classList.toggle('active', mode === 'login');
  dom.registerTab.classList.toggle('active', mode === 'register');
  dom.authTitle.textContent = mode === 'login' ? '登录学习空间' : '注册学习空间';
  dom.authSubmitButton.textContent = mode === 'login' ? '登录' : '创建账号';
  dom.registerOnlyFields.forEach((field) => field.classList.toggle('hidden', mode !== 'register'));
};

const validateEmailOrAccount = (account) => {
  const emailRegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const accountRegExp = /^[A-Za-z0-9_]{3,20}$/;

  return emailRegExp.test(account) || accountRegExp.test(account);
};

const handleAuthSubmit = (event) => {
  event.preventDefault();

  const account = dom.accountInput.value.trim();
  const password = dom.passwordInput.value.trim();
  const confirmPassword = dom.confirmPasswordInput.value.trim();
  const nickname = dom.registerNicknameInput.value.trim();

  if (!validateEmailOrAccount(account)) {
    showToast('请输入合法邮箱，或 3-20 位账号');
    return;
  }

  if (password.length < 6) {
    showToast('密码至少需要 6 位');
    return;
  }

  if (state.auth.mode === 'register') {
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致');
      return;
    }

    if (nickname.length < 2) {
      showToast('昵称至少需要 2 个字符');
      return;
    }

    state.user.account = account;
    state.user.password = password;
    state.user.name = nickname;
  } else if (account !== state.user.account || password !== state.user.password) {
    showToast('账号或密码不正确，默认账号 learner@example.com / 123456');
    return;
  }

  state.auth.isLoggedIn = true;
  state.auth.token = `bearer_${Date.now()}`;
  saveState();
  render();
  guardRoute();
  showToast(state.auth.mode === 'register' ? '注册并登录成功' : '登录成功');
};

const getFilteredProjects = () => {
  const keyword = projectKeyword.trim().toLowerCase();

  if (!keyword) {
    return state.projects;
  }

  return state.projects.filter((project) => project.title.toLowerCase().includes(keyword));
};

const renderUser = () => {
  dom.sidebarAvatar.src = state.user.avatar;
  dom.profileAvatar.src = state.user.avatar;
  dom.sidebarNickname.textContent = state.user.name;
  dom.sidebarBio.textContent = state.user.bio || '还没有个人简介';
  dom.nicknameInput.value = state.user.name;
  dom.bioInput.value = state.user.bio || '';
};

const renderProjects = () => {
  const filteredProjects = getFilteredProjects();

  dom.projectCount.textContent = `${filteredProjects.length} 个`;
  dom.projectList.innerHTML = '';

  if (filteredProjects.length === 0) {
    dom.projectList.innerHTML = '<div class="empty-state">没有匹配的项目</div>';
    return;
  }

  filteredProjects.forEach((project) => {
    const button = document.createElement('button');
    button.className = `project-button${project.id === state.activeProjectId ? ' active' : ''}`;
    button.type = 'button';
    button.innerHTML = `
      <span>
        <strong>${project.title}</strong>
        <small>${project.lastModified} · ${project.attachments.length} 个附件</small>
      </span>
      <span>›</span>
    `;

    button.addEventListener('click', () => {
      state.activeProjectId = project.id;
      contentKeyword = '';
      dom.contentSearchInput.value = '';
      saveState();
      render();
      showPanel('editor');
    });

    dom.projectList.appendChild(button);
  });
};

const renderContentSearch = () => {
  const activeProject = getActiveProject();
  const keyword = contentKeyword.trim().toLowerCase();

  if (!activeProject || !keyword) {
    dom.contentSearchResult.textContent = '输入关键词后显示匹配结果。';
    return;
  }

  const lowerContent = activeProject.content.toLowerCase();
  const matchIndex = lowerContent.indexOf(keyword);

  if (matchIndex === -1) {
    dom.contentSearchResult.textContent = '当前笔记正文中没有匹配内容。';
    return;
  }

  const start = Math.max(0, matchIndex - 18);
  const end = Math.min(activeProject.content.length, matchIndex + keyword.length + 36);
  const preview = activeProject.content.slice(start, end).replace(/\n/g, ' ');

  dom.contentSearchResult.textContent = `找到匹配：...${preview}...`;
};

const renderEditor = () => {
  const activeProject = getActiveProject();

  if (!activeProject) {
    dom.projectTitleInput.value = '';
    dom.noteEditor.value = '';
    dom.attachmentList.innerHTML = '<div class="empty-state">请先新建一个项目</div>';
    return;
  }

  dom.projectTitleInput.value = activeProject.title;
  dom.noteEditor.value = activeProject.content;
  dom.saveStatus.textContent = `已同步 · ${activeProject.lastModified}`;
  renderContentSearch();
  renderAttachments(activeProject);
};

const renderAttachments = (project) => {
  dom.attachmentList.innerHTML = '';

  if (project.attachments.length === 0) {
    dom.attachmentList.innerHTML = '<div class="empty-state">还没有附件，可以上传或拖拽图片、文档。</div>';
    return;
  }

  project.attachments.forEach((file) => {
    const card = document.createElement('article');
    card.className = 'attachment-card';

    const previewHtml = file.type === 'image'
      ? `<img class="attachment-preview" src="${file.url}" alt="${file.name}" />`
      : '<div class="file-icon">DOC</div>';

    card.innerHTML = `
      <button class="remove-attachment" type="button" aria-label="移除附件">×</button>
      ${previewHtml}
      <div class="attachment-info">
        <strong title="${file.name}">${file.name}</strong>
        <small>${file.type === 'image' ? '图片附件' : '文档附件'}</small>
        <a href="${file.url}" download="${file.name}" target="_blank" rel="noreferrer">预览 / 下载</a>
      </div>
    `;

    card.querySelector('.remove-attachment').addEventListener('click', () => {
      removeAttachment(file.id);
    });

    dom.attachmentList.appendChild(card);
  });
};

const render = () => {
  applySettings();
  renderUser();
  renderProjects();
  renderEditor();
};

const syncActiveProject = () => {
  const activeProject = getActiveProject();

  if (!activeProject) {
    return null;
  }

  activeProject.title = dom.projectTitleInput.value.trim() || '未命名项目';
  activeProject.content = dom.noteEditor.value.trim();
  activeProject.lastModified = getToday();
  saveState();

  return activeProject;
};

const markUnsaved = () => {
  dom.saveStatus.textContent = '有未保存修改';
};

const addProject = () => {
  const nextIndex = state.projects.length + 1;
  const newProject = {
    id: `p${Date.now()}`,
    title: `新建项目 ${nextIndex}`,
    lastModified: getToday(),
    content: '# 新建笔记\n\n在这里补充你的学习内容。',
    attachments: [],
  };

  state.projects.push(newProject);
  state.activeProjectId = newProject.id;
  projectKeyword = '';
  dom.projectSearchInput.value = '';
  saveState();
  render();
  showPanel('editor');
  showToast('已新建项目');
};

const deleteActiveProject = () => {
  if (state.projects.length <= 1) {
    showToast('至少保留一个项目');
    return;
  }

  const activeProject = getActiveProject();
  const confirmed = window.confirm('确定要删除该笔记及其所有附件吗？');

  if (!confirmed || !activeProject) {
    return;
  }

  state.projects = state.projects.filter((project) => project.id !== activeProject.id);
  state.activeProjectId = state.projects[0].id;
  saveState();
  render();
  showToast('删除成功');
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();

  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const addAttachments = async (files) => {
  const activeProject = syncActiveProject();

  if (!activeProject || files.length === 0) {
    return;
  }

  // 将文件转成 DataURL 保存，纯前端也能完成缩略图预览和下载。
  const attachments = await Promise.all(files.map(async (file) => {
    const url = await readFileAsDataUrl(file);

    return {
      id: `f${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'doc',
      url,
    };
  }));

  activeProject.attachments.push(...attachments);
  activeProject.lastModified = getToday();
  saveState();
  render();
  showToast('附件已上传并保存');
};

const removeAttachment = (fileId) => {
  const activeProject = getActiveProject();

  if (!activeProject) {
    return;
  }

  activeProject.attachments = activeProject.attachments.filter((file) => file.id !== fileId);
  activeProject.lastModified = getToday();
  saveState();
  render();
  showToast('附件删除成功');
};

const handleAttachmentUpload = async (event) => {
  const files = Array.from(event.target.files || []);

  await addAttachments(files);
  event.target.value = '';
};

const handleAvatarChange = async (event) => {
  const [file] = Array.from(event.target.files || []);

  if (!file) {
    return;
  }

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片作为头像');
    return;
  }

  state.user.avatar = await readFileAsDataUrl(file);
  saveState();
  renderUser();
  showToast('头像预览已更新');
};

const saveProfile = () => {
  const nickname = dom.nicknameInput.value.trim();
  const bio = dom.bioInput.value.trim();

  if (nickname.length < 2) {
    showToast('昵称至少需要 2 个字符');
    return;
  }

  state.user.name = nickname;
  state.user.bio = bio;
  saveState();
  renderUser();
  showToast('个人信息已保存');
};

const applyEditorCommand = (command) => {
  const start = dom.noteEditor.selectionStart;
  const end = dom.noteEditor.selectionEnd;
  const selectedText = dom.noteEditor.value.slice(start, end) || '请输入内容';
  const commandMap = {
    bold: `**${selectedText}**`,
    heading: `## ${selectedText}`,
    list: selectedText
      .split('\n')
      .map((line) => `- ${line}`)
      .join('\n'),
    quote: selectedText
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n'),
  };

  dom.noteEditor.setRangeText(commandMap[command], start, end, 'end');
  dom.noteEditor.focus();
  markUnsaved();
};

const toggleTheme = () => {
  state.auth.settings.theme = state.auth.settings.theme === 'dark' ? 'light' : 'dark';
  saveState();
  applySettings();
  showToast('主题设置已保存');
};

const changeFontSize = (size) => {
  state.auth.settings.fontSize = size;
  saveState();
  applySettings();
  showToast('字号设置已保存');
};

const logout = () => {
  state.auth.isLoggedIn = false;
  state.auth.token = '';
  saveState();
  guardRoute();
  showToast('已退出登录');
};

dom.loginTab.addEventListener('click', () => setAuthMode('login'));
dom.registerTab.addEventListener('click', () => setAuthMode('register'));
dom.authForm.addEventListener('submit', handleAuthSubmit);
dom.profileEntry.addEventListener('click', () => showPanel('profile'));
dom.settingsEntry.addEventListener('click', () => showPanel('settings'));
dom.logoutButton.addEventListener('click', logout);
dom.addProjectButton.addEventListener('click', addProject);
dom.deleteProjectButton.addEventListener('click', deleteActiveProject);
dom.attachmentInput.addEventListener('change', handleAttachmentUpload);
dom.avatarInput.addEventListener('change', handleAvatarChange);
dom.saveProfileButton.addEventListener('click', saveProfile);
dom.themeToggleButton.addEventListener('click', toggleTheme);

document.querySelectorAll('[data-panel]').forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

document.querySelectorAll('.editor-toolbar button').forEach((button) => {
  button.addEventListener('click', () => applyEditorCommand(button.dataset.command));
});

dom.fontSizeGroup.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => changeFontSize(button.dataset.size));
});

dom.saveNoteButton.addEventListener('click', () => {
  syncActiveProject();
  render();
  showToast('笔记已保存到本地');
});

dom.projectSearchInput.addEventListener('input', (event) => {
  projectKeyword = event.target.value;
  renderProjects();
});

dom.contentSearchInput.addEventListener('input', (event) => {
  contentKeyword = event.target.value;
  renderContentSearch();
});

dom.projectTitleInput.addEventListener('input', markUnsaved);
dom.noteEditor.addEventListener('input', markUnsaved);

dom.projectTitleInput.addEventListener('change', () => {
  syncActiveProject();
  renderProjects();
});

dom.dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dom.dropZone.classList.add('drag-over');
});

dom.dropZone.addEventListener('dragleave', () => {
  dom.dropZone.classList.remove('drag-over');
});

dom.dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  dom.dropZone.classList.remove('drag-over');
  await addAttachments(Array.from(event.dataTransfer.files || []));
});

setAuthMode(state.auth.mode || 'login');
render();
guardRoute();
