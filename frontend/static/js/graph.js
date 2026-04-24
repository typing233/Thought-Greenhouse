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
        });
        this.edgeMeshes = [];
        this.edges = [];
        
        this.nodeMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        this.nodeMeshes.clear();
        this.nodes.clear();
        
        this.selectedNode = null;
        this.hoveredNode = null;
        this.selectionBuffer = [];
    }
    
    addNode(nodeData) {
        this.nodes.set(nodeData.id, nodeData);
        
        const mesh = this.createNodeMesh(nodeData);
        mesh.position.set(nodeData.x, nodeData.y, nodeData.z);
        this.nodeMeshes.set(nodeData.id, mesh);
        this.scene.add(mesh);
        
        this.isAnimating = true;
        setTimeout(() => {
            this.isAnimating = false;
        }, 500);
    }
    
    updateNode(nodeId, updates) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        Object.assign(node, updates);
        
        const mesh = this.nodeMeshes.get(nodeId);
        if (mesh) {
            if (updates.x !== undefined) mesh.position.x = updates.x;
            if (updates.y !== undefined) mesh.position.y = updates.y;
            if (updates.z !== undefined) mesh.position.z = updates.z;
            
            if (updates.color) {
                mesh.userData.originalColor = new THREE.Color(updates.color);
                if (mesh.userData.mesh) {
                    mesh.userData.mesh.material.color = new THREE.Color(updates.color);
                    mesh.userData.mesh.material.emissive = new THREE.Color(updates.color).multiplyScalar(0.15);
                }
            }
        }
    }
    
    removeNode(nodeId) {
        const mesh = this.nodeMeshes.get(nodeId);
        if (mesh) {
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
    
    addEdge(edgeData) {
        const edgeMesh = this.createEdgeMesh(edgeData, this.nodes);
        if (edgeMesh) {
            this.edges.push(edgeData);
            this.edgeMeshes.push(edgeMesh);
            this.scene.add(edgeMesh);
        }
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
            
            const mainMesh = mesh.userData.mesh;
            if (mainMesh) {
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
