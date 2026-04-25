class KnowledgeGraphVisualizer {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.labelRenderer = null;
        
        this.nodes = new Map();
        this.edges = [];
        this.nodeMeshes = new Map();
        this.edgeMeshes = [];
        this.labels = [];
        
        this.selectedNode = null;
        this.hoveredNode = null;
        this.mode = 'select';
        this.selectionBuffer = [];
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.animationTime = 0;
        this.isAnimating = false;
        
        this.currentClimate = 'spring';
        this.climateParticles = null;
        this.climateLight = null;
        
        this.previewNodes = new Set();
        this.highlightedNodes = new Map();
        
        this.isPlaying = false;
        this.playbackCommands = [];
        this.currentPlaybackStep = 0;
        this.playbackTimer = null;
        
        this.originalSceneState = null;
        
        this.init();
    }
    
    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f1a2a);
        this.scene.fog = new THREE.Fog(0x0f1a2a, 30, 80);
        
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(15, 15, 25);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        this.labelRenderer = new THREE.CSS2DRenderer();
        this.labelRenderer.setSize(width, height);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        this.container.appendChild(this.labelRenderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI * 0.9;
        
        this.addLights();
        this.addGrid();
        this.addParticles();
        this.initClimateEffects();
        this.setupEventListeners();
        this.animate();
    }
    
    addLights() {
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0x64b5f6, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        this.climateLight = directionalLight;
        
        const pointLight1 = new THREE.PointLight(0x66bb6a, 0.5, 50);
        pointLight1.position.set(-15, 10, -15);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xba68c8, 0.4, 50);
        pointLight2.position.set(15, 5, 15);
        this.scene.add(pointLight2);
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(100, 100, 0x1a3a5a, 0x0f2a4a);
        gridHelper.position.y = -5;
        this.scene.add(gridHelper);
    }
    
    addParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            
            const color = new THREE.Color();
            color.setHSL(0.5 + Math.random() * 0.2, 0.5, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }
    
    initClimateEffects() {
        const climateParticleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(climateParticleCount * 3);
        const colors = new Float32Array(climateParticleCount * 3);
        
        for (let i = 0; i < climateParticleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 80;
            positions[i * 3 + 1] = Math.random() * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
            
            const color = new THREE.Color(0x81c784);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.0
        });
        
        this.climateParticles = new THREE.Points(geometry, material);
        this.scene.add(this.climateParticles);
    }
    
    setClimate(climateType) {
        this.currentClimate = climateType;
        
        const climateColors = {
            spring: { ambient: 0x81c784, particle: 0xa5d6a7, bg: 0x0f2a1a, fog: 0x0f2a1a },
            summer: { ambient: 0xffb74d, particle: 0xffcc80, bg: 0x2a1a0f, fog: 0x2a1a0f },
            autumn: { ambient: 0xff8a65, particle: 0xffab91, bg: 0x2a1a1a, fog: 0x2a1a1a },
            winter: { ambient: 0x90caf9, particle: 0xbbdefb, bg: 0x0f1a2a, fog: 0x0f1a2a },
            storm: { ambient: 0xba68c8, particle: 0xce93d8, bg: 0x1a0f2a, fog: 0x1a0f2a },
            drought: { ambient: 0xa1887f, particle: 0xbcaaa4, bg: 0x2a251f, fog: 0x2a251f }
        };
        
        const climate = climateColors[climateType] || climateColors.spring;
        
        this.scene.background = new THREE.Color(climate.bg);
        this.scene.fog = new THREE.Fog(climate.fog, 30, 80);
        
        if (this.climateLight) {
            this.climateLight.color = new THREE.Color(climate.ambient);
        }
        
        if (this.climateParticles) {
            const positions = this.climateParticles.geometry.attributes.position.array;
            const colors = this.climateParticles.geometry.attributes.color.array;
            const particleColor = new THREE.Color(climate.particle);
            
            for (let i = 0; i < colors.length; i += 3) {
                colors[i] = particleColor.r;
                colors[i + 1] = particleColor.g;
                colors[i + 2] = particleColor.b;
            }
            this.climateParticles.geometry.attributes.color.needsUpdate = true;
            
            this.climateParticles.material.opacity = climateType === 'winter' || climateType === 'storm' ? 0.8 : 0.3;
        }
        
        if (this.onClimateChange) {
            this.onClimateChange(climateType);
        }
    }
    
    createNodeMesh(nodeData) {
        const group = new THREE.Group();
        group.userData.nodeId = nodeData.id;
        
        const size = nodeData.size || 1;
        const isHybrid = nodeData.node_type === 'hybrid';
        const isWilting = nodeData.status === 'wilting';
        
        let mainGeometry;
        let mainMaterial;
        
        if (isHybrid) {
            mainGeometry = new THREE.OctahedronGeometry(size, 1);
            mainMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(nodeData.color || 0x9c27b0),
                emissive: new THREE.Color(nodeData.color || 0x9c27b0).multiplyScalar(0.2),
                shininess: 100,
                transparent: true,
                opacity: 0.9
            });
        } else {
            mainGeometry = new THREE.SphereGeometry(size, 16, 16);
            mainMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(nodeData.color || 0x4caf50),
                emissive: new THREE.Color(nodeData.color || 0x4caf50).multiplyScalar(isWilting ? 0.05 : 0.15),
                shininess: 50,
                transparent: true,
                opacity: isWilting ? 0.5 : 0.9
            });
        }
        
        const mainMesh = new THREE.Mesh(mainGeometry, mainMaterial);
        mainMesh.castShadow = true;
        mainMesh.receiveShadow = true;
        group.add(mainMesh);
        
        const glowGeometry = new THREE.SphereGeometry(size * 1.3, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(nodeData.color || 0x4caf50),
            transparent: true,
            opacity: isWilting ? 0.05 : 0.15,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glowMesh);
        
        const previewRingGeometry = new THREE.RingGeometry(size * 1.4, size * 1.6, 32);
        const previewRingMaterial = new THREE.MeshBasicMaterial({
            color: 0xffc107,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide
        });
        const previewRing = new THREE.Mesh(previewRingGeometry, previewRingMaterial);
        previewRing.rotation.x = -Math.PI / 2;
        previewRing.position.y = -0.1;
        group.add(previewRing);
        group.userData.previewRing = previewRing;
        
        if (nodeData.growth_stage > 0.5) {
            const leafGeometry = new THREE.ConeGeometry(size * 0.3, size * 0.8, 4);
            const leafMaterial = new THREE.MeshPhongMaterial({
                color: 0x81c784,
                transparent: true,
                opacity: 0.8
            });
            
            for (let i = 0; i < 3; i++) {
                const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                leaf.position.y = size * 0.8;
                leaf.rotation.z = (i * Math.PI * 2 / 3);
                leaf.rotation.x = Math.PI / 6;
                group.add(leaf);
            }
        }
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'node-label';
        labelDiv.style.cssText = `
            color: #e0e0e0;
            background: rgba(20, 30, 50, 0.9);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            pointer-events: none;
            user-select: none;
            border: 1px solid rgba(100, 150, 200, 0.3);
            white-space: nowrap;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        labelDiv.textContent = nodeData.title || nodeData.content.substring(0, 30);
        
        const label = new THREE.CSS2DObject(labelDiv);
        label.position.y = size + 0.5;
        group.add(label);
        
        group.userData.mesh = mainMesh;
        group.userData.label = label;
        group.userData.originalColor = new THREE.Color(nodeData.color || 0x4caf50);
        group.userData.originalScale = new THREE.Vector3(1, 1, 1);
        group.userData.originalPosition = new THREE.Vector3(
            nodeData.x || 0,
            nodeData.y || 0,
            nodeData.z || 0
        );
        
        return group;
    }
    
    createEdgeMesh(edgeData, nodesMap) {
        const source = nodesMap.get(edgeData.source);
        const target = nodesMap.get(edgeData.target);
        
        if (!source || !target) return null;
        
        const start = new THREE.Vector3(source.x, source.y, source.z);
        const end = new THREE.Vector3(target.x, target.y, target.z);
        
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y += 1;
        
        const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
        const points = curve.getPoints(20);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const isParent = edgeData.relation === 'parent';
        const isPotential = edgeData.relation === 'potential';
        
        const color = isParent ? 0xba68c8 : (isPotential ? 0xff9800 : 0x42a5f5);
        const opacity = isPotential ? 0.4 : 0.6;
        const lineWidth = isParent ? 0.15 : 0.08;
        
        const material = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            linewidth: lineWidth
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData.edgeData = edgeData;
        line.userData.curve = curve;
        
        return line;
    }
    
    loadGraph(graphData) {
        this.clearGraph();
        
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];
        
        const nodesMap = new Map();
        nodes.forEach(node => {
            nodesMap.set(node.id, node);
            this.nodes.set(node.id, node);
            
            const mesh = this.createNodeMesh(node);
            mesh.position.set(node.x, node.y, node.z);
            this.nodeMeshes.set(node.id, mesh);
            this.scene.add(mesh);
        });
        
        edges.forEach(edge => {
            const edgeMesh = this.createEdgeMesh(edge, nodesMap);
            if (edgeMesh) {
                this.edges.push(edge);
                this.edgeMeshes.push(edgeMesh);
                this.scene.add(edgeMesh);
            }
        });
    }
    
    clearGraph() {
        this.edgeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        });
        this.edgeMeshes = [];
        this.edges = [];
        
        this.nodeMeshes.forEach(mesh => {
            if (mesh.userData && mesh.userData.label) {
                const label = mesh.userData.label;
                if (label.element && label.element.parentNode) {
                    label.element.parentNode.removeChild(label.element);
                }
            }
            
            this.scene.remove(mesh);
            
            mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        this.nodeMeshes.clear();
        this.nodes.clear();
        
        this.selectedNode = null;
        this.hoveredNode = null;
        this.selectionBuffer = [];
        this.previewNodes.clear();
    }
    
    addNode(nodeData) {
        this.nodes.set(nodeData.id, nodeData);
        
        const mesh = this.createNodeMesh(nodeData);
        mesh.position.set(nodeData.x, nodeData.y, nodeData.z);
        this.nodeMeshes.set(nodeData.id, mesh);
        this.scene.add(mesh);
        
        this.animateNodeCreation(nodeData.id);
        
        this.isAnimating = true;
        setTimeout(() => {
            this.isAnimating = false;
        }, 500);
    }
    
    animateNodeCreation(nodeId) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (!mesh) return;
        
        mesh.scale.set(0, 0, 0);
        mesh.userData.originalScale = new THREE.Vector3(1, 1, 1);
        
        const animate = () => {
            mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            if (mesh.scale.x < 0.99) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        Object.assign(node, updates);
        
        const mesh = this.nodeMeshes.get(nodeId);
        if (mesh) {
            if (updates.x !== undefined || updates.y !== undefined || updates.z !== undefined) {
                const targetPos = new THREE.Vector3(
                    updates.x !== undefined ? updates.x : mesh.position.x,
                    updates.y !== undefined ? updates.y : mesh.position.y,
                    updates.z !== undefined ? updates.z : mesh.position.z
                );
                this.animateNodePosition(nodeId, targetPos);
            }
            
            if (updates.color) {
                mesh.userData.originalColor = new THREE.Color(updates.color);
                if (mesh.userData.mesh) {
                    mesh.userData.mesh.material.color = new THREE.Color(updates.color);
                    mesh.userData.mesh.material.emissive = new THREE.Color(updates.color).multiplyScalar(0.15);
                }
            }
            
            if (updates.status === 'wilting') {
                this.animateWilting(nodeId);
            }
        }
    }
    
    animateNodePosition(nodeId, targetPosition) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (!mesh) return;
        
        const startPos = mesh.position.clone();
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            mesh.position.lerpVectors(startPos, targetPosition, eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                const node = this.nodes.get(nodeId);
                if (node) {
                    node.x = targetPosition.x;
                    node.y = targetPosition.y;
                    node.z = targetPosition.z;
                }
            }
        };
        animate();
    }
    
    animateWilting(nodeId) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (!mesh) return;
        
        const animate = () => {
            mesh.scale.multiplyScalar(0.995);
            if (mesh.userData.mesh) {
                mesh.userData.mesh.material.opacity *= 0.995;
            }
            if (mesh.scale.x > 0.3) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    removeNode(nodeId) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (mesh) {
            this.animateNodeRemoval(nodeId, () => {
                if (mesh.userData && mesh.userData.label) {
                    const label = mesh.userData.label;
                    if (label.element && label.element.parentNode) {
                        label.element.parentNode.removeChild(label.element);
                    }
                }
                
                this.scene.remove(mesh);
                
                mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                
                this.nodeMeshes.delete(nodeId);
            });
        }
        this.nodes.delete(nodeId);
        
        this.edgeMeshes = this.edgeMeshes.filter(edgeMesh => {
            const edgeData = edgeMesh.userData.edgeData;
            if (edgeData.source === nodeId || edgeData.target === nodeId) {
                this.scene.remove(edgeMesh);
                return false;
            }
            return true;
        });
        
        this.edges = this.edges.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
        );
    }
    
    animateNodeRemoval(nodeId, callback) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (!mesh) {
            if (callback) callback();
            return;
        }
        
        const duration = 300;
        const startTime = Date.now();
        const startScale = mesh.scale.clone();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            mesh.scale.copy(startScale).multiplyScalar(1 - progress);
            if (mesh.userData.mesh) {
                mesh.userData.mesh.material.opacity = 1 - progress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (callback) callback();
            }
        };
        animate();
    }
    
    addEdge(edgeData) {
        const edgeMesh = this.createEdgeMesh(edgeData, this.nodes);
        if (edgeMesh) {
            this.edges.push(edgeData);
            this.edgeMeshes.push(edgeMesh);
            this.scene.add(edgeMesh);
        }
    }
    
    setPreviewNodes(nodeIds, highlight = true) {
        this.previewNodes.forEach(nodeId => {
            const mesh = this.nodeMeshes.get(nodeId);
            if (mesh && mesh.userData.previewRing) {
                mesh.userData.previewRing.material.opacity = 0.0;
            }
            if (mesh && mesh.userData.mesh) {
                mesh.userData.mesh.material.emissive = mesh.userData.originalColor.clone().multiplyScalar(0.15);
            }
        });
        
        this.previewNodes = new Set(nodeIds);
        
        if (highlight) {
            nodeIds.forEach(nodeId => {
                const mesh = this.nodeMeshes.get(nodeId);
                if (mesh && mesh.userData.previewRing) {
                    mesh.userData.previewRing.material.opacity = 0.8;
                }
                if (mesh && mesh.userData.mesh) {
                    mesh.userData.mesh.material.emissive = new THREE.Color(0xffc107).multiplyScalar(0.5);
                }
            });
        }
    }
    
    highlightNodes(nodeIds, color = 0xffc107, intensity = 0.5) {
        nodeIds.forEach(nodeId => {
            const mesh = this.nodeMeshes.get(nodeId);
            if (mesh && mesh.userData.mesh) {
                this.highlightedNodes.set(nodeId, {
                    originalEmissive: mesh.userData.mesh.material.emissive.clone()
                });
                mesh.userData.mesh.material.emissive = new THREE.Color(color).multiplyScalar(intensity);
            }
        });
    }
    
    clearHighlights() {
        this.highlightedNodes.forEach((data, nodeId) => {
            const mesh = this.nodeMeshes.get(nodeId);
            if (mesh && mesh.userData.mesh) {
                mesh.userData.mesh.material.emissive = data.originalEmissive;
            }
        });
        this.highlightedNodes.clear();
    }
    
    setMode(mode) {
        this.mode = mode;
        this.selectionBuffer = [];
        this.updateNodeHighlights();
    }
    
    updateNodeHighlights() {
        this.nodeMeshes.forEach((mesh, nodeId) => {
            const isSelected = nodeId === this.selectedNode;
            const isInBuffer = this.selectionBuffer.includes(nodeId);
            const isHovered = nodeId === this.hoveredNode;
            const isInPreview = this.previewNodes.has(nodeId);
            
            const mainMesh = mesh.userData.mesh;
            if (mainMesh && !isInPreview) {
                if (isSelected || isInBuffer || isHovered) {
                    mainMesh.material.emissive = mainMesh.material.color.clone().multiplyScalar(0.4);
                    mesh.scale.set(1.1, 1.1, 1.1);
                } else {
                    mainMesh.material.emissive = mesh.userData.originalColor.clone().multiplyScalar(0.15);
                    mesh.scale.set(1, 1, 1);
                }
            }
        });
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        canvas.addEventListener('click', (event) => this.onClick(event));
        canvas.addEventListener('dblclick', (event) => this.onDoubleClick(event));
        
        window.addEventListener('resize', () => this.onResize());
    }
    
    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const meshes = Array.from(this.nodeMeshes.values()).map(m => m.userData.mesh).filter(Boolean);
        const intersects = this.raycaster.intersectObjects(meshes);
        
        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            const parentGroup = mesh.parent;
            const nodeId = parentGroup.userData.nodeId;
            
            if (this.hoveredNode !== nodeId) {
                this.hoveredNode = nodeId;
                this.updateNodeHighlights();
                this.renderer.domElement.style.cursor = 'pointer';
            }
        } else {
            if (this.hoveredNode) {
                this.hoveredNode = null;
                this.updateNodeHighlights();
                this.renderer.domElement.style.cursor = 'grab';
            }
        }
    }
    
    onClick(event) {
        if (this.hoveredNode) {
            this.handleNodeSelection(this.hoveredNode);
        } else if (!event.ctrlKey && !event.metaKey) {
            this.clearSelection();
        }
    }
    
    onDoubleClick(event) {
        if (this.hoveredNode) {
            if (this.onNodeDoubleClick) {
                this.onNodeDoubleClick(this.hoveredNode);
            }
        }
    }
    
    handleNodeSelection(nodeId) {
        switch (this.mode) {
            case 'select':
                this.selectedNode = nodeId;
                this.selectionBuffer = [];
                this.updateNodeHighlights();
                if (this.onNodeSelect) {
                    this.onNodeSelect(nodeId);
                }
                break;
                
            case 'pollinate':
            case 'connect':
                if (this.selectionBuffer.length === 0) {
                    this.selectionBuffer.push(nodeId);
                    this.updateNodeHighlights();
                    if (this.onSelectionBufferUpdate) {
                        this.onSelectionBufferUpdate([...this.selectionBuffer]);
                    }
                } else if (this.selectionBuffer[0] !== nodeId) {
                    this.selectionBuffer.push(nodeId);
                    
                    if (this.mode === 'pollinate') {
                        if (this.onCrossPollinate) {
                            this.onCrossPollinate(this.selectionBuffer[0], this.selectionBuffer[1]);
                        }
                    } else {
                        if (this.onConnect) {
                            this.onConnect(this.selectionBuffer[0], this.selectionBuffer[1]);
                        }
                    }
                    
                    this.selectionBuffer = [];
                    this.updateNodeHighlights();
                }
                break;
                
            case 'evolve':
                this.selectedNode = nodeId;
                if (this.onEvolve) {
                    this.onEvolve(nodeId);
                }
                break;
                
            case 'chat_select':
                if (this.selectionBuffer.includes(nodeId)) {
                    this.selectionBuffer = this.selectionBuffer.filter(id => id !== nodeId);
                } else {
                    this.selectionBuffer.push(nodeId);
                }
                this.setPreviewNodes(this.selectionBuffer);
                if (this.onChatSelectionUpdate) {
                    this.onChatSelectionUpdate([...this.selectionBuffer]);
                }
                break;
        }
    }
    
    clearSelection() {
        this.selectedNode = null;
        this.selectionBuffer = [];
        this.updateNodeHighlights();
        if (this.onClearSelection) {
            this.onClearSelection();
        }
    }
    
    saveSceneState() {
        this.originalSceneState = {
            nodes: new Map(),
            cameraPosition: this.camera.position.clone(),
            controlsTarget: this.controls.target.clone()
        };
        
        this.nodeMeshes.forEach((mesh, nodeId) => {
            this.originalSceneState.nodes.set(nodeId, {
                position: mesh.position.clone(),
                scale: mesh.scale.clone(),
                visible: mesh.visible
            });
        });
    }
    
    restoreSceneState() {
        if (!this.originalSceneState) return;
        
        this.originalSceneState.nodes.forEach((state, nodeId) => {
            const mesh = this.nodeMeshes.get(nodeId);
            if (mesh) {
                mesh.position.copy(state.position);
                mesh.scale.copy(state.scale);
                mesh.visible = state.visible;
            }
        });
        
        this.camera.position.copy(this.originalSceneState.cameraPosition);
        this.controls.target.copy(this.originalSceneState.controlsTarget);
    }
    
    startPlayback(commands) {
        this.playbackCommands = commands;
        this.currentPlaybackStep = 0;
        this.isPlaying = true;
        
        this.saveSceneState();
        
        if (this.onPlaybackStart) {
            this.onPlaybackStart(commands.length);
        }
        
        this.playNextStep();
    }
    
    playNextStep() {
        if (!this.isPlaying || this.currentPlaybackStep >= this.playbackCommands.length) {
            this.stopPlayback();
            return;
        }
        
        const step = this.playbackCommands[this.currentPlaybackStep];
        
        this.executePlaybackStep(step);
        
        if (this.onPlaybackStep) {
            this.onPlaybackStep(this.currentPlaybackStep, this.playbackCommands.length, step);
        }
        
        this.currentPlaybackStep++;
        
        if (this.isPlaying) {
            this.playbackTimer = setTimeout(() => {
                this.playNextStep();
            }, (step.duration || 2) * 1000);
        }
    }
    
    executePlaybackStep(step) {
        const commands = step.commands || [];
        
        commands.forEach(cmd => {
            switch (cmd.type) {
                case 'create_node':
                    const node = this.nodes.get(cmd.node_id);
                    if (node && cmd.animate) {
                        const mesh = this.nodeMeshes.get(cmd.node_id);
                        if (mesh) {
                            mesh.visible = true;
                            this.animateNodeCreation(cmd.node_id);
                        }
                    }
                    break;
                    
                case 'highlight':
                    this.highlightNodes(cmd.node_ids, cmd.color || 0x4caf50, 0.6);
                    break;
                    
                case 'animate_hybrid':
                    this.animateHybridEffect(cmd.parent_a, cmd.parent_b);
                    break;
                    
                case 'create_edge':
                    if (cmd.source && cmd.target) {
                        const edgeData = {
                            source: cmd.source,
                            target: cmd.target,
                            relation: 'related',
                            strength: 1.0
                        };
                        this.addEdge(edgeData);
                    }
                    break;
                    
                case 'climate_effect':
                    this.setClimate(cmd.climate_type || 'spring');
                    break;
                    
                case 'animate_wilt':
                    this.animateWilting(cmd.node_id);
                    break;
                    
                case 'remove_node':
                    this.animateNodeRemoval(cmd.node_id);
                    break;
                    
                case 'focus':
                    if (cmd.node_id) {
                        this.focusOnNode(cmd.node_id);
                    } else if (cmd.position) {
                        this.animateCameraTo(cmd.position);
                    }
                    break;
            }
        });
    }
    
    animateHybridEffect(parentA, parentB) {
        const meshA = this.nodeMeshes.get(parentA);
        const meshB = this.nodeMeshes.get(parentB);
        
        if (meshA && meshB) {
            const pulse = () => {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        if (meshA.userData.mesh) {
                            meshA.userData.mesh.material.emissive = new THREE.Color(0x9c27b0).multiplyScalar(0.8);
                        }
                        if (meshB.userData.mesh) {
                            meshB.userData.mesh.material.emissive = new THREE.Color(0x9c27b0).multiplyScalar(0.8);
                        }
                    }, i * 200);
                    
                    setTimeout(() => {
                        if (meshA.userData.mesh) {
                            meshA.userData.mesh.material.emissive = meshA.userData.originalColor.clone().multiplyScalar(0.15);
                        }
                        if (meshB.userData.mesh) {
                            meshB.userData.mesh.material.emissive = meshB.userData.originalColor.clone().multiplyScalar(0.15);
                        }
                    }, i * 200 + 150);
                }
            };
            pulse();
        }
    }
    
    animateCameraTo(targetPosition) {
        const startPos = this.camera.position.clone();
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.camera.position.lerpVectors(startPos, new THREE.Vector3(
                targetPosition.x,
                targetPosition.y,
                targetPosition.z
            ), eased);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    pausePlayback() {
        this.isPlaying = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
        if (this.onPlaybackPause) {
            this.onPlaybackPause();
        }
    }
    
    resumePlayback() {
        this.isPlaying = true;
        this.playNextStep();
        if (this.onPlaybackResume) {
            this.onPlaybackResume();
        }
    }
    
    stopPlayback() {
        this.isPlaying = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
        this.restoreSceneState();
        if (this.onPlaybackStop) {
            this.onPlaybackStop();
        }
    }
    
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.labelRenderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.animationTime += 0.01;
        
        this.nodeMeshes.forEach((mesh, nodeId) => {
            const node = this.nodes.get(nodeId);
            if (node) {
                const growthStage = node.growth_stage || 0;
                const baseY = node.y || 0;
                
                mesh.rotation.y += 0.002;
                
                const floatOffset = Math.sin(this.animationTime + mesh.position.x) * 0.05;
                mesh.position.y = baseY + floatOffset;
            }
        });
        
        this.edgeMeshes.forEach(edgeMesh => {
            if (edgeMesh.userData.curve) {
                const points = edgeMesh.userData.curve.getPoints(20);
                const time = this.animationTime * 0.5;
                
                for (let i = 0; i < points.length; i++) {
                    const wave = Math.sin(time + i * 0.3) * 0.02;
                    points[i].y += wave;
                }
                
                edgeMesh.geometry.setFromPoints(points);
            }
        });
        
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(this.animationTime * 2 + i) * 0.002;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        if (this.climateParticles && this.currentClimate === 'winter') {
            const positions = this.climateParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += Math.sin(this.animationTime + i) * 0.01;
                positions[i + 1] -= 0.02;
                if (positions[i + 1] < -5) {
                    positions[i + 1] = 40;
                }
            }
            this.climateParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
    
    focusOnNode(nodeId) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (mesh) {
            const targetPosition = mesh.position.clone();
            targetPosition.z += 10;
            targetPosition.y += 5;
            
            this.controls.target.copy(mesh.position);
            this.camera.position.lerp(targetPosition, 0.5);
        }
    }
}
