    // Global Three.js State Variables
    let scene, camera, renderer, controls;
    let modelPivotGroup = null; // Container group to allow clean user offset/rotation/scale transforms
    let currentModel = null;
    let currentModelFilename = "stylized-tower";
    let gridHelper = null;
    let isWireframe = false;
    let autoRotate = false;
    let mixer = null;
    const clock = new THREE.Clock();

    // DOM Elements
    const container = document.getElementById('canvas-container');
    const fileInput = document.getElementById('glb-file-input');
    const btnDefault = document.getElementById('btn-load-default');
    const btnCrown = document.getElementById('btn-load-crown');
    const btnDownloadGlb = document.getElementById('btn-download-glb');
    const btnHeaderExport = document.getElementById('btn-header-export');
    const exportBtnLabel = document.getElementById('export-btn-label');
    const btnWireframe = document.getElementById('btn-wireframe');
    const btnAutoRotate = document.getElementById('btn-auto-rotate');
    const btnGrid = document.getElementById('btn-grid');
    const btnResetCam = document.getElementById('btn-reset-cam');
    const btnToggleSliders = document.getElementById('btn-toggle-sliders');
    const transformPanel = document.getElementById('transform-panel');
    const btnResetTransforms = document.getElementById('btn-reset-transforms');

    // Lighting Studio Elements
    const btnToggleLights = document.getElementById('btn-toggle-lights');
    const lightsPanel = document.getElementById('lights-panel');
    const btnAddPointLight = document.getElementById('btn-add-point-light');
    const btnAddSpotLight = document.getElementById('btn-add-spot-light');
    const btnAddDirLight = document.getElementById('btn-add-dir-light');
    const lightsList = document.getElementById('lights-list');
    const lightCountSpan = document.getElementById('light-count');
    const chkLightHelpers = document.getElementById('chk-light-helpers');
    const sliderAmbient = document.getElementById('slider-ambient-intensity');
    const valAmbient = document.getElementById('val-ambient-intensity');
    const btnCollapseLights = document.getElementById('btn-collapse-lights');
    const btnCollapseTransform = document.getElementById('btn-collapse-transform');
    const btnUndoLight = document.getElementById('btn-undo-light');
    const btnRedoLight = document.getElementById('btn-redo-light');
    const btnLogoCube = document.getElementById('btn-logo-cube');
    const refreshModal = document.getElementById('refresh-modal');
    const refreshModalCard = document.getElementById('refresh-modal-card');
    const btnCancelRefresh = document.getElementById('btn-cancel-refresh');
    const btnConfirmRefresh = document.getElementById('btn-confirm-refresh');

    // Model Loader Card Collapsible Controls
    const loaderPanelBody = document.getElementById('loader-panel-body');
    const btnToggleLoaderPanel = document.getElementById('btn-toggle-loader-panel');
    const loaderPanelCaret = document.getElementById('loader-panel-caret');
    const loaderPanelActionText = document.getElementById('loader-panel-action-text');
    const clickToExpandHint = document.getElementById('click-to-expand-hint');
    const dropOverlay = document.getElementById('drop-overlay');

    let isLoaderMinimized = false;

    function setLoaderMinimized(minimized) {
      isLoaderMinimized = minimized;
      if (minimized) {
        loaderPanelBody.style.maxHeight = '0px';
        loaderPanelBody.style.opacity = '0';
        loaderPanelBody.style.pointerEvents = 'none';
        loaderPanelCaret.style.transform = 'rotate(-180deg)';
        if (loaderPanelActionText) loaderPanelActionText.textContent = 'Expand';
        if (clickToExpandHint) clickToExpandHint.classList.remove('hidden');
      } else {
        loaderPanelBody.style.maxHeight = '500px';
        loaderPanelBody.style.opacity = '1';
        loaderPanelBody.style.pointerEvents = 'auto';
        loaderPanelCaret.style.transform = 'rotate(0deg)';
        if (loaderPanelActionText) loaderPanelActionText.textContent = 'Minimize';
        if (clickToExpandHint) clickToExpandHint.classList.add('hidden');
      }
    }

    function toggleLoaderPanel(forceExpand = null) {
      if (forceExpand !== null) {
        setLoaderMinimized(!forceExpand);
      } else {
        setLoaderMinimized(!isLoaderMinimized);
      }
    }

    if (btnToggleLoaderPanel) {
      btnToggleLoaderPanel.addEventListener('click', () => toggleLoaderPanel());
    }

    // Refresh Confirmation Modal Logic
    function openRefreshModal() {
      refreshModal.classList.remove('opacity-0', 'pointer-events-none');
      refreshModal.classList.add('opacity-100');
      refreshModalCard.classList.remove('scale-95');
      refreshModalCard.classList.add('scale-100');
    }

    function closeRefreshModal() {
      refreshModal.classList.add('opacity-0', 'pointer-events-none');
      refreshModal.classList.remove('opacity-100');
      refreshModalCard.classList.add('scale-95');
      refreshModalCard.classList.remove('scale-100');
    }

    if (btnLogoCube) {
      btnLogoCube.addEventListener('click', (e) => {
        e.stopPropagation();
        openRefreshModal();
      });
    }

    if (btnCancelRefresh) {
      btnCancelRefresh.addEventListener('click', closeRefreshModal);
    }

    if (btnConfirmRefresh) {
      btnConfirmRefresh.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // Dismiss modal on backdrop click
    if (refreshModal) {
      refreshModal.addEventListener('click', (e) => {
        if (e.target === refreshModal) {
          closeRefreshModal();
        }
      });
    }

    // Scene Light Tracking
    let sceneAmbientLight = null;
    let customLights = [];
    let lightIdCounter = 1;

    // Light History State System (Undo / Redo)
    const MAX_LIGHT_HISTORY = 40;
    const lightUndoStack = [];
    const lightRedoStack = [];
    let isApplyingHistory = false;

    function getLightStateSnapshot() {
      return {
        ambientIntensity: sceneAmbientLight ? sceneAmbientLight.intensity : 0.85,
        lights: customLights.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          color: '#' + item.light.color.getHexString(),
          intensity: item.light.intensity,
          castShadow: Boolean(item.light.castShadow),
          x: item.light.position.x,
          y: item.light.position.y,
          z: item.light.position.z
        }))
      };
    }

    function pushLightHistory() {
      if (isApplyingHistory) return;
      const snapshot = getLightStateSnapshot();
      lightUndoStack.push(snapshot);
      if (lightUndoStack.length > MAX_LIGHT_HISTORY) {
        lightUndoStack.shift();
      }
      // Any new modification invalidates the redo branch
      lightRedoStack.length = 0;
      updateHistoryButtonsUI();
    }

    function updateHistoryButtonsUI() {
      if (btnUndoLight) btnUndoLight.disabled = lightUndoStack.length === 0;
      if (btnRedoLight) btnRedoLight.disabled = lightRedoStack.length === 0;
    }

    function applyLightStateSnapshot(snapshot) {
      if (!snapshot) return;
      isApplyingHistory = true;

      // 1. Restore Ambient Light
      if (sceneAmbientLight && snapshot.ambientIntensity !== undefined) {
        sceneAmbientLight.intensity = snapshot.ambientIntensity;
        sliderAmbient.value = snapshot.ambientIntensity;
        valAmbient.textContent = snapshot.ambientIntensity.toFixed(2);
      }

      // 2. Remove all current custom lights and helpers from scene
      customLights.forEach(item => {
        scene.remove(item.light);
        if (item.helper) scene.remove(item.helper);
      });
      customLights = [];

      // 3. Re-instantiate lights from snapshot
      snapshot.lights.forEach(saved => {
        let light, helper;
        const color = new THREE.Color(saved.color);

        if (saved.type === 'point') {
          light = new THREE.PointLight(color, saved.intensity, 25, 1.2);
          light.position.set(saved.x, saved.y, saved.z);
          light.castShadow = saved.castShadow;
          scene.add(light);

          helper = new THREE.PointLightHelper(light, 0.35);
          helper.visible = chkLightHelpers.checked;
          scene.add(helper);
        } else if (saved.type === 'spot') {
          light = new THREE.SpotLight(color, saved.intensity, 35, Math.PI / 4, 0.4, 1.2);
          light.position.set(saved.x, saved.y, saved.z);
          light.castShadow = saved.castShadow;
          scene.add(light);

          helper = new THREE.SpotLightHelper(light);
          helper.visible = chkLightHelpers.checked;
          scene.add(helper);
        } else if (saved.type === 'directional') {
          light = new THREE.DirectionalLight(color, saved.intensity);
          light.position.set(saved.x, saved.y, saved.z);
          light.castShadow = saved.castShadow;
          scene.add(light);

          helper = new THREE.DirectionalLightHelper(light, 0.6);
          helper.visible = chkLightHelpers.checked;
          scene.add(helper);
        }

        if (saved.id >= lightIdCounter) {
          lightIdCounter = saved.id + 1;
        }

        customLights.push({
          id: saved.id,
          name: saved.name,
          type: saved.type,
          light,
          helper
        });
      });

      renderLightsListUI();
      isApplyingHistory = false;
      updateHistoryButtonsUI();
    }

    function undoLightChange() {
      if (lightUndoStack.length === 0) return;
      const current = getLightStateSnapshot();
      lightRedoStack.push(current);

      const previous = lightUndoStack.pop();
      applyLightStateSnapshot(previous);
      showToast('Undid light change.', 'info');
    }

    function redoLightChange() {
      if (lightRedoStack.length === 0) return;
      const current = getLightStateSnapshot();
      lightUndoStack.push(current);

      const next = lightRedoStack.pop();
      applyLightStateSnapshot(next);
      showToast('Redid light change.', 'info');
    }

    // Undo / Redo button listeners
    btnUndoLight.addEventListener('click', undoLightChange);
    btnRedoLight.addEventListener('click', redoLightChange);

    // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            redoLightChange();
          } else {
            undoLightChange();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redoLightChange();
        }
      }
    });

    // Tab buttons & sections
    const tabPos = document.getElementById('tab-pos');
    const tabRot = document.getElementById('tab-rot');
    const tabScale = document.getElementById('tab-scale');
    const sectionPos = document.getElementById('section-pos');
    const sectionRot = document.getElementById('section-rot');
    const sectionScale = document.getElementById('section-scale');

    // Slider inputs & displays
    const sliderPosX = document.getElementById('slider-pos-x');
    const sliderPosY = document.getElementById('slider-pos-y');
    const sliderPosZ = document.getElementById('slider-pos-z');
    const valPosX = document.getElementById('val-pos-x');
    const valPosY = document.getElementById('val-pos-y');
    const valPosZ = document.getElementById('val-pos-z');

    const sliderRotX = document.getElementById('slider-rot-x');
    const sliderRotY = document.getElementById('slider-rot-y');
    const sliderRotZ = document.getElementById('slider-rot-z');
    const valRotX = document.getElementById('val-rot-x');
    const valRotY = document.getElementById('val-rot-y');
    const valRotZ = document.getElementById('val-rot-z');

    const sliderScaleUniform = document.getElementById('slider-scale-uniform');
    const sliderScaleX = document.getElementById('slider-scale-x');
    const sliderScaleY = document.getElementById('slider-scale-y');
    const sliderScaleZ = document.getElementById('slider-scale-z');
    const valScaleUniform = document.getElementById('val-scale-uniform');
    const valScaleX = document.getElementById('val-scale-x');
    const valScaleY = document.getElementById('val-scale-y');
    const valScaleZ = document.getElementById('val-scale-z');

    const activeFilename = document.getElementById('active-filename');
    const activeStatus = document.getElementById('active-status');
    const statMeshes = document.getElementById('stat-meshes');
    const statVertices = document.getElementById('stat-vertices');
    const statTriangles = document.getElementById('stat-triangles');

    // Toast Notification System
    function showToast(message, type = 'error') {
      const toast = document.getElementById('toast');
      const toastContent = document.getElementById('toast-content');
      const toastIcon = document.getElementById('toast-icon');
      const toastMsg = document.getElementById('toast-message');

      if (type === 'error') {
        toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm max-w-md bg-red-950/90 border-red-500/50 text-red-100 backdrop-blur-md';
        toastIcon.className = 'fa-solid fa-circle-exclamation text-red-400 shrink-0';
      } else if (type === 'warning') {
        toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm max-w-md bg-amber-950/90 border-amber-500/50 text-amber-100 backdrop-blur-md';
        toastIcon.className = 'fa-solid fa-triangle-exclamation text-amber-400 shrink-0';
      } else {
        toastContent.className = 'px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm max-w-md bg-emerald-950/90 border-emerald-500/50 text-emerald-100 backdrop-blur-md';
        toastIcon.className = 'fa-solid fa-circle-check text-emerald-400 shrink-0';
      }

      toastMsg.textContent = message;
      toast.classList.remove('-translate-y-6', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-6', 'opacity-0', 'pointer-events-none');
      }, 5000);
    }

    // Initialize Three.js Scene, Lights, Camera & OrbitControls
    function initScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0e131f);

      // Model Pivot Group (Holds models so user sliders apply cleanly on parent)
      modelPivotGroup = new THREE.Group();
      modelPivotGroup.name = "ModelPivotGroup";
      scene.add(modelPivotGroup);

      // Camera
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(5, 4, 7);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // OrbitControls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = true;
      controls.minDistance = 0.5;
      controls.maxDistance = 150;
      controls.maxPolarAngle = Math.PI / 2 + 0.1; // allow slight under-view

      // Lighting Setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);
      sceneAmbientLight = ambientLight;

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.6);
      hemiLight.position.set(0, 20, 0);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
      dirLight.position.set(8, 12, 6);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 40;
      dirLight.shadow.bias = -0.0005;
      const d = 8;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      scene.add(dirLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
      fillLight.position.set(-8, 5, -6);
      scene.add(fillLight);

      // Add one default warm accent point light to get started
      addCustomLight('point', { x: 3, y: 3.5, z: 2.5, color: '#f59e0b', intensity: 2.5 });

      // Subtle Grid & Shadow Floor
      createFloorAndGrid();

      // Window Resize Listener
      window.addEventListener('resize', onWindowResize, false);

      // Initial Default Model
      loadDefaultModel();
    }

    function createFloorAndGrid() {
      // Grid
      gridHelper = new THREE.GridHelper(20, 40, 0x10b981, 0x223046);
      gridHelper.position.y = -0.001;
      scene.add(gridHelper);

      // Ground plane for shadow reception
      const groundGeo = new THREE.PlaneGeometry(100, 100);
      const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.002;
      ground.receiveShadow = true;
      scene.add(ground);
    }

    // Procedural Default Stylized 3D Model
    // Built directly with Three.js primitives so it starts instantly without Draco or CORS dependencies
    function loadDefaultModel() {
      if (currentModel) {
        modelPivotGroup.remove(currentModel);
      }

      const rootGroup = new THREE.Group();
      rootGroup.name = "DefaultStylizedTower";

      // Palette
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.1 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7, metalness: 0.05 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.85 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4, metalness: 0.2 });

      // Base Platform
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 0.4, 8), stoneMat);
      base.castShadow = true;
      base.receiveShadow = true;
      base.position.y = 0.2;
      rootGroup.add(base);

      // Tower body
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 2.8, 8), stoneMat);
      tower.position.y = 1.8;
      tower.castShadow = true;
      tower.receiveShadow = true;
      rootGroup.add(tower);

      // Balcony rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.3, 8), stoneMat);
      rim.position.y = 3.35;
      rim.castShadow = true;
      rootGroup.add(rim);

      // Conical Roof
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.8, 8), roofMat);
      roof.position.y = 4.4;
      roof.castShadow = true;
      rootGroup.add(roof);

      // Golden Spire & Finial Sphere
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 0.8, 8), goldMat);
      spire.position.y = 5.5;
      spire.castShadow = true;
      rootGroup.add(spire);

      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), goldMat);
      orb.position.y = 5.9;
      orb.castShadow = true;
      rootGroup.add(orb);

      // Gate Arch (Wood Doorway)
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.2), woodMat);
      door.position.set(0, 1.0, 1.35);
      door.castShadow = true;
      rootGroup.add(door);

      // Orbiting decorative crystal
      const gemGeo = new THREE.OctahedronGeometry(0.35);
      const gemMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.15,
        metalness: 0.9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.3
      });
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(0, 3.4, 1.8);
      gem.castShadow = true;
      gem.userData.isFloatingCrystal = true;
      rootGroup.add(gem);

      modelPivotGroup.add(rootGroup);
      currentModel = rootGroup;
      currentModelFilename = "stylized-tower";
      if (exportBtnLabel) exportBtnLabel.textContent = "Export Spire .GLB";

      resetTransformsUI();
      frameModel(currentModel);
      updateModelStats(currentModel);

      activeFilename.innerHTML = 'Active: <span class="text-emerald-300 font-medium">Default Stylized Spire</span>';
      activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready';
    }

    // Procedural Practice Model: Ornate Royal Golden Crown with Emeralds
    function loadCrownModel() {
      if (currentModel) {
        modelPivotGroup.remove(currentModel);
      }
      if (mixer) {
        mixer.stopAllAction();
        mixer = null;
      }

      const crownGroup = new THREE.Group();
      crownGroup.name = "RoyalGoldenCrown";

      // PBR Materials
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffb703,
        roughness: 0.22,
        metalness: 0.92,
        name: "CrownGoldPBR"
      });
      const emeraldMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.15,
        metalness: 0.1,
        emissive: 0x047857,
        emissiveIntensity: 0.28,
        name: "EmeraldJewelPBR"
      });
      const velvetMat = new THREE.MeshStandardMaterial({
        color: 0x4c0519,
        roughness: 0.85,
        metalness: 0.05,
        name: "VelvetCap"
      });

      // 1. Velvet Inner Cushion
      const velvetCap = new THREE.Mesh(new THREE.SphereGeometry(1.28, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), velvetMat);
      velvetCap.position.y = 0.25;
      velvetCap.scale.set(1, 0.72, 1);
      velvetCap.castShadow = true;
      crownGroup.add(velvetCap);

      // 2. Main Circular Golden Circlet Band
      const circlet = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.4, 0.42, 32, 1, true), goldMat);
      circlet.position.y = 0.21;
      circlet.castShadow = true;
      circlet.receiveShadow = true;
      crownGroup.add(circlet);

      // Upper & Lower Filigree Rim Rings
      const lowerRim = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 12, 32), goldMat);
      lowerRim.rotation.x = Math.PI / 2;
      lowerRim.position.y = 0.02;
      crownGroup.add(lowerRim);

      const upperRim = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.05, 12, 32), goldMat);
      upperRim.rotation.x = Math.PI / 2;
      upperRim.position.y = 0.42;
      crownGroup.add(upperRim);

      // 3. Arched Peaks & Golden Spheres Around the Crown
      const peakCount = 8;
      const radius = 1.36;

      for (let i = 0; i < peakCount; i++) {
        const angle = (i / peakCount) * Math.PI * 2;
        const isFleurDeLis = (i === 0); // Centerpiece peak
        const peakHeight = isFleurDeLis ? 1.4 : 0.85;
        const peakWidth = isFleurDeLis ? 0.38 : 0.24;

        const peakGroup = new THREE.Group();
        peakGroup.position.set(Math.cos(angle) * radius, 0.42, Math.sin(angle) * radius);
        peakGroup.rotation.y = -angle + Math.PI / 2;

        // Peak Triangle / Spear
        const spike = new THREE.Mesh(new THREE.ConeGeometry(peakWidth, peakHeight, 4), goldMat);
        spike.position.y = peakHeight / 2;
        spike.rotation.y = Math.PI / 4;
        spike.castShadow = true;
        peakGroup.add(spike);

        // Golden Sphere on Top
        const ball = new THREE.Mesh(new THREE.SphereGeometry(isFleurDeLis ? 0.12 : 0.08, 14, 14), goldMat);
        ball.position.y = peakHeight + 0.04;
        ball.castShadow = true;
        peakGroup.add(ball);

        // Inset Emerald Cabochon Gem on Alternate Peaks & Center
        if (i % 2 === 0) {
          const gem = new THREE.Mesh(new THREE.OctahedronGeometry(isFleurDeLis ? 0.16 : 0.11), emeraldMat);
          gem.position.set(0, peakHeight * 0.45, 0.07);
          gem.rotation.z = Math.PI / 4;
          gem.castShadow = true;
          peakGroup.add(gem);
        }

        // Small circular pearls/rivets along base band
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), goldMat);
        rivet.position.set(Math.cos(angle + (Math.PI / peakCount)) * 1.41, 0.21, Math.sin(angle + (Math.PI / peakCount)) * 1.41);
        crownGroup.add(rivet);

        crownGroup.add(peakGroup);
      }

      modelPivotGroup.add(crownGroup);
      currentModel = crownGroup;
      currentModelFilename = "golden-crown";
      if (exportBtnLabel) exportBtnLabel.textContent = "Export Crown .GLB";

      applyWireframe(isWireframe);
      resetTransformsUI();
      frameModel(currentModel);
      updateModelStats(currentModel);

      activeFilename.innerHTML = 'Active: <span class="text-amber-300 font-medium">Practice Royal Crown</span>';
      activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ready';
    }

    // Export currently active 3D model (custom uploaded, default, or crown) to an uncompressed standard .glb file
    function exportActiveModelGlb() {
      if (!currentModel) {
        showToast('No active 3D model to export.', 'warning');
        return;
      }

      // Generate a clean safe filename based on the current model's source name
      let baseName = (currentModelFilename || 'model').replace(/\.glb$/i, '').trim();
      if (!baseName) baseName = 'exported-model';
      const exportName = `${baseName}.glb`;

      showToast(`Exporting "${exportName}" as standard uncompressed .glb...`, 'info');

      // Export using THREE.GLTFExporter with binary option enabled
      const exporter = new THREE.GLTFExporter();
      try {
        exporter.parse(
          currentModel,
          function(result) {
            if (result instanceof ArrayBuffer) {
              const blob = new Blob([result], { type: 'model/gltf-binary' });
              const link = document.createElement('a');
              const objectUrl = URL.createObjectURL(blob);
              link.href = objectUrl;
              link.download = exportName;
              link.click();
              // Defer revocation so the browser has time to start the download
              setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
              showToast(`Exported "${exportName}" successfully!`, 'success');
            } else {
              showToast('Export failed: binary format not generated.', 'error');
            }
          },
          { binary: true } // Standard uncompressed binary GLB without Draco
        );
      } catch (err) {
        console.error('Export error:', err);
        showToast('Failed to export current model.', 'error');
      }
    }

    // Auto-frame and center loaded model in viewport
    function frameModel(object) {
      const box = new THREE.Box3().setFromObject(object);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // Center model at internal origin (Y = 0)
      object.position.x += (object.position.x - center.x);
      object.position.y += (object.position.y - box.min.y);
      object.position.z += (object.position.z - center.z);

      // Recompute bounding box after translation
      box.setFromObject(object);
      box.getSize(size);
      box.getCenter(center);

      // Compute ideal camera distance
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.7;
      cameraDistance = Math.max(cameraDistance, 2.5);

      camera.position.set(center.x + cameraDistance * 0.8, center.y + cameraDistance * 0.45, center.z + cameraDistance * 0.8);
      controls.target.copy(new THREE.Vector3(center.x, center.y, center.z));
      controls.update();

      // Dynamic slider range tuning based on model scale
      const dynamicBound = Math.max(10, Math.round(maxDim * 3));
      sliderPosX.min = -dynamicBound;
      sliderPosX.max = dynamicBound;
      sliderPosY.min = -dynamicBound;
      sliderPosY.max = dynamicBound * 2;
      sliderPosZ.min = -dynamicBound;
      sliderPosZ.max = dynamicBound;

      if (gridHelper) {
        gridHelper.position.y = 0;
      }
    }

    // Inspect Mesh & Geometry Statistics
    function updateModelStats(object) {
      let meshCount = 0;
      let vertexCount = 0;
      let triangleCount = 0;

      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          meshCount++;
          const geo = child.geometry;
          if (geo.attributes.position) {
            vertexCount += geo.attributes.position.count;
          }
          if (geo.index) {
            triangleCount += geo.index.count / 3;
          } else if (geo.attributes.position) {
            triangleCount += geo.attributes.position.count / 3;
          }

          // Enable shadow flags
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      statMeshes.textContent = meshCount.toLocaleString();
      statVertices.textContent = vertexCount.toLocaleString();
      statTriangles.textContent = Math.round(triangleCount).toLocaleString();
    }

    // Escape user-controlled strings (e.g. file names) before inserting into innerHTML
    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Core GLB Parsing Logic shared by File Input and Drag-and-Drop
    function processGlbFile(file) {
      if (!file) return;

      // 64MB File Size Limit Check (64 * 1024 * 1024 bytes)
      const MAX_FILE_SIZE_BYTES = 64 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        showToast(`File is too large (${fileSizeMB}MB). The maximum allowed file size is 64MB.`, 'error');
        fileInput.value = '';
        return;
      }

      // Validate .glb extension
      const fileName = file.name;
      if (!fileName.toLowerCase().endsWith('.glb')) {
        showToast('Please select a valid .glb 3D model file.', 'error');
        fileInput.value = '';
        return;
      }

      activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Loading...';
      activeFilename.innerHTML = `Loading: <span class="text-white">${escapeHtml(fileName)}</span>`;

      const reader = new FileReader();

      reader.onload = function(event) {
        const contents = event.target.result;

        // Inspect GLB binary headers before passing to GLTFLoader
        // This proactively detects KHR_draco_mesh_compression and prevents uncaught DracoLoader exceptions
        try {
          const isDraco = checkDracoCompression(contents);
          if (isDraco) {
            activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Draco Rejected';
            activeFilename.innerHTML = `<span class="text-amber-300 font-medium">${escapeHtml(fileName)}</span> (Draco compressed)`;
            showToast('Draco-compressed model detected! This viewer only supports standard uncompressed .glb files.', 'warning');
            fileInput.value = '';
            return;
          }
        } catch (e) {
          console.warn('GLB header inspection failed, proceeding to standard loader:', e);
        }

        // Strict Requirement: GLTFLoader without any DRACOLoader attached
        const loader = new THREE.GLTFLoader();

        try {
          loader.parse(
            contents,
            '',
            function(gltf) {
              // Successfully parsed
              if (currentModel) {
                modelPivotGroup.remove(currentModel);
              }

              // Stop any existing mixer
              if (mixer) {
                mixer.stopAllAction();
                mixer = null;
              }

              currentModel = gltf.scene || gltf.scenes[0];
              modelPivotGroup.add(currentModel);
              currentModelFilename = fileName.replace(/\.glb$/i, '');
              if (exportBtnLabel) exportBtnLabel.textContent = `Export ${currentModelFilename.slice(0, 14)} .GLB`;

              // Setup GLTF Animations if present
              if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(currentModel);
                gltf.animations.forEach((clip) => {
                  mixer.clipAction(clip).play();
                });
              }

              // Apply existing wireframe preference
              applyWireframe(isWireframe);

              // Reset transform sliders and frame
              resetTransformsUI();
              frameModel(currentModel);
              updateModelStats(currentModel);

              activeFilename.innerHTML = `Active: <span class="text-emerald-300 font-medium">${escapeHtml(fileName)}</span>`;
              activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Loaded';
              showToast(`"${fileName}" loaded successfully!`, 'success');

              // Automatically minimize the model loader panel after successful model loading
              setTimeout(() => {
                setLoaderMinimized(true);
              }, 400);
            },
            function(error) {
              console.warn('GLTF Parse Notice:', error);
              activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Unsupported';
              
              const errorStr = (error && error.message) ? error.message : String(error);
              if (errorStr.toLowerCase().includes('draco') || errorStr.toLowerCase().includes('khr_draco_mesh_compression')) {
                showToast('Draco compression is not supported. Please select an uncompressed .glb model.', 'warning');
              } else {
                showToast('Failed to load model. Please provide a standard uncompressed .glb file.', 'error');
              }
              fileInput.value = '';
            }
          );
        } catch (err) {
          // Catch synchronous DracoLoader missing error thrown inside GLTFLoader.parse
          const errMessage = (err && err.message) ? err.message : String(err);
          if (errMessage.toLowerCase().includes('draco')) {
            activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Draco Rejected';
            activeFilename.innerHTML = `<span class="text-amber-300 font-medium">${escapeHtml(fileName)}</span> (Draco compressed)`;
            showToast('Draco-compressed model detected. Draco compression is not allowed.', 'warning');
          } else {
            console.error('Loader Runtime Exception:', err);
            activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Error';
            showToast('Error parsing .glb file. Only standard uncompressed .glb is supported.', 'error');
          }
          fileInput.value = '';
        }
      };

      reader.onerror = function() {
        showToast('Error reading the selected file from disk.', 'error');
        activeStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Read Error';
      };

      reader.readAsArrayBuffer(file);
    }

    // File Input Listener
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      processGlbFile(file);
    });

    // Window Drag and Drop Handling
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dropOverlay) dropOverlay.classList.add('active');
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        if (dropOverlay) dropOverlay.classList.remove('active');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      if (dropOverlay) dropOverlay.classList.remove('active');

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processGlbFile(files[0]);
      }
    });

    // Helper to scan GLB JSON chunk for KHR_draco_mesh_compression
    function checkDracoCompression(arrayBuffer) {
      if (!arrayBuffer || arrayBuffer.byteLength < 20) return false;
      const dataView = new DataView(arrayBuffer);
      
      // Magic number check 'glTF' (0x46546C67)
      const magic = dataView.getUint32(0, true);
      if (magic !== 0x46546C67) return false;

      // First chunk is JSON
      const jsonChunkLength = dataView.getUint32(12, true);
      const jsonChunkType = dataView.getUint32(16, true);
      // 'JSON' in ASCII is 0x4E4F534A
      if (jsonChunkType !== 0x4E4F534A) return false;

      const decoder = new TextDecoder('utf-8');
      const jsonBytes = new Uint8Array(arrayBuffer, 20, Math.min(jsonChunkLength, arrayBuffer.byteLength - 20));
      const jsonText = decoder.decode(jsonBytes);

      return jsonText.includes('KHR_draco_mesh_compression');
    }

    // Wireframe Toggle Logic
    function applyWireframe(state) {
      if (!currentModel) return;
      currentModel.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.wireframe = state);
          } else {
            child.material.wireframe = state;
          }
        }
      });
    }

    // Light Panel Toggle
    btnToggleLights.addEventListener('click', () => {
      const isHidden = lightsPanel.classList.contains('hidden');
      if (isHidden) {
        lightsPanel.classList.remove('hidden');
        btnToggleLights.classList.add('text-amber-400', 'bg-white/10');
        btnToggleLights.classList.remove('text-gray-400');
      } else {
        lightsPanel.classList.add('hidden');
        btnToggleLights.classList.remove('text-amber-400', 'bg-white/10');
        btnToggleLights.classList.add('text-gray-400');
      }
    });

    // Ambient light slider
    sliderAmbient.addEventListener('pointerdown', () => pushLightHistory());
    sliderAmbient.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (sceneAmbientLight) sceneAmbientLight.intensity = val;
      valAmbient.textContent = val.toFixed(2);
    });

    // Toggle all light helpers in scene
    chkLightHelpers.addEventListener('change', (e) => {
      const show = e.target.checked;
      customLights.forEach(item => {
        if (item.helper) item.helper.visible = show;
      });
    });

    // Add Light Factory
    function addCustomLight(type = 'point', opts = {}, recordHistory = true) {
      if (recordHistory) {
        pushLightHistory();
      }
      const id = lightIdCounter++;
      const name = `${type.toUpperCase()} #${id}`;
      const colorHex = opts.color || '#ffffff';
      const intensity = opts.intensity !== undefined ? opts.intensity : 2.0;
      const posX = opts.x !== undefined ? opts.x : (Math.random() * 6 - 3);
      const posY = opts.y !== undefined ? opts.y : (2 + Math.random() * 3);
      const posZ = opts.z !== undefined ? opts.z : (Math.random() * 6 - 3);

      let light, helper;

      if (type === 'point') {
        light = new THREE.PointLight(new THREE.Color(colorHex), intensity, 25, 1.2);
        light.position.set(posX, posY, posZ);
        light.castShadow = true;
        scene.add(light);

        helper = new THREE.PointLightHelper(light, 0.35);
        helper.visible = chkLightHelpers.checked;
        scene.add(helper);
      } else if (type === 'spot') {
        light = new THREE.SpotLight(new THREE.Color(colorHex), intensity, 35, Math.PI / 4, 0.4, 1.2);
        light.position.set(posX, posY, posZ);
        light.castShadow = true;
        scene.add(light);

        helper = new THREE.SpotLightHelper(light);
        helper.visible = chkLightHelpers.checked;
        scene.add(helper);
      } else if (type === 'directional') {
        light = new THREE.DirectionalLight(new THREE.Color(colorHex), intensity);
        light.position.set(posX, posY, posZ);
        light.castShadow = true;
        scene.add(light);

        helper = new THREE.DirectionalLightHelper(light, 0.6);
        helper.visible = chkLightHelpers.checked;
        scene.add(helper);
      }

      const lightRecord = { id, name, type, light, helper };
      customLights.push(lightRecord);

      renderLightsListUI();
      showToast(`Added ${type} light to scene!`, 'info');
      return lightRecord;
    }

    // Render Lights List in Panel
    function renderLightsListUI() {
      lightCountSpan.textContent = customLights.length;
      const noLightsMsg = document.getElementById('no-custom-lights');

      if (customLights.length === 0) {
        if (noLightsMsg) noLightsMsg.classList.remove('hidden');
        lightsList.innerHTML = '<div id="no-custom-lights" class="text-center py-4 text-gray-500 italic">No custom lights added yet. Click Point, Spot, or Sun above!</div>';
        return;
      }

      lightsList.innerHTML = '';

      customLights.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2';
        
        const hexColor = '#' + item.light.color.getHexString();
        
        div.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <input type="color" value="${hexColor}" class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0" data-id="${item.id}" data-action="color">
              <span class="font-medium text-gray-200">${item.name}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button class="p-1 hover:text-amber-400 text-gray-400" data-id="${item.id}" data-action="toggle-shadow" title="Toggle Cast Shadow">
                <i class="fa-solid fa-cloud-moon ${item.light.castShadow ? 'text-amber-400' : 'text-gray-500'}"></i>
              </button>
              <button class="p-1 hover:text-red-400 text-gray-400 transition-colors" data-id="${item.id}" data-action="delete" title="Remove Light">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <!-- Intensity -->
          <div>
            <div class="flex justify-between text-[11px] text-gray-400 mb-0.5">
              <span>Intensity</span>
              <span class="font-mono text-amber-300" id="light-val-int-${item.id}">${item.light.intensity.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="6" step="0.1" value="${item.light.intensity}" class="w-full h-1 bg-gray-700 rounded appearance-none accent-amber-500 cursor-pointer" data-id="${item.id}" data-action="intensity">
          </div>

          <!-- Position Sliders -->
          <div class="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
            <div>
              <span class="text-gray-400">X: <span id="light-val-x-${item.id}" class="text-gray-200">${item.light.position.x.toFixed(1)}</span></span>
              <input type="range" min="-12" max="12" step="0.2" value="${item.light.position.x}" class="w-full h-1 bg-gray-700 rounded accent-red-400" data-id="${item.id}" data-action="pos-x">
            </div>
            <div>
              <span class="text-gray-400">Y: <span id="light-val-y-${item.id}" class="text-gray-200">${item.light.position.y.toFixed(1)}</span></span>
              <input type="range" min="0" max="15" step="0.2" value="${item.light.position.y}" class="w-full h-1 bg-gray-700 rounded accent-emerald-400" data-id="${item.id}" data-action="pos-y">
            </div>
            <div>
              <span class="text-gray-400">Z: <span id="light-val-z-${item.id}" class="text-gray-200">${item.light.position.z.toFixed(1)}</span></span>
              <input type="range" min="-12" max="12" step="0.2" value="${item.light.position.z}" class="w-full h-1 bg-gray-700 rounded accent-blue-400" data-id="${item.id}" data-action="pos-z">
            </div>
          </div>
        `;

        lightsList.appendChild(div);
      });

      // Attach event listeners for dynamic light items
      lightsList.querySelectorAll('[data-action]').forEach(el => {
        const id = parseInt(el.getAttribute('data-id'));
        const action = el.getAttribute('data-action');
        const item = customLights.find(l => l.id === id);
        if (!item) return;

        // Push state snapshot before changes begin.
        // Use a single 'pointerdown' listener only: 'focus' also fires on mouse
        // interaction, which previously produced two identical snapshots per
        // first click and required two Undo presses to step back.
        if (el.tagName === 'INPUT') {
          el.addEventListener('pointerdown', () => pushLightHistory());
        }

        if (action === 'color') {
          el.addEventListener('input', (e) => {
            item.light.color.set(e.target.value);
            if (item.helper && item.helper.update) item.helper.update();
          });
        } else if (action === 'intensity') {
          el.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            item.light.intensity = v;
            const label = document.getElementById(`light-val-int-${id}`);
            if (label) label.textContent = v.toFixed(1);
          });
        } else if (action === 'pos-x') {
          el.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            item.light.position.x = v;
            const label = document.getElementById(`light-val-x-${id}`);
            if (label) label.textContent = v.toFixed(1);
            if (item.helper && item.helper.update) item.helper.update();
          });
        } else if (action === 'pos-y') {
          el.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            item.light.position.y = v;
            const label = document.getElementById(`light-val-y-${id}`);
            if (label) label.textContent = v.toFixed(1);
            if (item.helper && item.helper.update) item.helper.update();
          });
        } else if (action === 'pos-z') {
          el.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            item.light.position.z = v;
            const label = document.getElementById(`light-val-z-${id}`);
            if (label) label.textContent = v.toFixed(1);
            if (item.helper && item.helper.update) item.helper.update();
          });
        } else if (action === 'toggle-shadow') {
          el.addEventListener('click', () => {
            pushLightHistory();
            item.light.castShadow = !item.light.castShadow;
            renderLightsListUI();
          });
        } else if (action === 'delete') {
          el.addEventListener('click', () => {
            removeCustomLight(id);
          });
        }
      });
    }

    // Remove Light from Scene
    function removeCustomLight(id) {
      pushLightHistory();
      const idx = customLights.findIndex(l => l.id === id);
      if (idx !== -1) {
        const item = customLights[idx];
        scene.remove(item.light);
        if (item.helper) scene.remove(item.helper);
        customLights.splice(idx, 1);
        renderLightsListUI();
        showToast('Light removed from canvas.', 'info');
      }
    }

    // Add Light Toolbar Buttons Listeners
    btnAddPointLight.addEventListener('click', () => addCustomLight('point'));
    btnAddSpotLight.addEventListener('click', () => addCustomLight('spot'));
    btnAddDirLight.addEventListener('click', () => addCustomLight('directional'));

    btnWireframe.addEventListener('click', () => {
      isWireframe = !isWireframe;
      applyWireframe(isWireframe);
      btnWireframe.classList.toggle('text-emerald-400', isWireframe);
      btnWireframe.classList.toggle('bg-white/10', isWireframe);
    });

    // Auto-Rotate Toggle
    btnAutoRotate.addEventListener('click', () => {
      autoRotate = !autoRotate;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 2.0;
      btnAutoRotate.classList.toggle('text-emerald-400', autoRotate);
      btnAutoRotate.classList.toggle('bg-white/10', autoRotate);
    });

    // Grid Visibility Toggle
    btnGrid.addEventListener('click', () => {
      if (gridHelper) {
        gridHelper.visible = !gridHelper.visible;
        btnGrid.classList.toggle('text-emerald-400', gridHelper.visible);
        btnGrid.classList.toggle('bg-white/10', gridHelper.visible);
        btnGrid.classList.toggle('text-gray-400', !gridHelper.visible);
      }
    });

    // Toggle Transform Panel visibility
    btnToggleSliders.addEventListener('click', () => {
      const isHidden = transformPanel.classList.contains('hidden');
      if (isHidden) {
        transformPanel.classList.remove('hidden');
        btnToggleSliders.classList.add('text-emerald-400', 'bg-white/10');
        btnToggleSliders.classList.remove('text-gray-400');
      } else {
        transformPanel.classList.add('hidden');
        btnToggleSliders.classList.remove('text-emerald-400', 'bg-white/10');
        btnToggleSliders.classList.add('text-gray-400');
      }
    });

    // Tab Navigation for Transforms
    function switchTab(activeTab) {
      [tabPos, tabRot, tabScale].forEach(tab => {
        tab.className = 'flex-1 py-1 text-center font-medium rounded-lg text-gray-400 hover:text-gray-200 transition-colors';
      });
      sectionPos.classList.add('hidden');
      sectionRot.classList.add('hidden');
      sectionScale.classList.add('hidden');

      if (activeTab === 'pos') {
        tabPos.className = 'flex-1 py-1 text-center font-medium rounded-lg bg-emerald-500/20 text-emerald-300 transition-colors';
        sectionPos.classList.remove('hidden');
      } else if (activeTab === 'rot') {
        tabRot.className = 'flex-1 py-1 text-center font-medium rounded-lg bg-emerald-500/20 text-emerald-300 transition-colors';
        sectionRot.classList.remove('hidden');
      } else if (activeTab === 'scale') {
        tabScale.className = 'flex-1 py-1 text-center font-medium rounded-lg bg-emerald-500/20 text-emerald-300 transition-colors';
        sectionScale.classList.remove('hidden');
      }
    }

    tabPos.addEventListener('click', () => switchTab('pos'));
    tabRot.addEventListener('click', () => switchTab('rot'));
    tabScale.addEventListener('click', () => switchTab('scale'));

    // Apply Position Changes to modelPivotGroup
    function updatePosition() {
      if (!modelPivotGroup) return;
      const x = parseFloat(sliderPosX.value);
      const y = parseFloat(sliderPosY.value);
      const z = parseFloat(sliderPosZ.value);

      modelPivotGroup.position.set(x, y, z);
      valPosX.textContent = x.toFixed(2);
      valPosY.textContent = y.toFixed(2);
      valPosZ.textContent = z.toFixed(2);
    }

    sliderPosX.addEventListener('input', updatePosition);
    sliderPosY.addEventListener('input', updatePosition);
    sliderPosZ.addEventListener('input', updatePosition);

    // Apply Rotation Changes (in degrees) to modelPivotGroup
    function updateRotation() {
      if (!modelPivotGroup) return;
      const degX = parseFloat(sliderRotX.value);
      const degY = parseFloat(sliderRotY.value);
      const degZ = parseFloat(sliderRotZ.value);

      modelPivotGroup.rotation.set(
        THREE.MathUtils.degToRad(degX),
        THREE.MathUtils.degToRad(degY),
        THREE.MathUtils.degToRad(degZ)
      );

      valRotX.textContent = `${degX}°`;
      valRotY.textContent = `${degY}°`;
      valRotZ.textContent = `${degZ}°`;
    }

    sliderRotX.addEventListener('input', updateRotation);
    sliderRotY.addEventListener('input', updateRotation);
    sliderRotZ.addEventListener('input', updateRotation);

    // Apply Scale Changes
    function updateScale() {
      if (!modelPivotGroup) return;
      const sx = parseFloat(sliderScaleX.value);
      const sy = parseFloat(sliderScaleY.value);
      const sz = parseFloat(sliderScaleZ.value);

      modelPivotGroup.scale.set(sx, sy, sz);
      valScaleX.textContent = sx.toFixed(2);
      valScaleY.textContent = sy.toFixed(2);
      valScaleZ.textContent = sz.toFixed(2);
    }

    sliderScaleUniform.addEventListener('input', (e) => {
      const u = parseFloat(e.target.value);
      sliderScaleX.value = u;
      sliderScaleY.value = u;
      sliderScaleZ.value = u;
      valScaleUniform.textContent = `${u.toFixed(2)}x`;
      updateScale();
    });

    sliderScaleX.addEventListener('input', updateScale);
    sliderScaleY.addEventListener('input', updateScale);
    sliderScaleZ.addEventListener('input', updateScale);

    // Reset Model Transforms back to origin
    function resetTransformsUI() {
      if (!modelPivotGroup) return;

      sliderPosX.value = 0;
      sliderPosY.value = 0;
      sliderPosZ.value = 0;
      valPosX.textContent = "0.00";
      valPosY.textContent = "0.00";
      valPosZ.textContent = "0.00";

      sliderRotX.value = 0;
      sliderRotY.value = 0;
      sliderRotZ.value = 0;
      valRotX.textContent = "0°";
      valRotY.textContent = "0°";
      valRotZ.textContent = "0°";

      sliderScaleUniform.value = 1;
      sliderScaleX.value = 1;
      sliderScaleY.value = 1;
      sliderScaleZ.value = 1;
      valScaleUniform.textContent = "1.00x";
      valScaleX.textContent = "1.00";
      valScaleY.textContent = "1.00";
      valScaleZ.textContent = "1.00";

      modelPivotGroup.position.set(0, 0, 0);
      modelPivotGroup.rotation.set(0, 0, 0);
      modelPivotGroup.scale.set(1, 1, 1);
    }

    btnResetTransforms.addEventListener('click', () => {
      resetTransformsUI();
      showToast('Transforms reset to origin.', 'info');
    });

    // Reset Camera & View Button
    btnResetCam.addEventListener('click', () => {
      if (currentModel) {
        frameModel(currentModel);
      } else {
        camera.position.set(5, 4, 7);
        controls.target.set(0, 1.5, 0);
        controls.update();
      }
    });

    // Load Default Model Button
    btnDefault.addEventListener('click', () => {
      loadDefaultModel();
      fileInput.value = '';
      showToast('Loaded standard default model.', 'info');
      // Automatically minimize the loader panel
      setTimeout(() => {
        setLoaderMinimized(true);
      }, 400);
    });

    // Load Practice Crown Model Button
    if (btnCrown) {
      btnCrown.addEventListener('click', () => {
        loadCrownModel();
        fileInput.value = '';
        showToast('Loaded practice Royal Golden Crown model.', 'info');
        setTimeout(() => {
          setLoaderMinimized(true);
        }, 400);
      });
    }

    // Download/Export Any Active .glb Button
    if (btnDownloadGlb) {
      btnDownloadGlb.addEventListener('click', () => {
        exportActiveModelGlb();
      });
    }

    if (btnHeaderExport) {
      btnHeaderExport.addEventListener('click', () => {
        exportActiveModelGlb();
      });
    }

    // Resize Handler
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Draggable Floating Panels Implementation
    let highestZIndex = 30;

    function makeDraggable(panel, handle) {
      let isDragging = false;
      let startX, startY;
      let initialLeft, initialTop;

      const bringToFront = () => {
        highestZIndex++;
        panel.style.zIndex = highestZIndex;
      };

      panel.addEventListener('pointerdown', bringToFront);

      handle.addEventListener('pointerdown', (e) => {
        // Prevent drag initiation from form controls, buttons, or icons inside buttons
        if (e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('label')) {
          return;
        }

        isDragging = true;
        bringToFront();

        const rect = panel.getBoundingClientRect();

        // Convert CSS right-positioned elements to explicit left/top on first drag
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        startX = e.clientX;
        startY = e.clientY;
        initialLeft = rect.left;
        initialTop = rect.top;

        handle.setPointerCapture(e.pointerId);
        e.preventDefault();
      });

      handle.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let nextLeft = initialLeft + deltaX;
        let nextTop = initialTop + deltaY;

        // Keep within viewport boundaries
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        const maxLeft = window.innerWidth - panelWidth - 8;
        const maxTop = window.innerHeight - panelHeight - 8;

        nextLeft = Math.max(8, Math.min(nextLeft, maxLeft));
        nextTop = Math.max(8, Math.min(nextTop, maxTop));

        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
      });

      const stopDrag = (e) => {
        if (isDragging) {
          isDragging = false;
          try {
            handle.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
      };

      handle.addEventListener('pointerup', stopDrag);
      handle.addEventListener('pointercancel', stopDrag);
    }

    // Initialize panel drag handles
    const lightsDragHandle = document.getElementById('lights-drag-handle');
    const transformDragHandle = document.getElementById('transform-drag-handle');
    makeDraggable(lightsPanel, lightsDragHandle);
    makeDraggable(transformPanel, transformDragHandle);

    // Collapsible Panels Implementation
    function setupCollapsible(panel, toggleBtn, handle, bodyElement) {
      const toggle = () => {
        const isCurrentlyCollapsed = panel.classList.contains('panel-collapsed');
        const header = panel.querySelector('.panel-header-drag');
        const triangle = toggleBtn ? toggleBtn.querySelector('.collapse-triangle') : null;

        if (isCurrentlyCollapsed) {
          // EXPAND
          panel.classList.remove('panel-collapsed');
          if (bodyElement) {
            bodyElement.style.display = panel.id === 'lights-panel' ? 'flex' : 'block';
            bodyElement.style.maxHeight = panel.id === 'lights-panel' ? '65vh' : '600px';
            bodyElement.style.opacity = '1';
          }
          if (triangle) {
            triangle.style.transform = 'rotate(0deg)';
          }
          if (header) {
            header.classList.add('pb-2.5', 'border-b');
            if (panel.id === 'lights-panel') {
              header.classList.add('mb-2.5');
            } else {
              header.classList.add('mb-3');
            }
          }
        } else {
          // COLLAPSE
          panel.classList.add('panel-collapsed');
          if (bodyElement) {
            bodyElement.style.display = 'none';
            bodyElement.style.maxHeight = '0px';
            bodyElement.style.opacity = '0';
          }
          if (triangle) {
            triangle.style.transform = 'rotate(-90deg)';
          }
          if (header) {
            header.classList.remove('pb-2.5', 'mb-2.5', 'mb-3', 'border-b');
          }
        }
      };

      // Click on triangle toggle button
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        });
      }

      // Double-click on header to toggle collapse
      if (handle) {
        handle.addEventListener('dblclick', (e) => {
          if (e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.closest('label')) {
            e.preventDefault();
            e.stopPropagation();
            toggle();
          }
        });
      }
    }

    const lightsBody = document.getElementById('lights-body');
    const transformBody = document.getElementById('transform-body');
    setupCollapsible(lightsPanel, btnCollapseLights, lightsDragHandle, lightsBody);
    setupCollapsible(transformPanel, btnCollapseTransform, transformDragHandle, transformBody);

    // Animation & Render Loop
    function animate() {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Play loaded GLTF animations if any
      if (mixer) {
        mixer.update(delta);
      }

      // Idle bobbing for procedural floating gem
      if (currentModel) {
        currentModel.traverse((child) => {
          if (child.userData && child.userData.isFloatingCrystal) {
            child.rotation.y += 0.02;
            child.rotation.x = Math.sin(elapsedTime * 2) * 0.15;
            child.position.y = 3.4 + Math.sin(elapsedTime * 2.5) * 0.12;
          }
        });
      }

      // Update light helpers
      customLights.forEach(item => {
        if (item.helper && item.helper.update && item.helper.visible) {
          item.helper.update();
        }
      });

      controls.update();
      renderer.render(scene, camera);
    }

    // Start on Window Load
    window.onload = function () {
      initScene();
      animate();
    };