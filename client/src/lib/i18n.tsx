import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Language types
export type Language = 'en' | 'pt' | 'es';

// Translation definitions
export const translations = {
  en: {
    // Navigation & General
    dashboard: "Dashboard",
    projects: "Projects",
    upload: "Upload",
    validation: "Transcription",
    users: "Users",
    languages: "Languages",
    settings: "Settings",
    logout: "Logout",
    
    // Dashboard
    dashboardTitle: "AudioSeg Dashboard",
    welcomeMessage: "Welcome to the intelligent audio segmentation system",
    activeProjects: "Active Projects",
    processedHours: "Processed Hours",
    validatedSegments: "Transcribed Segments",
    recentActivity: "Recent Activity",
    
    // Projects
    projectsTitle: "Audio Projects",
    createProject: "Create New Project",
    projectName: "Project Name",
    audioFile: "Audio File",
    language: "Language",
    status: "Status",
    duration: "Duration",
    segments: "Segments",
    actions: "Actions",
    validate: "Transcribe",
    export: "Export",
    delete: "Delete",
    
    // Upload
    uploadTitle: "Upload Audio File",
    uploadDescription: "Upload an audio file to start segmentation",
    dragDropArea: "Drag and drop your audio file here, or click to browse",
    supportedFormats: "Supported formats: WAV, MP3, M4A",
    maxFileSize: "Maximum file size: 500MB",
    uploading: "Uploading...",
    uploadSuccess: "File uploaded successfully!",
    uploadError: "Upload failed. Please try again.",
    
    // Transcription
    validationTitle: "Transcription",
    audioPlayer: "Audio Player",
    segmentEditor: "Segment Editor",
    mode: "Mode",
    advanced: "Advanced",
    basic: "Basic",
    transcription: "Transcription",
    translation: "Translation",
    enterTranslation: "Enter translation here...",
    saving: "Saving...",
    confidence: "Confidence",
    segmentOf: "Segment {current} of {total}",
    playSegment: "Play Segment",
    stopSegment: "Stop Segment",
    save: "Save",
    approve: "Approve",
    reject: "Reject",
    
    // Segmentation controls
    method: "Method",
    segment: "Segment",
    transcribe: "Transcribe",
    exportConfig: "Export Config",
    spreadsheet: "Spreadsheet",
    audioZip: "Audio ZIP",
    deleteAll: "Delete All",
    deleting: "Deleting...",
    processing: "Processing...",
    
    // Audio controls
    play: "Play",
    pause: "Pause",
    volume: "Volume",
    mute: "Mute",
    unmute: "Unmute",
    
    // Segment editing
    cut: "Cut",
    remove: "Remove",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    reset: "Reset",
    
    // Users management
    usersTitle: "User Management",
    userProfile: "User Profile",
    email: "Email",
    role: "Role",
    manager: "Manager",
    editor: "Editor",
    active: "Active",
    inactive: "Inactive",
    assignedLanguages: "Assigned Languages",
    assignLanguage: "Assign Language",
    removeLanguage: "Remove Language",
    
    // Messages
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
    loading: "Loading...",
    noData: "No data available",
    
    // Confirmations
    confirmDeleteAll: "Are you sure you want to delete ALL segments? This action cannot be undone.",
    confirmDeleteProject: "Are you sure you want to delete the project \"{projectName}\"? This action cannot be undone.",
    
    // Interface messages
    view: "View",
    download: "Download",
    boundaryFScore: "Boundary F-score",
    details: "Details",
    review: "Review", 
    recentProjects: "Recent Projects",
    viewAll: "View All",
    loadingUsers: "Loading users...",
    loadingLanguages: "Loading languages...",
    unauthorized: "Unauthorized",
    loginRequired: "You need to be logged in. Redirecting...",
    accessDenied: "Access Denied",
    managerOnlyAccess: "Only managers can access this page.",
    usersList: "Users List",
    languageManagement: "Language Management",
    roleUpdated: "Role Updated",
    roleUpdatedSuccess: "User role has been updated successfully.",
    basicInterfaceDisabled: "Basic interface disabled",
    enableAdvancedEditor: "Enable Advanced Editor",
    improveWithVAD: "Improve with VAD",
    generateTranscriptions: "Generate Transcriptions",
    
    // Project info
    originalFilename: "Original Filename",
    validated: "transcribed",
    
    // Status
    readyForValidation: "Ready for Transcription",
    inValidation: "In Transcription",
    completed: "Completed",
    projectDeleted: "Project Deleted",
    
    // Additional UI text
    dashboardOverview: "Overview of projects and activities",
    allLanguages: "All Languages",
    newProject: "New Project",
    projectsDescription: "Manage and track all your audio segmentation projects",
    searchProjects: "Search projects...",
    newSegmentationProject: "New Segmentation Project",
    invalidFormat: "Invalid Format",
    selectValidAudio: "Please select a valid audio file (WAV, MP3, M4A).",
    requiredFields: "Required Fields",
    selectFileAndName: "Please select a file and provide a project name.",
    uploadSuccessDescription: "File uploaded and being processed. Redirecting to projects...",
    
    // Filter & status text
    filterByStatus: "Filter by status",
    allStatuses: "All statuses",
    filterByLanguage: "Filter by language",
    loadingProjects: "Loading projects...",
    noProjectsFound: "No projects found",
    noProjectsYet: "No projects yet",
    adjustFilters: "Try adjusting the filters to find the desired projects.",
    uploadFirstProject: "Start by uploading an audio file to create your first project.",
    
    // Upload page text
    dragAudioFile: "Drag an audio file here",
    clickToSelect: "or click to select a file",
    projectNameLabel: "Project Name",
    projectNamePlaceholder: "E.g.: Podcast Interview - Episode 15",
    projectWillBeProcessed: "The project will be processed as a custom language, without specific language restrictions.",
    
    // Dashboard stats
    activeProjectsLabel: "Active Projects",
    processedHoursLabel: "Processed Hours", 
    validatedSegmentsLabel: "Transcribed Segments",
    accuracyRateLabel: "Accuracy Rate",
    vsPreviousMonth: "vs. previous month",
    
    // Folders
    folders: "Folders",
    createFolder: "Create Folder",
    folderName: "Folder Name",
    folderNamePlaceholder: "e.g., Introduction",
    folderDescription: "Description",
    folderDescriptionPlaceholder: "Optional description for this folder",
    editFolder: "Edit Folder",
    deleteFolder: "Delete Folder",
    confirmDeleteFolder: "Are you sure you want to delete the folder \"{folderName}\"? All segments in this folder will also be deleted.",
    folderCreated: "Folder Created",
    folderUpdated: "Folder Updated",
    folderDeleted: "Folder Deleted",
    noFoldersYet: "No folders yet",
    noFoldersFound: "No folders found",
    createFirstFolder: "Create your first folder to organize segments",
    loadingFolders: "Loading folders...",
    projectDetails: "Project Details",
    backToProjects: "Back to Projects",
    segmentsCount: "{count} segments",
    foldersCount: "{count} folders",
    uploadSegments: "Upload Segments",
    selectAudioFiles: "Select Audio Files",
    dragDropFiles: "Drag files here or click to select",
    uploadingFiles: "Uploading files...",
    filesUploaded: "Files uploaded successfully",
    noSegmentsYet: "No segments yet",
    createFirstSegment: "Upload your first audio segments to this folder",
    uploadNewSegments: "Upload New Segments",
    segmentDetails: "Segment Details",
    filename: "Filename",
    transcriptionStatus: "Transcription Status",
    notTranscribed: "Not transcribed",
    transcribed: "Transcribed",
    notTranslated: "Not translated",
    translated: "Translated",
    pending: "Pending",
    fileCount: "{count} file(s)",
    backToFolder: "Back to Folder",
    loadingSegments: "Loading segments...",
    transcribeSegment: "Transcribe Segment",
    manualTranscription: "Manual Transcription",
    saveTranscription: "Save Transcription",
    transcriptionSaved: "Transcription saved successfully",
    enterTranscription: "Enter transcription here...",
    characterCount: "{count} characters",
    previousSegment: "Previous Segment",
    nextSegment: "Next Segment",
    noTranscription: "No transcription yet",
    deleteProject: "Delete Project",
    sortBy: "Sort by",
    order: "Order",
    name: "Name",
    date: "Date",
    ascending: "Ascending",
    descending: "Descending",
    segmentsReordered: "Segments reordered",
    orderUpdatedSuccess: "Order updated successfully",
    editProjectName: "Edit project name",
    projectUpdated: "Project updated",
    recalculateStats: "Recalculate Stats",
    statsRecalculated: "Statistics recalculated",
    confirmRecalculateStats: "Recalculate project statistics? This will update duration and segment counts based on actual audio files.",
    recalculateAllStats: "Recalculate All Stats",
    allStatsRecalculated: "All project statistics recalculated",
        confirmRecalculateAllStats: "Recalculate statistics for all projects? This will update duration and segment counts based on actual audio files.",
        navigation: "Navigation",
        admin: "Admin",
        user: "User",
        confirmLogout: "Are you sure you want to logout?",
        
        // Additional missing keys
        createFirstProject: "Create First Project",
        failedToLoadAudio: "Failed to load audio",
        audioSegment: "Audio Segment",
        uploadErrorMessage: "Error uploading file",
        selectAtLeastOneFile: "Select at least one file",
        enterProjectName: "Enter project name",
        enterProjectNamePlaceholder: "Enter project name",
        moveUp: "Move up",
        moveDown: "Move down",
        bytes: "Bytes",
        kb: "KB",
        mb: "MB",
        gb: "GB",
        enterKey: "Enter",
        escapeKey: "Escape",
        invalidCredentials: "Invalid username or password",
        enterUsername: "Enter your username",
        enterPassword: "Enter your password",
        signingIn: "Signing in...",
        signIn: "Sign in",
        signInToSystem: "Sign In to System",
    automaticDetection: "Automatic Detection",
    automaticDetectionDescription: "Advanced prosodic analysis algorithms identify sentence boundaries using pauses, lengthening and pitch changes",
    humanValidation: "Human Validation",
    humanValidationDescription: "Intuitive interface for segment review and correction with specialized quality control",
    accessControl: "Access Control",
    accessControlDescription: "Role and language-based permissions system with advanced user management",
  },
  
  pt: {
    // Navigation & General
    dashboard: "Dashboard",
    projects: "Projetos",
    upload: "Upload",
    validation: "Transcrição",
    users: "Usuários",
    languages: "Idiomas",
    settings: "Configurações",
    logout: "Sair",
    
    // Dashboard
    dashboardTitle: "Dashboard AudioSeg",
    welcomeMessage: "Bem-vindo ao sistema inteligente de segmentação de áudio",
    activeProjects: "Projetos Ativos",
    processedHours: "Horas Processadas",
    validatedSegments: "Segmentos Transcritos",
    recentActivity: "Atividade Recente",
    
    // Projects
    projectsTitle: "Projetos de Áudio",
    createProject: "Criar Novo Projeto",
    projectName: "Nome do Projeto",
    audioFile: "Arquivo de Áudio",
    language: "Idioma",
    status: "Status",
    duration: "Duração",
    segments: "Segmentos",
    actions: "Ações",
    validate: "Transcrever",
    export: "Exportar",
    delete: "Excluir",
    
    // Upload
    uploadTitle: "Upload de Arquivo de Áudio",
    uploadDescription: "Faça upload de um arquivo de áudio para iniciar a segmentação",
    dragDropArea: "Arraste e solte seu arquivo de áudio aqui, ou clique para navegar",
    maxFileSize: "Tamanho máximo: 500MB",
    uploading: "Fazendo upload...",
    uploadSuccess: "Arquivo enviado com sucesso!",
    uploadError: "Falha no upload. Tente novamente.",
    
    // Transcription
    validationTitle: "Transcrição",
    audioPlayer: "Player de Áudio",
    segmentEditor: "Editor de Segmentação",
    mode: "Modo",
    advanced: "Avançado",
    basic: "Básico",
    transcription: "Transcrição",
    translation: "Tradução",
    enterTranslation: "Digite a tradução aqui...",
    saving: "Salvando...",
    confidence: "Confiança",
    segmentOf: "Segmento {current} de {total}",
    playSegment: "Tocar Segmento",
    stopSegment: "Parar Segmento",
    save: "Salvar",
    approve: "Aprovar",
    reject: "Rejeitar",
    
    // Segmentation controls
    method: "Método",
    segment: "Segmentar",
    transcribe: "Transcrever",
    exportConfig: "Exportar Config",
    spreadsheet: "Planilha",
    audioZip: "Áudio ZIP",
    deleteAll: "Apagar Tudo",
    deleting: "Removendo...",
    processing: "Processando...",
    
    // Audio controls
    play: "Tocar",
    pause: "Pausar",
    volume: "Volume",
    mute: "Mudo",
    unmute: "Áudio",
    
    // Segment editing
    cut: "Corte",
    remove: "Remover",
    zoomIn: "Zoom +",
    zoomOut: "Zoom -",
    reset: "Resetar",
    
    // Users management
    usersTitle: "Gerenciamento de Usuários",
    userProfile: "Perfil do Usuário",
    email: "Email",
    role: "Função",
    manager: "Gerente",
    editor: "Editor",
    active: "Ativo",
    inactive: "Inativo",
    assignedLanguages: "Idiomas Atribuídos",
    assignLanguage: "Atribuir Idioma",
    removeLanguage: "Remover Idioma",
    
    // Messages
    success: "Sucesso",
    error: "Erro",
    warning: "Aviso",
    info: "Info",
    loading: "Carregando...",
    noData: "Nenhum dado disponível",
    
    // Confirmations
    confirmDeleteAll: "Tem certeza que deseja apagar TODOS os segmentos? Esta ação não pode ser desfeita.",
    confirmDeleteProject: "Tem certeza que deseja deletar o projeto \"{projectName}\"? Esta ação não pode ser desfeita.",
    
    // Interface messages
    basicInterfaceDisabled: "Interface básica desabilitada",
    enableAdvancedEditor: "Ativar Editor Avançado",
    improveWithVAD: "Melhorar com VAD",
    generateTranscriptions: "Gerar Transcrições",
    
    // Project info
    originalFilename: "Nome do Arquivo Original",
    validated: "transcrito",
    
    // Status
    readyForValidation: "Pronto para Transcrição",
    inValidation: "Em Transcrição", 
    completed: "Concluído",
    projectDeleted: "Projeto Deletado",
    
    // Additional UI text
    dashboardOverview: "Visão geral dos projetos e atividades",
    allLanguages: "Todos os idiomas",
    newProject: "Novo Projeto",
    projectsDescription: "Gerencie e acompanhe todos os seus projetos de segmentação de áudio",
    searchProjects: "Buscar projetos...",
    newSegmentationProject: "Novo Projeto de Segmentação",
    invalidFormat: "Formato inválido",
    selectValidAudio: "Por favor, selecione um arquivo de áudio válido (WAV, MP3, M4A).",
    requiredFields: "Campos obrigatórios",
    selectFileAndName: "Por favor, selecione um arquivo e forneça um nome para o projeto.",
    uploadSuccessDescription: "O arquivo foi enviado e está sendo processado. Redirecionando para projetos...",
    
    // Filter & status text
    filterByStatus: "Filtrar por status",
    allStatuses: "Todos os status",
    filterByLanguage: "Filtrar por idioma",
    loadingProjects: "Carregando projetos...",
    noProjectsFound: "Nenhum projeto encontrado",
    noProjectsYet: "Nenhum projeto ainda",
    adjustFilters: "Tente ajustar os filtros para encontrar os projetos desejados.",
    uploadFirstProject: "Comece fazendo upload de um arquivo de áudio para criar seu primeiro projeto.",
    
    // Upload page text
    dragAudioFile: "Arraste um arquivo de áudio aqui",
    clickToSelect: "ou clique para selecionar um arquivo",
    supportedFormats: "Formatos suportados: WAV, MP3, M4A (máx. 500MB)",
    projectNameLabel: "Nome do Projeto",
    projectNamePlaceholder: "Ex: Entrevista Podcast - Episódio 15",
    projectWillBeProcessed: "O projeto será processado como idioma personalizado, sem restrições de linguagem específica.",
    
    // Dashboard stats
    activeProjectsLabel: "Projetos Ativos",
    processedHoursLabel: "Horas Processadas",
    validatedSegmentsLabel: "Segmentos Transcritos", 
    accuracyRateLabel: "Taxa de Precisão",
    vsPreviousMonth: "vs. mês anterior",
    
    // Folders
    folders: "Pastas",
    createFolder: "Criar Pasta",
    folderName: "Nome da Pasta",
    folderNamePlaceholder: "Ex: Introdução",
    folderDescription: "Descrição",
    folderDescriptionPlaceholder: "Descrição opcional para esta pasta",
    editFolder: "Editar Pasta",
    deleteFolder: "Deletar Pasta",
    confirmDeleteFolder: "Tem certeza que deseja deletar a pasta \"{folderName}\"? Todos os segmentos nesta pasta também serão deletados.",
    folderCreated: "Pasta Criada",
    folderUpdated: "Pasta Atualizada",
    folderDeleted: "Pasta Deletada",
    noFoldersYet: "Nenhuma pasta ainda",
    noFoldersFound: "Nenhuma pasta encontrada",
    createFirstFolder: "Crie sua primeira pasta para organizar os segmentos",
    loadingFolders: "Carregando pastas...",
    projectDetails: "Detalhes do Projeto",
    backToProjects: "Voltar para Projetos",
    segmentsCount: "{count} segmentos",
    foldersCount: "{count} pastas",
    uploadSegments: "Carregar Segmentos",
    selectAudioFiles: "Selecionar Arquivos de Áudio",
    dragDropFiles: "Arraste arquivos aqui ou clique para selecionar",
    uploadingFiles: "Carregando arquivos...",
    filesUploaded: "Arquivos carregados com sucesso",
    noSegmentsYet: "Nenhum segmento ainda",
    createFirstSegment: "Faça upload dos primeiros segmentos de áudio para esta pasta",
    uploadNewSegments: "Carregar Novos Segmentos",
    segmentDetails: "Detalhes do Segmento",
    filename: "Nome do Arquivo",
    transcriptionStatus: "Status da Transcrição",
    notTranscribed: "Não transcrito",
    transcribed: "Transcrito",
    notTranslated: "Não traduzido",
    translated: "Traduzido",
    pending: "Pendente",
    fileCount: "{count} arquivo(s)",
    backToFolder: "Voltar para Pasta",
    loadingSegments: "Carregando segmentos...",
    transcribeSegment: "Transcrever Segmento",
    manualTranscription: "Transcrição Manual",
    saveTranscription: "Salvar Transcrição",
    transcriptionSaved: "Transcrição salva com sucesso",
    enterTranscription: "Digite a transcrição aqui...",
    characterCount: "{count} caracteres",
    previousSegment: "Segmento Anterior",
    nextSegment: "Próximo Segmento",
    noTranscription: "Nenhuma transcrição ainda",
    
    // Interface messages
    view: "Ver",
    download: "Baixar",
    boundaryFScore: "Boundary F-score",
    details: "Detalhes", 
    review: "Revisar",
    recentProjects: "Projetos Recentes", 
    viewAll: "Ver Todos",
    loadingUsers: "Carregando usuários...",
    loadingLanguages: "Carregando idiomas...",
    unauthorized: "Não autorizado",
    loginRequired: "Você precisa estar logado. Redirecionando...",
    accessDenied: "Acesso negado",
    managerOnlyAccess: "Apenas gerentes podem acessar esta página.",
    usersList: "Lista de Usuários",
    languageManagement: "Gerenciamento de Idiomas",
    roleUpdated: "Papel atualizado",
    roleUpdatedSuccess: "O papel do usuário foi atualizado com sucesso.",
    deleteProject: "Deletar Projeto",
    sortBy: "Ordenar por",
    order: "Ordem",
    name: "Nome",
    date: "Data",
    ascending: "Crescente",
    descending: "Decrescente",
    segmentsReordered: "Segmentos reordenados",
    orderUpdatedSuccess: "Ordem atualizada com sucesso",
    editProjectName: "Editar nome do projeto",
    projectUpdated: "Projeto atualizado",
    recalculateStats: "Recalcular Estatísticas",
    statsRecalculated: "Estatísticas recalculadas",
    confirmRecalculateStats: "Recalcular estatísticas do projeto? Isso atualizará a duração e contagem de segmentos baseado nos arquivos de áudio reais.",
    recalculateAllStats: "Recalcular Todas as Estatísticas",
    allStatsRecalculated: "Estatísticas de todos os projetos recalculadas",
        confirmRecalculateAllStats: "Recalcular estatísticas de todos os projetos? Isso atualizará a duração e contagem de segmentos baseado nos arquivos de áudio reais.",
        navigation: "Navegação",
        admin: "Administrador",
        user: "Usuário",
        confirmLogout: "Tem certeza que deseja sair?",
        
        // Additional missing keys
        createFirstProject: "Criar Primeiro Projeto",
        failedToLoadAudio: "Falha ao carregar áudio",
        audioSegment: "Segmento de Áudio",
        uploadErrorMessage: "Erro ao fazer upload do arquivo",
        selectAtLeastOneFile: "Selecione pelo menos um arquivo",
        enterProjectName: "Digite o nome do projeto",
        enterProjectNamePlaceholder: "Digite o nome do projeto",
        moveUp: "Mover para cima",
        moveDown: "Mover para baixo",
        bytes: "Bytes",
        kb: "KB",
        mb: "MB",
        gb: "GB",
        enterKey: "Enter",
        escapeKey: "Escape",
        invalidCredentials: "Nome de usuário ou senha inválidos",
        enterUsername: "Digite seu nome de usuário",
        enterPassword: "Digite sua senha",
        signingIn: "Entrando...",
        signIn: "Entrar",
        signInToSystem: "Entrar no Sistema",
        automaticDetection: "Detecção Automática",
        automaticDetectionDescription: "Algoritmos avançados de análise prosódica identificam limites de frases usando pausas, alongamento e mudanças de tom",
        humanValidation: "Validação Humana",
        humanValidationDescription: "Interface intuitiva para revisão e correção de segmentos com controle de qualidade especializado",
        accessControl: "Controle de Acesso",
        accessControlDescription: "Sistema de funções e permissões por idioma com gerenciamento avançado de usuários",
  },
  
  es: {
    // Navigation & General
    dashboard: "Panel de Control",
    projects: "Proyectos",
    upload: "Subir",
    validation: "Transcripción",
    users: "Usuarios",
    languages: "Idiomas",
    settings: "Configuración",
    logout: "Cerrar Sesión",
    
    // Dashboard
    dashboardTitle: "Panel de Control AudioSeg",
    welcomeMessage: "Bienvenido al sistema inteligente de segmentación de audio",
    activeProjects: "Proyectos Activos",
    processedHours: "Horas Procesadas",
    validatedSegments: "Segmentos Transcritos",
    recentActivity: "Actividad Reciente",
    
    // Projects
    projectsTitle: "Proyectos de Audio",
    createProject: "Crear Nuevo Proyecto",
    projectName: "Nombre del Proyecto",
    audioFile: "Archivo de Audio",
    language: "Idioma",
    status: "Estado",
    duration: "Duración",
    segments: "Segmentos",
    actions: "Acciones",
    validate: "Transcribir",
    export: "Exportar",
    delete: "Eliminar",
    
    // Upload
    uploadTitle: "Subir Archivo de Audio",
    uploadDescription: "Sube un archivo de audio para iniciar la segmentación",
    dragDropArea: "Arrastra y suelta tu archivo de audio aquí, o haz clic para navegar",
    supportedFormats: "Formatos soportados: WAV, MP3, M4A",
    maxFileSize: "Tamaño máximo: 500MB",
    uploading: "Subiendo...",
    uploadSuccess: "¡Archivo subido exitosamente!",
    uploadError: "Error en la subida. Inténtalo de nuevo.",
    
    // Transcription
    validationTitle: "Transcripción",
    audioPlayer: "Reproductor de Audio",
    segmentEditor: "Editor de Segmentos",
    mode: "Modo",
    advanced: "Avanzado",
    basic: "Básico",
    transcription: "Transcripción",
    translation: "Traducción",
    enterTranslation: "Ingresa la traducción aquí...",
    saving: "Guardando...",
    confidence: "Confianza",
    segmentOf: "Segmento {current} de {total}",
    playSegment: "Reproducir Segmento",
    stopSegment: "Detener Segmento",
    save: "Guardar",
    approve: "Aprobar",
    reject: "Rechazar",
    
    // Segmentation controls
    method: "Método",
    segment: "Segmentar",
    transcribe: "Transcribir",
    exportConfig: "Exportar Config",
    spreadsheet: "Hoja de Cálculo",
    audioZip: "Audio ZIP",
    deleteAll: "Eliminar Todo",
    deleting: "Eliminando...",
    processing: "Procesando...",
    
    // Audio controls
    play: "Reproducir",
    pause: "Pausar",
    volume: "Volumen",
    mute: "Silenciar",
    unmute: "Activar Audio",
    
    // Segment editing
    cut: "Cortar",
    remove: "Remover",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    reset: "Restablecer",
    
    // Users management
    usersTitle: "Gestión de Usuarios",
    userProfile: "Perfil de Usuario",
    email: "Email",
    role: "Rol",
    manager: "Gerente",
    editor: "Editor",
    active: "Activo",
    inactive: "Inactivo",
    assignedLanguages: "Idiomas Asignados",
    assignLanguage: "Asignar Idioma",
    removeLanguage: "Remover Idioma",
    
    // Messages
    success: "Éxito",
    error: "Error",
    warning: "Advertencia",
    info: "Información",
    loading: "Cargando...",
    noData: "No hay datos disponibles",
    
    // Confirmations
    confirmDeleteAll: "¿Estás seguro de que quieres eliminar TODOS los segmentos? Esta acción no se puede deshacer.",
    confirmDeleteProject: "¿Estás seguro de que quieres eliminar el proyecto \"{projectName}\"? Esta acción no se puede deshacer.",
    
    // Interface messages
    view: "Ver",
    download: "Descargar",
    boundaryFScore: "Boundary F-score",
    details: "Detalles",
    review: "Revisar", 
    recentProjects: "Proyectos Recientes",
    viewAll: "Ver Todos",
    loadingUsers: "Cargando usuarios...",
    loadingLanguages: "Cargando idiomas...",
    unauthorized: "No autorizado",
    loginRequired: "Necesitas estar conectado. Redirigiendo...",
    accessDenied: "Acceso Denegado",
    managerOnlyAccess: "Solo los gerentes pueden acceder a esta página.",
    usersList: "Lista de Usuarios",
    languageManagement: "Gestión de Idiomas",
    roleUpdated: "Rol Actualizado",
    roleUpdatedSuccess: "El rol del usuario ha sido actualizado exitosamente.",
    basicInterfaceDisabled: "Interfaz básica deshabilitada",
    enableAdvancedEditor: "Habilitar Editor Avanzado",
    improveWithVAD: "Mejorar con VAD",
    generateTranscriptions: "Generar Transcripciones",
    
    // Project info
    originalFilename: "Nombre del Archivo Original",
    validated: "transcrito",
    
    // Status
    readyForValidation: "Listo para Transcripción",
    inValidation: "En Transcripción",
    completed: "Completado",
    projectDeleted: "Proyecto Eliminado",
    
    // Additional UI text
    dashboardOverview: "Resumen de proyectos y actividades",
    allLanguages: "Todos los Idiomas",
    newProject: "Nuevo Proyecto",
    projectsDescription: "Gestiona y rastrea todos tus proyectos de segmentación de audio",
    searchProjects: "Buscar proyectos...",
    newSegmentationProject: "Nuevo Proyecto de Segmentación",
    invalidFormat: "Formato Inválido",
    selectValidAudio: "Por favor, selecciona un archivo de audio válido (WAV, MP3, M4A).",
    requiredFields: "Campos Requeridos",
    selectFileAndName: "Por favor, selecciona un archivo y proporciona un nombre para el proyecto.",
    uploadSuccessDescription: "El archivo ha sido subido y está siendo procesado. Redirigiendo a proyectos...",
    
    // Filter & status text
    filterByStatus: "Filtrar por estado",
    allStatuses: "Todos los estados",
    filterByLanguage: "Filtrar por idioma",
    loadingProjects: "Cargando proyectos...",
    noProjectsFound: "No se encontraron proyectos",
    noProjectsYet: "Aún no hay proyectos",
    adjustFilters: "Intenta ajustar los filtros para encontrar los proyectos deseados.",
    uploadFirstProject: "Comienza subiendo un archivo de audio para crear tu primer proyecto.",
    
    // Upload page text
    dragAudioFile: "Arrastra un archivo de audio aquí",
    clickToSelect: "o haz clic para seleccionar un archivo",
    projectNameLabel: "Nombre del Proyecto",
    projectNamePlaceholder: "Ej: Entrevista Podcast - Episodio 15",
    projectWillBeProcessed: "El proyecto será procesado como idioma personalizado, sin restricciones de idioma específicas.",
    
    // Dashboard stats
    activeProjectsLabel: "Proyectos Activos",
    processedHoursLabel: "Horas Procesadas", 
    validatedSegmentsLabel: "Segmentos Transcritos",
    accuracyRateLabel: "Tasa de Precisión",
    vsPreviousMonth: "vs. mes anterior",
    
    // Folders
    folders: "Carpetas",
    createFolder: "Crear Carpeta",
    folderName: "Nombre de la Carpeta",
    folderNamePlaceholder: "ej., Introducción",
    folderDescription: "Descripción",
    folderDescriptionPlaceholder: "Descripción opcional para esta carpeta",
    editFolder: "Editar Carpeta",
    deleteFolder: "Eliminar Carpeta",
    confirmDeleteFolder: "¿Estás seguro de que quieres eliminar la carpeta \"{folderName}\"? Todos los segmentos en esta carpeta también serán eliminados.",
    folderCreated: "Carpeta Creada",
    folderUpdated: "Carpeta Actualizada",
    folderDeleted: "Carpeta Eliminada",
    noFoldersYet: "Aún no hay carpetas",
    noFoldersFound: "No se encontraron carpetas",
    createFirstFolder: "Crea tu primera carpeta para organizar segmentos",
    loadingFolders: "Cargando carpetas...",
    projectDetails: "Detalles del Proyecto",
    backToProjects: "Volver a Proyectos",
    segmentsCount: "{count} segmentos",
    foldersCount: "{count} carpetas",
    uploadSegments: "Subir Segmentos",
    selectAudioFiles: "Seleccionar Archivos de Audio",
    dragDropFiles: "Arrastra archivos aquí o haz clic para seleccionar",
    uploadingFiles: "Subiendo archivos...",
    filesUploaded: "Archivos subidos exitosamente",
    noSegmentsYet: "Aún no hay segmentos",
    createFirstSegment: "Sube tus primeros segmentos de audio a esta carpeta",
    uploadNewSegments: "Subir Nuevos Segmentos",
    segmentDetails: "Detalles del Segmento",
    filename: "Nombre del Archivo",
    transcriptionStatus: "Estado de la Transcripción",
    notTranscribed: "No transcrito",
    transcribed: "Transcrito",
    notTranslated: "No traducido",
    translated: "Traducido",
    pending: "Pendiente",
    fileCount: "{count} archivo(s)",
    backToFolder: "Volver a Carpeta",
    loadingSegments: "Cargando segmentos...",
    transcribeSegment: "Transcribir Segmento",
    manualTranscription: "Transcripción Manual",
    saveTranscription: "Guardar Transcripción",
    transcriptionSaved: "Transcripción guardada exitosamente",
    enterTranscription: "Ingresa la transcripción aquí...",
    characterCount: "{count} caracteres",
    previousSegment: "Segmento Anterior",
    nextSegment: "Siguiente Segmento",
    noTranscription: "Aún no hay transcripción",
    deleteProject: "Eliminar Proyecto",
    sortBy: "Ordenar por",
    order: "Orden",
    name: "Nombre",
    date: "Fecha",
    ascending: "Ascendente",
    descending: "Descendente",
    segmentsReordered: "Segmentos reordenados",
    orderUpdatedSuccess: "Orden actualizado exitosamente",
    editProjectName: "Editar nombre del proyecto",
    projectUpdated: "Proyecto actualizado",
    recalculateStats: "Recalcular Estadísticas",
    statsRecalculated: "Estadísticas recalculadas",
    confirmRecalculateStats: "¿Recalcular estadísticas del proyecto? Esto actualizará la duración y conteo de segmentos basado en los archivos de audio reales.",
    recalculateAllStats: "Recalcular Todas las Estadísticas",
    allStatsRecalculated: "Estadísticas de todos los proyectos recalculadas",
    confirmRecalculateAllStats: "¿Recalcular estadísticas de todos los proyectos? Esto actualizará la duración y conteo de segmentos basado en los archivos de audio reales.",
    navigation: "Navegación",
    admin: "Administrador",
    user: "Usuario",
    confirmLogout: "¿Estás seguro de que quieres cerrar sesión?",
    
    // Additional missing keys
    createFirstProject: "Crear Primer Proyecto",
    failedToLoadAudio: "Error al cargar audio",
    audioSegment: "Segmento de Audio",
    uploadErrorMessage: "Error al subir archivo",
    selectAtLeastOneFile: "Selecciona al menos un archivo",
    enterProjectName: "Ingresa el nombre del proyecto",
    enterProjectNamePlaceholder: "Ingresa el nombre del proyecto",
    moveUp: "Mover hacia arriba",
    moveDown: "Mover hacia abajo",
    bytes: "Bytes",
    kb: "KB",
    mb: "MB",
    gb: "GB",
    enterKey: "Enter",
    escapeKey: "Escape",
    invalidCredentials: "Nombre de usuario o contraseña inválidos",
    enterUsername: "Ingresa tu nombre de usuario",
    enterPassword: "Ingresa tu contraseña",
    signingIn: "Iniciando sesión...",
    signIn: "Iniciar Sesión",
    signInToSystem: "Iniciar Sesión en el Sistema",
    automaticDetection: "Detección Automática",
    automaticDetectionDescription: "Algoritmos avanzados de análisis prosódico identifican límites de frases usando pausas, alargamiento y cambios de tono",
    humanValidation: "Validación Humana",
    humanValidationDescription: "Interfaz intuitiva para revisión y corrección de segmentos con control de calidad especializado",
    accessControl: "Control de Acceso",
    accessControlDescription: "Sistema de roles y permisos basado en idiomas con gestión avanzada de usuarios",
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('audioSeg-language');
      return (saved as Language) || 'pt';
    }
    return 'pt';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioSeg-language', language);
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language][key as keyof typeof translations['en']] || key;
    
    if (params) {
      return Object.entries(params).reduce((text, [param, value]) => {
        return text.replace(`{${param}}`, String(value));
      }, translation);
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}