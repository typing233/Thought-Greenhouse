const API_BASE = '';
let userApiKey = null;

function setApiKey(key) {
    userApiKey = key;
}

function getApiKey() {
    return userApiKey;
}

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    
    return data;
}

async function healthCheck() {
    return apiRequest('/api/health');
}

async function getConfig() {
    return apiRequest('/api/config');
}

async function saveConfig(apiKey) {
    return apiRequest('/api/config', {
        method: 'POST',
        body: JSON.stringify({ deepseek_api_key: apiKey })
    });
}

async function getNodes() {
    return apiRequest('/api/nodes');
}

async function createNode(content) {
    const body = { content };
    if (userApiKey) {
        body.api_key = userApiKey;
    }
    return apiRequest('/api/nodes', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function getNode(nodeId) {
    return apiRequest(`/api/nodes/${nodeId}`);
}

async function updateNode(nodeId, updates) {
    return apiRequest(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
}

async function deleteNode(nodeId) {
    return apiRequest(`/api/nodes/${nodeId}`, {
        method: 'DELETE'
    });
}

async function getEdges() {
    return apiRequest('/api/edges');
}

async function createEdge(source, target, relation = 'related', strength = 1.0) {
    return apiRequest('/api/edges', {
        method: 'POST',
        body: JSON.stringify({ source, target, relation, strength })
    });
}

async function findRelations(nodeA, nodeB) {
    const body = { node_a: nodeA, node_b: nodeB };
    if (userApiKey) {
        body.api_key = userApiKey;
    }
    return apiRequest('/api/relations', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function crossPollinate(parentA, parentB) {
    const body = { parent_a: parentA, parent_b: parentB };
    if (userApiKey) {
        body.api_key = userApiKey;
    }
    return apiRequest('/api/cross-pollinate', {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function getHybrids() {
    return apiRequest('/api/hybrids');
}

async function evolveNode(nodeId) {
    const body = {};
    if (userApiKey) {
        body.api_key = userApiKey;
    }
    return apiRequest(`/api/evolve/${nodeId}`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

async function getGraph() {
    return apiRequest('/api/graph');
}

async function getSuggestions(nodeId) {
    const body = {};
    if (userApiKey) {
        body.api_key = userApiKey;
    }
    return apiRequest(`/api/suggestions/${nodeId}`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}
