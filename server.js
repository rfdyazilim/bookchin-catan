const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// ========== CONSTANTS ==========

const TILE_TYPES = ['CIVIC', 'ECO', 'CAPITAL', 'TECH'];

const FACTIONS = [
  { 
    id: 'urbanizer', 
    name: 'Metropol Geliştiricileri',
    icon: '🏗️',
    color: '#ff9800',
    canProduce: ['CAPITAL', 'TECH'],
    settlementCost: { capital: 2 },
    roadCost: { capital: 1, tech: 1 }
  },
  { 
    id: 'speculator', 
    name: 'Rant Lordları',
    icon: '💰',
    color: '#e91e63',
    canProduce: ['CAPITAL', 'TECH'],
    settlementCost: { capital: 1, tech: 1 },
    roadCost: { capital: 1, tech: 1 }
  },
  { 
    id: 'ecologist', 
    name: 'Ekoloji Savunucuları',
    icon: '🌱',
    color: '#4caf50',
    canProduce: ['ECO', 'CIVIC'],
    settlementCost: { eco: 2 },
    roadCost: { civic: 1, eco: 1 }
  },
  { 
    id: 'communalist', 
    name: 'Komünal Kentçiler',
    icon: '⚖️',
    color: '#4a9eff',
    canProduce: ['CIVIC', 'ECO'],
    settlementCost: { civic: 1, eco: 1 },
    roadCost: { civic: 1, eco: 1 }
  }
];

// ========== SIMPLE ROOM CODE SYSTEM ==========

const gameRooms = new Map(); // roomCode (4 digit) -> gameState
const clients = new Map(); // ws -> { playerId, roomCode }

function getOrCreateRoom(roomCode) {
  // Oda yoksa oluştur
  if (!gameRooms.has(roomCode)) {
    const room = {
      code: roomCode,
      phase: 'lobby',
      players: [],
      tiles: [],
      vertices: [],
      edges: [],
      currentPlayerIndex: 0,
      turn: 1,
      citizenshipIndex: 5,
      turnActions: [],
      winnerId: null,
      longestRoadPlayerId: null,
      longestRoadLength: 0
    };
    
    gameRooms.set(roomCode, room);
    console.log(`✓ Room created: ${roomCode}`);
  }
  
  return gameRooms.get(roomCode);
}

// ========== HEX COORDINATE SYSTEM ==========

function axialToPixel(q, r, size) {
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, y };
}

function getHexNeighbors(q, r) {
  return [
    [q+1, r], [q+1, r-1], [q, r-1],
    [q-1, r], [q-1, r+1], [q, r+1]
  ];
}

// ========== MAP GENERATION ==========

function generateMap() {
  const tiles = [];
  
  const layout = [
    { r: -2, count: 3 },
    { r: -1, count: 4 },
    { r: 0, count: 5 },
    { r: 1, count: 4 },
    { r: 2, count: 3 }
  ];
  
  // 5-5-5-4 dağılım: 3 tane 5, 1 tane 4 (rastgele hangisi 4 olacak)
  const counts = [5, 5, 5, 4];
  
  // Rastgele sıralama (hangi kaynak 4 olacak)
  const shuffledTypes = [...TILE_TYPES].sort(() => Math.random() - 0.5);
  
  const resourcePool = [];
  shuffledTypes.forEach((type, idx) => {
    const count = counts[idx];
    for (let i = 0; i < count; i++) {
      resourcePool.push(type);
    }
  });
  
  // Dengeli dağılım algoritması (aynı tip yan yana gelmesin)
  let id = 0;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    tiles.length = 0; // Temizle
    id = 0;
    
    // Pool'u karıştır
    const shuffledPool = [...resourcePool].sort(() => Math.random() - 0.5);
    let poolIndex = 0;
    
    // Hex'leri yerleştir
    layout.forEach(row => {
      for (let q = 0; q < row.count; q++) {
        tiles.push({
          id: id++,
          q,
          r: row.r,
          type: shuffledPool[poolIndex++]
        });
      }
    });
    
    // Komşuluk kontrolü - aynı tipten maksimum 1 komşu olabilir
    let isValid = true;
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const neighbors = getHexNeighbors(tile.q, tile.r);
      
      let sameTypeCount = 0;
      neighbors.forEach(([nq, nr]) => {
        const neighbor = tiles.find(t => t.q === nq && t.r === nr);
        if (neighbor && neighbor.type === tile.type) {
          sameTypeCount++;
        }
      });
      
      // Eğer 1'den fazla aynı tip komşu varsa geçersiz (yani max 2 aynı tip yan yana)
      if (sameTypeCount > 1) {
        isValid = false;
        break;
      }
    }
    
    // Vertex kontrolü - bir köşede maksimum 2 aynı tip toplanabilir
    if (isValid) {
      // Her vertex için komşu hex'lerin tiplerini kontrol et
      const vertexChecks = new Map();
      
      tiles.forEach(tile => {
        // Her hex'in 6 köşesi var
        for (let corner = 0; corner < 6; corner++) {
          const vertexKey = `${tile.q},${tile.r},${corner}`;
          
          if (!vertexChecks.has(vertexKey)) {
            vertexChecks.set(vertexKey, []);
          }
          vertexChecks.get(vertexKey).push(tile.type);
        }
      });
      
      // Her vertex'te aynı tip max 2 olabilir
      for (const [vertexKey, types] of vertexChecks.entries()) {
        const typeCounts = {};
        types.forEach(type => {
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        
        // Herhangi bir tip 2'den fazla mı?
        for (const count of Object.values(typeCounts)) {
          if (count > 2) {
            isValid = false;
            break;
          }
        }
        
        if (!isValid) break;
      }
    }
    
    if (isValid) {
      break; // Geçerli dağılım bulundu
    }
    
    attempts++;
  }
  
  const typeCounts = {};
  tiles.forEach(t => {
    typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
  });
  
  console.log('✓ Generated Catan map (3-4-5-4-3):', tiles.length, 'hexes');
  console.log('Resource distribution (5-5-5-4):', typeCounts);
  console.log(`Map generation attempts: ${attempts + 1}`);
  
  return tiles;
}

// ========== VERTEX & EDGE GENERATION ==========

function generateVerticesAndEdges(tiles) {
  const vertices = [];
  const edges = [];
  
  const hexToVertices = {
    0: [0, 1, 2, 3, 4, 5],
    1: [6, 7, 8, 9, 2, 1],
    2: [10, 11, 12, 13, 8, 7],
    3: [4, 3, 14, 15, 16, 17],
    4: [2, 9, 18, 19, 14, 3],
    5: [8, 13, 20, 21, 18, 9],
    6: [12, 22, 23, 24, 20, 13],
    7: [16, 15, 25, 26, 27, 28],
    8: [14, 19, 29, 30, 25, 15],
    9: [18, 21, 31, 32, 29, 19],
    10: [20, 24, 33, 34, 31, 21],
    11: [23, 35, 36, 37, 33, 24],
    12: [25, 30, 38, 39, 40, 26],
    13: [29, 32, 41, 42, 38, 30],
    14: [31, 34, 43, 44, 41, 32],
    15: [33, 37, 45, 46, 43, 34],
    16: [38, 42, 47, 48, 49, 39],
    17: [41, 44, 50, 51, 47, 42],
    18: [43, 46, 52, 53, 50, 44]
  };
  
  const vertexInfo = {};
  for (let v = 0; v < 54; v++) {
    vertexInfo[v] = { hexIds: [], firstHex: null, firstCorner: null };
  }
  
  for (let hexId = 0; hexId < 19; hexId++) {
    const vList = hexToVertices[hexId];
    
    vList.forEach((vId, idx) => {
      if (!vertexInfo[vId].hexIds.includes(hexId)) {
        vertexInfo[vId].hexIds.push(hexId);
      }
      
      if (vertexInfo[vId].firstHex === null) {
        vertexInfo[vId].firstHex = hexId;
        vertexInfo[vId].firstCorner = idx;
      }
    });
  }
  
  for (let vId = 0; vId < 54; vId++) {
    const info = vertexInfo[vId];
    const hex = tiles[info.firstHex];
    
    vertices.push({
      id: vId,
      q: hex.q,
      r: hex.r,
      dir: info.firstCorner,
      hexIds: info.hexIds,
      ownerId: null
    });
  }
  
  const edgeSet = new Set();
  let edgeId = 0;
  
  for (let hexId = 0; hexId < 19; hexId++) {
    const vList = hexToVertices[hexId];
    
    for (let i = 0; i < 6; i++) {
      const v1 = vList[i];
      const v2 = vList[(i + 1) % 6];
      
      const key = `${Math.min(v1, v2)}-${Math.max(v1, v2)}`;
      
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          id: edgeId++,
          v1: Math.min(v1, v2),
          v2: Math.max(v1, v2),
          ownerId: null
        });
      }
    }
  }
  
  console.log(`✓ Generated ${vertices.length} vertices and ${edges.length} edges`);
  
  return { vertices, edges };
}

function getVertexNeighbors(vertex) {
  const { q, r, dir } = vertex;
  const prev = (dir + 5) % 6;
  const next = (dir + 1) % 6;
  
  return [
    { q, r, dir: prev },
    { q, r, dir: next }
  ];
}

// ========== GAME LOGIC ==========

function canPlaceSettlement(room, playerId, vertexId) {
  const vertex = room.vertices.find(v => v.id === vertexId);
  if (!vertex || vertex.ownerId !== null) return false;
  
  if (room.phase === 'setup') return true;
  
  const neighbors = getVertexNeighbors(vertex);
  for (const neighbor of neighbors) {
    const nVertex = room.vertices.find(v => 
      v.q === neighbor.q && v.r === neighbor.r && v.dir === neighbor.dir
    );
    if (nVertex && nVertex.ownerId !== null) return false;
  }
  
  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;
  
  const playerSettlements = room.vertices.filter(v => v.ownerId === playerId);
  if (playerSettlements.length === 0) return true;
  
  const hasConnectedRoad = room.edges.some(e => 
    e.ownerId === playerId && (e.v1 === vertexId || e.v2 === vertexId)
  );
  
  return hasConnectedRoad;
}

function canPlaceRoad(room, playerId, edgeId) {
  const edge = room.edges.find(e => e.id === edgeId);
  if (!edge || edge.ownerId !== null) return false;
  
  if (room.phase === 'setup') return true;
  
  const v1Connected = room.vertices.find(v => v.id === edge.v1 && v.ownerId === playerId);
  const v2Connected = room.vertices.find(v => v.id === edge.v2 && v.ownerId === playerId);
  
  const roadV1 = room.edges.some(e => 
    e.ownerId === playerId && (e.v1 === edge.v1 || e.v2 === edge.v1) && e.id !== edgeId
  );
  const roadV2 = room.edges.some(e => 
    e.ownerId === playerId && (e.v1 === edge.v2 || e.v2 === edge.v2) && e.id !== edgeId
  );
  
  return v1Connected || v2Connected || roadV1 || roadV2;
}

function harvestFromSettlement(room, playerId, vertexId) {
  const vertex = room.vertices.find(v => v.id === vertexId);
  if (!vertex || vertex.ownerId !== playerId) {
    console.log('Harvest failed: vertex not found or not owned');
    return {};
  }
  
  const player = room.players.find(p => p.id === playerId);
  const resources = { civic: 0, eco: 0, capital: 0, tech: 0 };
  
  console.log(`Harvesting for player ${player.name}`);
  console.log(`Vertex hexIds:`, vertex.hexIds);
  
  if (!vertex.hexIds || vertex.hexIds.length === 0) {
    console.log('WARNING: vertex.hexIds is empty!');
    return resources;
  }
  
  // Şehir mi köy mü kontrol et
  const isCity = player.cityVertices.includes(vertexId);
  const multiplier = isCity ? 2 : 1;
  
  console.log(`Settlement type: ${isCity ? 'CITY (x2)' : 'Village (x1)'}`);
  
  // TÜM KAYNAKLARI ÜRETEBİLİR (fraksiyon kısıtı kaldırıldı)
  vertex.hexIds.forEach(hexId => {
    const tile = room.tiles.find(t => t.id === hexId);
    if (!tile) {
      console.log(`Hex ${hexId} not found`);
      return;
    }
    
    console.log(`Checking hex ${hexId}: type=${tile.type}`);
    
    const key = tile.type.toLowerCase();
    resources[key] += multiplier;
    console.log(`✓ Added ${multiplier} ${key} from hex ${hexId}`);
  });
  
  console.log(`Final harvest result:`, resources);
  return resources;
}

function calculateCitizenshipChange(room) {
  // KULLANILAN KAYNAKLARA GÖRE hesapla
  // turnActions'da resource harcamaları tutulacak
  
  let ecoUsed = 0; // civic + eco
  let capitalUsed = 0; // capital + tech
  
  room.turnActions.forEach(action => {
    if (action.resourcesUsed) {
      ecoUsed += (action.resourcesUsed.civic || 0) + (action.resourcesUsed.eco || 0);
      capitalUsed += (action.resourcesUsed.capital || 0) + (action.resourcesUsed.tech || 0);
    }
  });
  
  console.log(`Citizenship calc: eco=${ecoUsed}, capital=${capitalUsed}`);
  
  if (capitalUsed > ecoUsed) return -1; // Capital/Tech daha fazla → Index düşer
  if (ecoUsed > capitalUsed) return 1;  // Eco/Civic daha fazla → Index artar
  return 0;
}

// ========== LONGEST ROAD CALCULATION ==========

function calculateRoadLength(room, playerId, startVertexId, visited = new Set()) {
  visited.add(startVertexId);
  
  // Bu vertex'ten çıkan oyuncunun yollarını bul
  const connectedEdges = room.edges.filter(e => 
    e.ownerId === playerId && 
    (e.v1 === startVertexId || e.v2 === startVertexId)
  );
  
  let maxLength = 0;
  
  for (const edge of connectedEdges) {
    const nextVertexId = edge.v1 === startVertexId ? edge.v2 : edge.v1;
    
    // Eğer bu vertex'i ziyaret etmediyse devam et
    if (!visited.has(nextVertexId)) {
      const length = 1 + calculateRoadLength(room, playerId, nextVertexId, new Set(visited));
      maxLength = Math.max(maxLength, length);
    }
  }
  
  return maxLength;
}

function updateLongestRoad(room) {
  let newLongestPlayerId = null;
  let newLongestLength = 0;
  
  room.players.forEach(player => {
    // Bu oyuncunun tüm settlement'larından başlayarak en uzun yolu hesapla
    const playerVertices = room.vertices.filter(v => v.ownerId === player.id);
    
    let playerMaxRoad = 0;
    playerVertices.forEach(vertex => {
      const roadLength = calculateRoadLength(room, player.id, vertex.id);
      playerMaxRoad = Math.max(playerMaxRoad, roadLength);
    });
    
    // Eğer hiç settlement yoksa, tüm edge'lerden başla
    if (playerVertices.length === 0) {
      const playerEdges = room.edges.filter(e => e.ownerId === player.id);
      playerEdges.forEach(edge => {
        const len1 = calculateRoadLength(room, player.id, edge.v1);
        const len2 = calculateRoadLength(room, player.id, edge.v2);
        playerMaxRoad = Math.max(playerMaxRoad, len1, len2);
      });
    }
    
    if (playerMaxRoad > newLongestLength) {
      newLongestLength = playerMaxRoad;
      newLongestPlayerId = player.id;
    }
  });
  
  // Minimum 4 yol olmalı longest road için
  if (newLongestLength >= 4 && newLongestPlayerId !== room.longestRoadPlayerId) {
    const oldHolder = room.longestRoadPlayerId;
    room.longestRoadPlayerId = newLongestPlayerId;
    room.longestRoadLength = newLongestLength;
    
    const newHolder = room.players.find(p => p.id === newLongestPlayerId);
    sendLog(`🛣️ ${newHolder.name} en uzun yolu aldı! (+2 puan, ${newLongestLength} yol)`, room.code);
    
    if (oldHolder !== null) {
      const oldPlayer = room.players.find(p => p.id === oldHolder);
      sendLog(`${oldPlayer.name} en uzun yol bonusunu kaybetti (-2 puan)`, room.code);
    }
  }
}

// ========== SETTLEMENT DISTANCE CHECK ==========

function getDistanceBetweenVertices(room, v1Id, v2Id) {
  // BFS ile iki vertex arası minimum edge sayısını bul
  const queue = [{ vertexId: v1Id, distance: 0 }];
  const visited = new Set([v1Id]);
  
  while (queue.length > 0) {
    const { vertexId, distance } = queue.shift();
    
    if (vertexId === v2Id) {
      return distance;
    }
    
    // Bu vertex'e bağlı tüm edge'leri bul
    const connectedEdges = room.edges.filter(e => 
      e.v1 === vertexId || e.v2 === vertexId
    );
    
    for (const edge of connectedEdges) {
      const nextVertexId = edge.v1 === vertexId ? edge.v2 : edge.v1;
      
      if (!visited.has(nextVertexId)) {
        visited.add(nextVertexId);
        queue.push({ vertexId: nextVertexId, distance: distance + 1 });
      }
    }
  }
  
  return Infinity; // Ulaşılamaz
}

// ========== WEBSOCKET ==========

wss.on('connection', (ws) => {
  console.log('✓ Client connected');
  
  ws.send(JSON.stringify({
    type: 'hello',
    factions: FACTIONS
  }));
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      handleMessage(ws, msg);
    } catch (error) {
      console.error('Parse error:', error);
    }
  });
  
  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      clients.delete(ws);
      console.log('✗ Client disconnected (Player ID:', clientInfo.playerId, 'Room:', clientInfo.roomCode, ')');
    }
  });
});

function sanitizeState(room) {
  return {
    phase: room.phase,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      faction: p.faction,
      resources: p.resources,
      settlements: p.settlements,
      cities: p.cities || 0,
      cityVertices: p.cityVertices || [],
      setupSettlements: p.setupSettlements || 0,
      setupRoads: p.setupRoads || 0,
      points: p.settlements + (p.cities * 2) + (room.longestRoadPlayerId === p.id ? 2 : 0)
    })),
    tiles: room.tiles,
    vertices: room.vertices,
    edges: room.edges,
    currentPlayerIndex: room.currentPlayerIndex,
    turn: room.turn,
    citizenshipIndex: room.citizenshipIndex,
    winnerId: room.winnerId,
    longestRoadPlayerId: room.longestRoadPlayerId,
    longestRoadLength: room.longestRoadLength
  };
}

function broadcast(message, roomCode) {
  const payload = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clients.get(client);
      // Eğer roomCode belirtilmişse sadece o odadakilere gönder
      if (!roomCode || (clientInfo && clientInfo.roomCode === roomCode)) {
        client.send(payload);
      }
    }
  });
}

function sendLog(message, roomCode) {
  // roomCode varsa sadece o odaya gönder
  broadcast({ type: 'log', message }, roomCode);
}

// ========== MESSAGE HANDLERS ==========

function handleMessage(ws, msg) {
  const clientInfo = clients.get(ws);
  
  switch (msg.type) {
    case 'join':
      handleJoin(ws, msg);
      break;
    case 'startGame':
      if (!clientInfo) {
        ws.send(JSON.stringify({ type: 'error', message: 'Önce odaya katılın' }));
        return;
      }
      handleStartGame(ws, clientInfo);
      break;
    case 'placeSettlement':
      if (!clientInfo) return;
      handlePlaceSettlement(ws, clientInfo, msg.vertexId);
      break;
    case 'placeRoad':
      if (!clientInfo) return;
      handlePlaceRoad(ws, clientInfo, msg.edgeId);
      break;
    case 'endSetup':
      if (!clientInfo) return;
      handleEndSetup(ws, clientInfo);
      break;
    case 'expand':
      if (!clientInfo) return;
      handleExpand(ws, clientInfo, msg);
      break;
    case 'organize':
      if (!clientInfo) return;
      handleOrganize(ws, clientInfo, msg.vertexIds);
      break;
    case 'trade':
      if (!clientInfo) return;
      handleTrade(ws, clientInfo, msg);
      break;
    case 'endTurn':
      if (!clientInfo) return;
      handleEndTurn(ws, clientInfo);
      break;
    case 'offerTrade':
      if (!clientInfo) return;
      handleOfferTrade(ws, clientInfo, msg);
      break;
    case 'respondTrade':
      if (!clientInfo) return;
      handleRespondTrade(ws, clientInfo, msg);
      break;
    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

function handleJoin(ws, msg) {
  const { name, roomCode, reconnectPlayerId } = msg;
  
  if (!roomCode || roomCode.length !== 4) {
    ws.send(JSON.stringify({ type: 'error', message: 'Geçersiz oda kodu (4 haneli olmalı)' }));
    return;
  }
  
  const room = getOrCreateRoom(roomCode);
  
  // Reconnect denemesi
  if (reconnectPlayerId !== undefined && reconnectPlayerId !== null) {
    const existingPlayer = room.players.find(p => p.id === reconnectPlayerId);
    if (existingPlayer) {
      clients.set(ws, { playerId: reconnectPlayerId, roomCode });
      ws.send(JSON.stringify({ type: 'joined', playerId: reconnectPlayerId, roomCode }));
      ws.send(JSON.stringify({ type: 'state', state: sanitizeState(room) }));
      console.log(`✓ Player ${existingPlayer.name} reconnected to room ${roomCode}`);
      sendLog(`${existingPlayer.name} yeniden bağlandı`, roomCode);
      return;
    }
  }
  
  // Yeni oyuncu
  if (room.phase !== 'lobby') {
    ws.send(JSON.stringify({ type: 'error', message: 'Oyun zaten başlamış' }));
    return;
  }
  
  if (room.players.length >= 4) {
    ws.send(JSON.stringify({ type: 'error', message: 'Oda dolu (max 4 oyuncu)' }));
    return;
  }
  
  const player = {
    id: room.players.length,
    name: name || `Oyuncu ${room.players.length + 1}`,
    faction: null,
    resources: { civic: 0, eco: 0, capital: 0, tech: 0 },
    settlements: 0,
    cities: 0, // Şehir sayısı
    setupSettlements: 0,
    setupRoads: 0,
    usedSettlements: [], // Bu turda harvest edilen köyler
    cityVertices: [] // Şehir olan vertex ID'leri
  };
  
  room.players.push(player);
  clients.set(ws, { playerId: player.id, roomCode });
  
  ws.send(JSON.stringify({ type: 'joined', playerId: player.id, roomCode }));
  sendLog(`${player.name} odaya katıldı`, roomCode);
  broadcast({ type: 'state', state: sanitizeState(room) }, roomCode);
}

function handleStartGame(ws, clientInfo) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  
  if (room.phase !== 'lobby' || room.players.length < 2) {
    ws.send(JSON.stringify({ type: 'error', message: '2+ oyuncu gerekli' }));
    return;
  }
  
  const shuffledFactions = [...FACTIONS].sort(() => Math.random() - 0.5);
  room.players.forEach((player, idx) => {
    player.faction = shuffledFactions[idx];
    sendLog(`${player.name} → ${player.faction.icon} ${player.faction.name}`, room.code);
  });
  
  room.tiles = generateMap();
  const { vertices, edges } = generateVerticesAndEdges(room.tiles);
  room.vertices = vertices;
  room.edges = edges;
  room.phase = 'setup';
  room.currentPlayerIndex = 0;
  
  sendLog('🎮 Oyun başladı! Kurulum: 2 yerleşim + 2 yol yerleştirin', room.code);
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

function handlePlaceSettlement(ws, clientInfo, vertexId) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  
  if (room.phase !== 'setup' && room.phase !== 'main') {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in valid phase' }));
    return;
  }
  
  if (room.phase === 'setup' && playerId !== room.players[room.currentPlayerIndex].id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Sıra sizde değil - setup sırayla yapılır' }));
    return;
  }
  
  const player = room.players.find(p => p.id === playerId);
  
  if (room.phase === 'setup' && player.setupSettlements >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Already placed 2 settlements' }));
    return;
  }
  
  const vertex = room.vertices.find(v => v.id === vertexId);
  if (!vertex || vertex.ownerId !== null) {
    ws.send(JSON.stringify({ type: 'error', message: 'Vertex not available' }));
    return;
  }
  
  // Minimum 2 edge uzaklık kontrolü (Catan kuralı)
  const occupiedVertices = room.vertices.filter(v => v.ownerId !== null);
  for (const occupiedVertex of occupiedVertices) {
    const distance = getDistanceBetweenVertices(room, vertexId, occupiedVertex.id);
    if (distance < 2) {
      ws.send(JSON.stringify({ type: 'error', message: 'Diğer yerleşime çok yakın! (Min. 2 edge uzaklık gerekli)' }));
      return;
    }
  }
  
  vertex.ownerId = playerId;
  player.settlements++;
  
  if (room.phase === 'setup') {
    player.setupSettlements++;
  }
  
  sendLog(`${player.name} yerleşim kurdu`, room.code);
  
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

function handlePlaceRoad(ws, clientInfo, edgeId) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  
  if (room.phase !== 'setup') {
    ws.send(JSON.stringify({ type: 'error', message: 'Not in setup phase' }));
    return;
  }
  
  if (playerId !== room.players[room.currentPlayerIndex].id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Sıra sizde değil - setup sırayla yapılır' }));
    return;
  }
  
  const player = room.players.find(p => p.id === playerId);
  if (player.setupRoads >= 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Already placed 2 roads' }));
    return;
  }
  
  const edge = room.edges.find(e => e.id === edgeId);
  if (!edge || edge.ownerId !== null) {
    ws.send(JSON.stringify({ type: 'error', message: 'Edge not available' }));
    return;
  }
  
  edge.ownerId = playerId;
  player.setupRoads++;
  
  sendLog(`${player.name} placed a road`, room.code);
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

function handleEndSetup(ws, clientInfo) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  const player = room.players.find(p => p.id === playerId);
  
  if (player.setupSettlements < 2 || player.setupRoads < 2) {
    ws.send(JSON.stringify({ type: 'error', message: 'Must place 2 settlements + 2 roads' }));
    return;
  }
  
  sendLog(`${player.name} kurulumunu tamamladı`);
  
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  
  const allReady = room.players.every(p => p.setupSettlements === 2 && p.setupRoads === 2);
  
  if (allReady) {
    room.phase = 'main';
    room.currentPlayerIndex = 0;
    sendLog('✅ Tüm oyuncular kurulumunu tamamladı! Ana oyun başlıyor...', room.code);
  } else {
    const nextPlayer = room.players[room.currentPlayerIndex];
    sendLog(`Sıra ${nextPlayer.name}'de (kurulum)`, room.code);
  }
  
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

function handleExpand(ws, clientInfo, msg) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  
  if (room.phase !== 'main') return;
  if (playerId !== room.players[room.currentPlayerIndex].id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Sıranız değil!' }));
    return;
  }
  
  const player = room.players.find(p => p.id === playerId);
  
  if (msg.expandType === 'city') {
    // Şehir yükseltme
    const vertexId = msg.vertexId;
    
    const cityCost = { capital: 2, eco: 2, tech: 2, civic: 2 };
    let canAfford = true;
    Object.entries(cityCost).forEach(([resource, amount]) => {
      if (player.resources[resource] < amount) {
        canAfford = false;
      }
    });
    
    if (!canAfford) {
      ws.send(JSON.stringify({ type: 'error', message: 'Yeterli kaynağınız yok! (2 capital + 2 eco + 2 tech + 2 civic gerekli)' }));
      return;
    }
    
    const vertex = room.vertices.find(v => v.id === vertexId);
    
    if (!vertex || vertex.ownerId !== playerId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Bu sizin yerleşiminiz değil!' }));
      return;
    }
    
    if (player.cityVertices.includes(vertexId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Bu yerleşim zaten şehir!' }));
      return;
    }
    
    // Kaynakları harca
    Object.entries(cityCost).forEach(([resource, amount]) => {
      player.resources[resource] -= amount;
    });
    
    // Şehir listesine ekle
    player.cityVertices.push(vertexId);
    player.cities++;
    
    // Kaynak kullanımını kaydet (citizenship için)
    room.turnActions.push({
      type: 'city',
      playerId,
      resourcesUsed: cityCost
    });
    
    sendLog(`${player.name} yerleşimi şehre yükseltti! 🏙️`, room.code);
    
  } else if (msg.expandType === 'settlement') {
    const vertexId = msg.vertexId;
    
    const cost = player.faction.settlementCost;
    let canAfford = true;
    Object.entries(cost).forEach(([resource, amount]) => {
      if (player.resources[resource] < amount) {
        canAfford = false;
      }
    });
    
    if (!canAfford) {
      const costStr = Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' + ');
      ws.send(JSON.stringify({ type: 'error', message: `Yeterli kaynağınız yok! (${costStr} gerekli)` }));
      return;
    }
    
    const vertex = room.vertices.find(v => v.id === vertexId);
    
    if (!vertex || vertex.ownerId !== null) {
      ws.send(JSON.stringify({ type: 'error', message: 'Bu köşe zaten dolu!' }));
      return;
    }
    
    // Minimum 2 edge uzaklık kontrolü
    const occupiedVertices = room.vertices.filter(v => v.ownerId !== null);
    for (const occupiedVertex of occupiedVertices) {
      const distance = getDistanceBetweenVertices(room, vertexId, occupiedVertex.id);
      if (distance < 2) {
        ws.send(JSON.stringify({ type: 'error', message: 'Diğer yerleşime çok yakın! (Min. 2 edge uzaklık)' }));
        return;
      }
    }
    
    // Yol bağlantısı kontrolü
    const hasConnectedRoad = room.edges.some(e => 
      e.ownerId === playerId && (e.v1 === vertexId || e.v2 === vertexId)
    );
    
    if (!hasConnectedRoad) {
      ws.send(JSON.stringify({ type: 'error', message: 'Yol ağı ile bağlı değil!' }));
      return;
    }
    
    Object.entries(cost).forEach(([resource, amount]) => {
      player.resources[resource] -= amount;
    });
    
    vertex.ownerId = playerId;
    player.settlements++;
    
    // Kaynak kullanımını kaydet (citizenship için)
    room.turnActions.push({
      type: 'settlement',
      playerId,
      resourcesUsed: cost
    });
    
    sendLog(`${player.name} yeni yerleşim kurdu!`, room.code);
    
  } else if (msg.expandType === 'road') {
    const edgeId = msg.edgeId;
    
    const cost = player.faction.roadCost;
    let canAfford = true;
    Object.entries(cost).forEach(([resource, amount]) => {
      if (player.resources[resource] < amount) {
        canAfford = false;
      }
    });
    
    if (!canAfford) {
      const costStr = Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(' + ');
      ws.send(JSON.stringify({ type: 'error', message: `Yeterli kaynağınız yok! (${costStr} gerekli)` }));
      return;
    }
    
    if (!canPlaceRoad(room, playerId, edgeId)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Buraya yol kuramazsınız! (Mevcut yol ağınıza bağlı olmalı)' }));
      return;
    }
    
    Object.entries(cost).forEach(([resource, amount]) => {
      player.resources[resource] -= amount;
    });
    
    const edge = room.edges.find(e => e.id === edgeId);
    edge.ownerId = playerId;
    
    // Kaynak kullanımını kaydet (citizenship için)
    room.turnActions.push({
      type: 'road',
      playerId,
      resourcesUsed: cost
    });
    
    sendLog(`${player.name} yeni yol kurdu!`, room.code);
    
    // Longest road kontrolü
    updateLongestRoad(room);
  }
  
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

function handleOrganize(ws, clientInfo, vertexIds) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  
  console.log('=== ORGANIZE REQUEST ===');
  console.log('Player ID:', playerId);
  console.log('Vertex IDs:', vertexIds);
  
  if (room.phase !== 'main') {
    console.log('Not in main phase');
    return;
  }
  
  if (playerId !== room.players[room.currentPlayerIndex].id) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
    return;
  }
  
  const player = room.players.find(p => p.id === playerId);
  
  // YENİ SİSTEM: Sadece 1 yerleşimden harvest yapılabilir
  const maxSlots = 1;
  
  // DÖNGÜ KONTROLÜ: Bu turda kullanılan köyler tekrar kullanılamaz
  const alreadyUsed = vertexIds.filter(vId => player.usedSettlements.includes(vId));
  if (alreadyUsed.length > 0) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: `Bu köylerden bu turda zaten harvest yaptınız: ${alreadyUsed.join(', ')}` 
    }));
    return;
  }
  
  console.log('Player:', player.name);
  console.log('Settlements:', player.settlements);
  console.log('Max slots (fixed):', maxSlots);
  
  if (vertexIds.length > maxSlots) {
    ws.send(JSON.stringify({ type: 'error', message: `En fazla ${maxSlots} yerleşimden harvest yapabilirsiniz` }));
    return;
  }
  
  let totalResources = { civic: 0, eco: 0, capital: 0, tech: 0 };
  
  console.log('Starting harvest from', vertexIds.length, 'settlements...');
  
  vertexIds.forEach(vId => {
    console.log(`\n--- Harvesting from vertex ${vId} ---`);
    const vertex = room.vertices.find(v => v.id === vId);
    if (vertex) {
      console.log(`Vertex position: q=${vertex.q}, r=${vertex.r}, dir=${vertex.dir}`);
      console.log(`Adjacent hex IDs:`, vertex.hexIds);
      
      vertex.hexIds.forEach(hexId => {
        const tile = room.tiles.find(t => t.id === hexId);
        if (tile) {
          console.log(`  → Hex ${hexId}: type=${tile.type}, q=${tile.q}, r=${tile.r}`);
        }
      });
    }
    
    const resources = harvestFromSettlement(room, playerId, vId);
    
    Object.entries(resources).forEach(([key, amount]) => {
      totalResources[key] += amount;
      player.resources[key] += amount;
    });
  });
  
  console.log('=== TOTAL HARVEST ===');
  console.log('Resources gained:', totalResources);
  console.log('Player resources after:', player.resources);
  
  const resourceStr = Object.entries(totalResources)
    .filter(([k, v]) => v > 0)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  
  if (resourceStr) {
    sendLog(`${player.name} örgütlendi: ${resourceStr} kazandı`, room.code);
  } else {
    sendLog(`${player.name} örgütlendi`, room.code);
  }
  
  // Kullanılan köyleri işaretle
  vertexIds.forEach(vId => {
    if (!player.usedSettlements.includes(vId)) {
      player.usedSettlements.push(vId);
    }
  });
  
  // Tüm köyler kullanıldıysa döngüyü sıfırla
  const mySettlements = room.vertices.filter(v => v.ownerId === playerId);
  if (player.usedSettlements.length >= mySettlements.length) {
    console.log(`${player.name}: Tüm köyler kullanıldı, döngü sıfırlanıyor`);
    player.usedSettlements = [];
  }
  
  handleEndTurn(ws, clientInfo);
}

function handleTrade(ws, clientInfo, msg) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  const player = room.players.find(p => p.id === playerId);
  const { give, receive } = msg;
  
  if (player.resources[give] < 4) {
    ws.send(JSON.stringify({ type: 'error', message: 'Need 4 resources to trade' }));
    return;
  }
  
  player.resources[give] -= 4;
  player.resources[receive] += 1;
  
  sendLog(`${player.name} traded 4 ${give} for 1 ${receive}`, room.code);
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

// ========== PLAYER TRADE ==========

let tradeOfferCounter = 0;
const pendingTrades = new Map(); // offerId -> trade data

function handleOfferTrade(ws, clientInfo, msg) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const playerId = clientInfo.playerId;
  const player = room.players.find(p => p.id === playerId);
  const { targetPlayerId, give, receive } = msg;
  
  // Teklif eden oyuncu kaynağa sahip mi?
  if (player.resources[give] < 1) {
    ws.send(JSON.stringify({ type: 'error', message: 'Bu kaynağınız yok!' }));
    return;
  }
  
  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  if (!targetPlayer) {
    ws.send(JSON.stringify({ type: 'error', message: 'Oyuncu bulunamadı' }));
    return;
  }
  
  // Target oyuncu kaynağa sahip mi?
  if (targetPlayer.resources[receive] < 1) {
    ws.send(JSON.stringify({ type: 'error', message: `${targetPlayer.name} bu kaynağa sahip değil!` }));
    return;
  }
  
  // Teklif oluştur
  const offerId = `trade_${tradeOfferCounter++}`;
  pendingTrades.set(offerId, {
    fromPlayerId: playerId,
    toPlayerId: targetPlayerId,
    give,
    receive,
    roomCode: room.code
  });
  
  // Target oyuncuya teklifi gönder
  wss.clients.forEach(client => {
    const info = clients.get(client);
    if (info && info.playerId === targetPlayerId && info.roomCode === room.code) {
      client.send(JSON.stringify({
        type: 'tradeOffer',
        offerId,
        fromPlayerId: playerId,
        give: receive, // Target'ın vereceği
        receive: give  // Target'ın alacağı
      }));
    }
  });
  
  sendLog(`${player.name} → ${targetPlayer.name}: Takas teklifi`, room.code);
}

function handleRespondTrade(ws, clientInfo, msg) {
  const { offerId, accept } = msg;
  const trade = pendingTrades.get(offerId);
  
  if (!trade) {
    ws.send(JSON.stringify({ type: 'error', message: 'Geçersiz takas teklifi' }));
    return;
  }
  
  const room = getOrCreateRoom(trade.roomCode);
  const offerer = room.players.find(p => p.id === trade.fromPlayerId);
  const target = room.players.find(p => p.id === trade.toPlayerId);
  
  if (!offerer || !target) {
    pendingTrades.delete(offerId);
    return;
  }
  
  if (accept) {
    // Kaynakları kontrol et
    if (offerer.resources[trade.give] < 1 || target.resources[trade.receive] < 1) {
      broadcast({
        type: 'tradeResult',
        accepted: false,
        message: 'Takas başarısız - kaynaklar yetersiz'
      }, room.code);
      pendingTrades.delete(offerId);
      return;
    }
    
    // Takası gerçekleştir
    offerer.resources[trade.give] -= 1;
    offerer.resources[trade.receive] += 1;
    target.resources[trade.receive] -= 1;
    target.resources[trade.give] += 1;
    
    sendLog(`✓ ${offerer.name} ↔ ${target.name}: Takas tamamlandı!`, room.code);
    broadcast({
      type: 'tradeResult',
      accepted: true,
      message: `${offerer.name} ↔ ${target.name}: Takas başarılı!`
    }, room.code);
    broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
  } else {
    sendLog(`✗ ${target.name} takas teklifini reddetti`, room.code);
    broadcast({
      type: 'tradeResult',
      accepted: false,
      message: `${target.name} takas teklifini reddetti`
    }, room.code);
  }
  
  pendingTrades.delete(offerId);
}

function handleEndTurn(ws, clientInfo) {
  const room = getOrCreateRoom(clientInfo.roomCode);
  const change = calculateCitizenshipChange(room);
  room.citizenshipIndex = Math.max(0, Math.min(10, room.citizenshipIndex + change));
  
  if (room.citizenshipIndex === 0) {
    sendLog('💥 Citizenship collapsed! Everyone loses!', room.code);
    broadcast({ type: 'citizenship_collapse' }, room.code);
    return;
  }
  
  // KAZANMA KONTROLÜ: 10 puan olan var mı?
  const currentPlayer = room.players[room.currentPlayerIndex];
  const currentPoints = currentPlayer.settlements + (currentPlayer.cities * 2) + (room.longestRoadPlayerId === currentPlayer.id ? 2 : 0);
  
  if (currentPoints >= 10) {
    room.winnerId = currentPlayer.id;
    sendLog(`🎉 ${currentPlayer.name} 10 puana ulaştı ve oyunu kazandı!`, room.code);
    broadcast({ 
      type: 'gameWon', 
      winnerId: currentPlayer.id,
      winnerName: currentPlayer.name
    }, room.code);
    broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
    return;
  }
  
  room.turnActions = [];
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  if (room.currentPlayerIndex === 0) room.turn++;
  
  const nextPlayer = room.players[room.currentPlayerIndex];
  sendLog(`Turn ${room.turn}: ${nextPlayer.name}'s turn`, room.code);
  broadcast({ type: 'state', state: sanitizeState(room) }, room.code);
}

// ========== SERVER START ==========

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('🏛️  Bookchin: Kent Ekolojisi');
  console.log(`🌐 Server running: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════');
});
