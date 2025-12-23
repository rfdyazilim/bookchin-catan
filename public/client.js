// ========== CLIENT-SIDE JAVASCRIPT ==========

const HEX_SIZE = 82.5; // x1.5 (55 × 1.5 = 82.5)
const HEX_WIDTH = HEX_SIZE * 2;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

// Harita merkezi ve boyutları
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 1000;
const MAP_CENTER = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };

// Tile görselleri
const TILE_IMAGES = {
  CIVIC: 'img/civic.png',
  ECO: 'img/eco.png',
  CAPITAL: 'img/capital.png',
  TECH: 'img/tech.png'
};

let ws = null;
let myPlayerId = null;
let myRoomCode = null;
let gameState = null;
let factions = [];
let selectedMode = null; // 'settlement', 'road', 'organize', 'expand-settlement', 'expand-road'
let selectedVertices = []; // For organize mode
let lastClickedVertex = null; // Son tıklanan vertex
let lastClickedEdge = null; // Son tıklanan edge
let pendingExpandRoadId = null; // Build fazında seçilen road
let pendingExpandSettlementId = null; // Build fazında seçilen settlement

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game');
const roomCodeInput = document.getElementById('roomCode');
const playerNameInput = document.getElementById('playerName');
const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const lobbyPlayersDiv = document.getElementById('lobbyPlayers');
const hexMap = document.getElementById('hexMap');
const playersPanel = document.getElementById('playersPanel');
const selfInfo = document.getElementById('selfInfo');
const phaseInfo = document.getElementById('phaseInfo');
const turnInfo = document.getElementById('turnInfo');
const activeInfo = document.getElementById('activeInfo');
const citizenshipValue = document.getElementById('citizenshipValue');
const citizenshipFill = document.getElementById('citizenshipFill');
const logPanel = document.getElementById('logPanel');
const phaseTitle = document.getElementById('phaseTitle');

// Action buttons
const confirmPlacementBtn = document.getElementById('confirmPlacementBtn');
const endSetupBtn = document.getElementById('endSetupBtn');
const expandBtn = document.getElementById('expandBtn');
const organizeBtn = document.getElementById('organizeBtn');
const tradeBtn = document.getElementById('tradeBtn');
const playerTradeBtn = document.getElementById('playerTradeBtn');
const endTurnBtn = document.getElementById('endTurnBtn');
const actionHint = document.getElementById('actionHint');

// Resource displays
const civicSpan = document.getElementById('civic');
const ecoSpan = document.getElementById('eco');
const capitalSpan = document.getElementById('capital');
const techSpan = document.getElementById('tech');

// Cost displays
const settlementCostSpan = document.getElementById('settlementCost');
const roadCostSpan = document.getElementById('roadCost');

// Trade modal (4:1 Bank)
const tradeModal = document.getElementById('tradeModal');
const tradeStep1 = document.getElementById('tradeStep1');
const tradeStep2 = document.getElementById('tradeStep2');
const tradeGiveOptions = document.getElementById('tradeGiveOptions');
const tradeReceiveOptions = document.getElementById('tradeReceiveOptions');
const tradeCancelBtn = document.getElementById('tradeCancelBtn');

let tradeGiveResource = null;

// Player Trade modal
const playerTradeModal = document.getElementById('playerTradeModal');
const playerTradeStep1 = document.getElementById('playerTradeStep1');
const playerTradeStep2 = document.getElementById('playerTradeStep2');
const playerTradeStep3 = document.getElementById('playerTradeStep3');
const playerSelectOptions = document.getElementById('playerSelectOptions');
const playerTradeGiveOptions = document.getElementById('playerTradeGiveOptions');
const playerTradeReceiveOptions = document.getElementById('playerTradeReceiveOptions');
const playerTradeCancelBtn = document.getElementById('playerTradeCancelBtn');

let selectedTradePlayer = null;
let playerTradeGive = null;
let playerTradeReceive = null;

// Trade Offer modal
const tradeOfferModal = document.getElementById('tradeOfferModal');
const tradeOfferContent = document.getElementById('tradeOfferContent');
const acceptTradeBtn = document.getElementById('acceptTradeBtn');
const rejectTradeBtn = document.getElementById('rejectTradeBtn');

let currentTradeOffer = null;

// ========== HEX MATH ==========

function axialToPixel(q, r) {
  // Pointy-top hexagon - DOĞRU Catan koordinat sistemi
  const hexWidth = Math.sqrt(3) * HEX_SIZE;  // Yatay mesafe
  const hexHeight = 1.5 * HEX_SIZE;           // Dikey mesafe
  
  // Her satırı merkeze hizala (3-4-5-4-3 için)
  const rowWidths = {
    '-2': 3, '-1': 4, '0': 5, '1': 4, '2': 3
  };
  const rowWidth = rowWidths[r.toString()] || 5;
  const centerOffset = -(rowWidth - 1) * hexWidth / 2;
  
  const x = q * hexWidth + centerOffset;
  const y = r * hexHeight;
  
  return {
    x: MAP_CENTER.x + x,
    y: MAP_CENTER.y + y
  };
}

function hexCorners(centerX, centerY) {
  // Pointy-top hex - 6 köşe (sivri üstte)
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - (Math.PI / 6); // -30° başlangıç (üst köşe)
    corners.push({
      x: centerX + HEX_SIZE * Math.cos(angle),
      y: centerY + HEX_SIZE * Math.sin(angle)
    });
  }
  return corners;
}

function hexToPolygon(corners) {
  return corners.map(c => `${c.x},${c.y}`).join(' ');
}

// ========== WEBSOCKET ==========

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('✓ Connected');
    addLog('Sunucuya bağlandı');
  };
  
  ws.onclose = () => {
    console.log('✗ Disconnected');
    addLog('Bağlantı kesildi');
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerMessage(msg);
    } catch (error) {
      console.error('Parse error:', error);
    }
  };
}

function send(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// ========== MESSAGE HANDLERS ==========

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'hello':
      factions = msg.factions;
      
      // Eğer daha önce kaydedilmiş roomCode ve playerId varsa reconnect dene
      const savedRoomCode = localStorage.getItem('bookchin_roomCode');
      const savedPlayerId = localStorage.getItem('bookchin_playerId');
      
      if (savedRoomCode && savedPlayerId) {
        console.log('Attempting reconnect:', savedRoomCode, savedPlayerId);
        send({ 
          type: 'join', 
          roomCode: savedRoomCode,
          reconnectPlayerId: parseInt(savedPlayerId),
          name: 'Reconnecting...'
        });
      }
      break;
      
    case 'joined':
      myPlayerId = msg.playerId;
      myRoomCode = msg.roomCode;
      localStorage.setItem('bookchin_playerId', myPlayerId);
      localStorage.setItem('bookchin_roomCode', myRoomCode);
      console.log('Joined room:', myRoomCode, 'Player ID:', myPlayerId);
      break;
      
    case 'state':
      gameState = msg.state;
      // State güncellendiğinde pending selection'ları temizle
      if (gameState.phase === 'setup') {
        const me = gameState.players.find(p => p.id === myPlayerId);
        if (me) {
          // Yerleşim veya yol başarıyla eklendiyse seçimi temizle
          if (selectedMode === 'settlement' && lastClickedVertex !== null) {
            lastClickedVertex = null;
          }
          if (selectedMode === 'road' && lastClickedEdge !== null) {
            lastClickedEdge = null;
          }
        }
      }
      updateUI();
      console.log('State updated, phase:', gameState.phase);
      break;
      
    case 'log':
      addLog(msg.message);
      break;
      
    case 'error':
      addLog(`❌ ${msg.message}`);
      alert(msg.message);
      break;
      
    case 'winner':
      const winner = gameState.players.find(p => p.id === msg.playerId);
      addLog(`🎉 ${winner.name} kazandı!`);
      alert(`${winner.name} oyunu kazandı!`);
      break;
      
    case 'citizenship_collapse':
      addLog('💥 Yurttaşlık çöktü! Herkes kaybetti!');
      alert('Yurttaşlık İndeksi 0\'a düştü!');
      break;
      
    case 'gameWon':
      addLog(`🎉 ${msg.winnerName} kazandı!`);
      showWinnerScreen(msg.winnerName);
      break;
      
    case 'tradeOffer':
      showTradeOffer(msg);
      break;
      
    case 'tradeResult':
      if (msg.accepted) {
        addLog(`✓ ${msg.message}`);
      } else {
        addLog(`✗ ${msg.message}`);
      }
      closeTradeOfferModal();
      break;
  }
}

// ========== UI UPDATE ==========

function updateUI() {
  if (!gameState) return;
  
  if (gameState.phase === 'lobby') {
    lobbyScreen.style.display = 'block';
    gameScreen.style.display = 'none';
    renderLobby();
  } else {
    lobbyScreen.style.display = 'none';
    gameScreen.style.display = 'block';
    renderGame();
  }
}

function renderLobby() {
  lobbyPlayersDiv.innerHTML = '';
  
  if (gameState.players.length === 0) {
    lobbyPlayersDiv.innerHTML = '<p style="color: #bcaaa4; text-align: center;">Henüz oyuncu yok...</p>';
  } else {
    gameState.players.forEach(player => {
      const div = document.createElement('div');
      div.className = 'lobby-player';
      const factionText = player.faction ? ` - ${player.faction.icon} ${player.faction.name}` : '';
      div.innerHTML = `
        <span class="lobby-player-icon">${player.faction ? player.faction.icon : '👤'}</span>
        <span><strong>${player.name}</strong>${factionText}</span>
      `;
      lobbyPlayersDiv.appendChild(div);
    });
  }
  
  startBtn.disabled = gameState.players.length < 2;
}

function renderGame() {
  renderActions(); // ÖNCELİKLE mod'u ayarla
  renderMap();
  renderPlayers();
  renderStatus();
  renderResources();
  renderCosts();
}

// ========== MAP RENDERING ==========

function renderMap() {
  hexMap.innerHTML = '';
  
  console.log('=== RENDER MAP ===');
  console.log('Phase:', gameState.phase);
  console.log('Tiles:', gameState.tiles.length);
  console.log('Vertices:', gameState.vertices.length);
  console.log('Edges:', gameState.edges.length);
  console.log('Selected Mode:', selectedMode);
  console.log('My Player ID:', myPlayerId);
  
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (me) {
    console.log('My Setup Progress:', (me.setupSettlements || 0), '/', (me.setupRoads || 0));
    console.log('My Faction:', me.faction ? me.faction.name : 'null');
  }
  
  // BÜYÜK ALTIGEN ÇERÇEVE (Catan tarzı dış çerçeve)
  const frameCorners = hexCorners(MAP_CENTER.x, MAP_CENTER.y);
  const frameScale = 4.8; // Çerçeve büyüklüğü
  const framePoints = frameCorners.map(c => {
    const dx = c.x - MAP_CENTER.x;
    const dy = c.y - MAP_CENTER.y;
    return {
      x: MAP_CENTER.x + dx * frameScale,
      y: MAP_CENTER.y + dy * frameScale
    };
  });
  
  const framePoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  framePoly.setAttribute('points', hexToPolygon(framePoints));
  framePoly.setAttribute('fill', 'none');
  framePoly.setAttribute('stroke', '#8d6e63');
  framePoly.setAttribute('stroke-width', '8');
  framePoly.setAttribute('opacity', '0.7');
  hexMap.appendChild(framePoly);
  
  // Render tiles
  gameState.tiles.forEach(tile => {
    const pos = axialToPixel(tile.q, tile.r);
    const corners = hexCorners(pos.x, pos.y);
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', hexToPolygon(corners));
    polygon.setAttribute('class', `hex hex-${tile.type.toLowerCase()}`);
    hexMap.appendChild(polygon);
    
    // Tile görseli (SVG image) - tam hex boyutunda
    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', TILE_IMAGES[tile.type]);
    // Görseli hex'in tam merkezine yerleştir
    const imageSize = HEX_SIZE * 2; // Hex çapı kadar
    image.setAttribute('x', pos.x - imageSize / 2);
    image.setAttribute('y', pos.y - imageSize / 2);
    image.setAttribute('width', imageSize);
    image.setAttribute('height', imageSize);
    image.style.pointerEvents = 'none';
    hexMap.appendChild(image);
    
    // HEX ID NUMARASI (DEBUG için)
    const idText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    idText.setAttribute('x', pos.x);
    idText.setAttribute('y', pos.y - 30);
    idText.setAttribute('text-anchor', 'middle');
    idText.setAttribute('font-size', '20');
    idText.setAttribute('font-weight', 'bold');
    idText.setAttribute('fill', '#ffeb3b');
    idText.setAttribute('stroke', '#000');
    idText.setAttribute('stroke-width', '1');
    idText.style.pointerEvents = 'none';
    idText.textContent = tile.id;
    hexMap.appendChild(idText);
  });
  
  // Render edges (roads)
  gameState.edges.forEach(edge => {
    const v1 = gameState.vertices.find(v => v.id === edge.v1);
    const v2 = gameState.vertices.find(v => v.id === edge.v2);
    
    if (!v1 || !v2) return; // Skip invalid edges
    
    const pos1 = getVertexPixelPosition(v1);
    const pos2 = getVertexPixelPosition(v2);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pos1.x);
    line.setAttribute('y1', pos1.y);
    line.setAttribute('x2', pos2.x);
    line.setAttribute('y2', pos2.y);
    
    let className = 'edge';
    if (edge.ownerId !== null) {
      const owner = gameState.players.find(p => p.id === edge.ownerId);
      className += ` owned road-${owner.faction.id}`;
    }
    line.setAttribute('class', className);
    
    // Setup fazında yol yerleştirme
    if (selectedMode === 'road' && edge.ownerId === null) {
      line.style.cursor = 'pointer';
      
      // Eğer bu edge son tıklanan ise farklı göster
      if (lastClickedEdge === edge.id) {
        line.style.stroke = '#ffeb3b'; // Sarı - seçili
        line.style.strokeWidth = '8';
      } else {
        line.style.stroke = '#ff9800'; // Turuncu - tıklanabilir
        line.style.strokeWidth = '6';
      }
      
      line.onclick = () => {
        console.log('Edge clicked:', edge.id);
        
        if (lastClickedEdge === edge.id) {
          // Aynı edge'e tekrar tıklandı - iptal
          lastClickedEdge = null;
          console.log('Road selection cancelled');
        } else {
          // Yeni edge seçildi
          lastClickedEdge = edge.id;
          console.log('Road selected, click again to confirm or click another to change');
          console.log('lastClickedEdge is now:', lastClickedEdge);
        }
        
        renderActions(); // BURADA ÇAĞIR!
        renderMap(); // Yeniden render et
      };
    }
    
    // Main game - Expand road (onay butonlu sistem)
    if (selectedMode === 'expand-road' && edge.ownerId === null) {
      line.style.cursor = 'pointer';
      
      // Eğer bu edge seçili ise farklı göster
      if (pendingExpandRoadId === edge.id) {
        line.style.stroke = '#ffeb3b'; // Sarı - seçili
        line.style.strokeWidth = '8';
      } else {
        line.style.stroke = '#ff9800'; // Turuncu - tıklanabilir
        line.style.strokeWidth = '6';
      }
      
      line.onclick = () => {
        console.log('Expand road selected:', edge.id);
        
        if (pendingExpandRoadId === edge.id) {
          // İptal
          pendingExpandRoadId = null;
          console.log('Road selection cancelled');
        } else {
          // Yeni seçim
          pendingExpandRoadId = edge.id;
          console.log('Road selected, waiting for confirmation');
        }
        
        renderActions();
        renderMap();
      };
    }
    
    hexMap.appendChild(line);
  });
  
  // Render vertices (settlements - yerleşimler)
  gameState.vertices.forEach(vertex => {
    const pos = getVertexPixelPosition(vertex);
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r', 10); // x1.5 (8 × 1.5 = 12, biraz küçült → 10)
    
    let className = 'vertex';
    if (vertex.ownerId !== null) {
      const owner = gameState.players.find(p => p.id === vertex.ownerId);
      className += ` owned settlement-${owner.faction.id}`;
      circle.setAttribute('r', 18); // x1.5 (15 × 1.2 = 18)
      
      // Fraksiyon ikonu ekle (text olarak)
      const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      iconText.setAttribute('x', pos.x);
      iconText.setAttribute('y', pos.y + 7);
      iconText.setAttribute('text-anchor', 'middle');
      iconText.setAttribute('font-size', '24'); // x1.5 (20 × 1.2 = 24)
      iconText.style.pointerEvents = 'none';
      iconText.textContent = owner.faction.icon;
      hexMap.appendChild(iconText);
    }
    circle.setAttribute('class', className);
    
    // Setup fazında yerleşim yerleştirme
    if (selectedMode === 'settlement' && vertex.ownerId === null) {
      circle.style.cursor = 'pointer';
      
      // Eğer bu vertex son tıklanan ise farklı göster
      if (lastClickedVertex === vertex.id) {
        circle.style.fill = '#ffeb3b'; // Sarı - seçili
        circle.setAttribute('r', 14);
      } else {
        circle.style.fill = '#9e9e9e'; // Gri - tıklanabilir
        circle.setAttribute('r', 12);
      }
      
      circle.onclick = () => {
        console.log('Vertex clicked:', vertex.id);
        
        if (lastClickedVertex === vertex.id) {
          // Aynı vertex'e tekrar tıklandı - iptal
          lastClickedVertex = null;
          console.log('Settlement selection cancelled');
        } else {
          // Yeni vertex seçildi
          lastClickedVertex = vertex.id;
          console.log('Settlement selected, click again to confirm or click another to change');
          console.log('lastClickedVertex is now:', lastClickedVertex);
        }
        
        renderActions(); // BURADA ÇAĞIR!
        renderMap(); // Yeniden render et
      };
    }
    
    // Main game - Expand settlement (onay butonlu sistem)
    if (selectedMode === 'expand-settlement' && vertex.ownerId === null) {
      circle.style.cursor = 'pointer';
      
      // Eğer bu vertex seçili ise farklı göster
      if (pendingExpandSettlementId === vertex.id) {
        circle.style.fill = '#ffeb3b'; // Sarı - seçili
        circle.setAttribute('r', 14);
      } else {
        circle.style.fill = '#9e9e9e'; // Gri - tıklanabilir
        circle.setAttribute('r', 12);
      }
      
      circle.onclick = () => {
        console.log('Expand settlement selected:', vertex.id);
        
        if (pendingExpandSettlementId === vertex.id) {
          // İptal
          pendingExpandSettlementId = null;
          console.log('Settlement selection cancelled');
        } else {
          // Yeni seçim
          pendingExpandSettlementId = vertex.id;
          console.log('Settlement selected, waiting for confirmation');
        }
        
        renderActions();
        renderMap();
      };
    }
    
    hexMap.appendChild(circle);
    if (selectedMode === 'organize' && vertex.ownerId === myPlayerId) {
      circle.style.cursor = 'pointer';
      circle.onclick = () => toggleOrganizeVertex(vertex.id);
      
      if (selectedVertices.includes(vertex.id)) {
        circle.setAttribute('stroke', '#ffeb3b');
        circle.setAttribute('stroke-width', 6);
        circle.setAttribute('r', 18);
        
        // Seçim sırası göster
        const orderIdx = selectedVertices.indexOf(vertex.id) + 1;
        const orderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        orderText.setAttribute('x', pos.x);
        orderText.setAttribute('y', pos.y - 20);
        orderText.setAttribute('text-anchor', 'middle');
        orderText.setAttribute('font-size', '16');
        orderText.setAttribute('fill', '#ffeb3b');
        orderText.setAttribute('font-weight', 'bold');
        orderText.style.pointerEvents = 'none';
        orderText.textContent = orderIdx;
        hexMap.appendChild(orderText);
      }
    }
    
    hexMap.appendChild(circle);
    
    // VERTEX ID (DEBUG - sadece boş vertex'lerde göster)
    if (vertex.ownerId === null && selectedMode !== 'organize') {
      const vIdText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      vIdText.setAttribute('x', pos.x);
      vIdText.setAttribute('y', pos.y - 15);
      vIdText.setAttribute('text-anchor', 'middle');
      vIdText.setAttribute('font-size', '10');
      vIdText.setAttribute('fill', '#aaa');
      vIdText.style.pointerEvents = 'none';
      vIdText.textContent = `V${vertex.id}`;
      hexMap.appendChild(vIdText);
    }
  });
}

function getVertexPixelPosition(vertex) {
  const { q, r, dir } = vertex;
  const center = axialToPixel(q, r);
  
  // Pointy-top hex: dir=0 üstte (0°), saat yönünde
  // 0° = 12 saat yönü (yukarı)
  const angle = (Math.PI / 3) * dir - (Math.PI / 2); // -90° başlangıç (üst)
  
  return {
    x: center.x + HEX_SIZE * Math.cos(angle),
    y: center.y + HEX_SIZE * Math.sin(angle)
  };
}

function toggleOrganizeVertex(vertexId) {
  const player = gameState.players.find(p => p.id === myPlayerId);
  const maxSlots = Math.max(1, Math.floor(player.settlements / 2));
  
  const idx = selectedVertices.indexOf(vertexId);
  if (idx > -1) {
    // Zaten seçili, kaldır
    selectedVertices.splice(idx, 1);
  } else {
    // Yeni ekle
    selectedVertices.push(vertexId);
    
    // Limit aşıldıysa en eskiyi çıkar
    if (selectedVertices.length > maxSlots) {
      selectedVertices.shift(); // İlk elemanı çıkar
    }
  }
  
  actionHint.textContent = `${selectedVertices.length}/${maxSlots} yerleşim seçildi`;
  renderMap();
}

// ========== PLAYERS PANEL ==========

function renderPlayers() {
  playersPanel.innerHTML = '';
  
  const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id;
  
  gameState.players.forEach(player => {
    const div = document.createElement('div');
    div.className = 'player-item';
    
    if (player.id === activePlayerId) div.classList.add('active');
    if (player.id === myPlayerId) div.classList.add('me');
    
    const isMe = player.id === myPlayerId ? ' (BEN)' : '';
    
    div.innerHTML = `
      <div class="player-left">
        <span class="player-icon">${player.faction.icon}</span>
        <div>
          <strong>${player.name}${isMe}</strong>
          <div class="player-info">${player.settlements} puan</div>
        </div>
      </div>
    `;
    
    playersPanel.appendChild(div);
  });
}

// ========== STATUS ==========

function renderStatus() {
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (me) {
    selfInfo.textContent = `${me.name} (${me.faction.name})`;
  }
  
  const phaseNames = {
    lobby: 'Lobi',
    setup: 'Kurulum',
    main: 'Ana Oyun'
  };
  phaseInfo.textContent = phaseNames[gameState.phase] || gameState.phase;
  phaseTitle.textContent = phaseNames[gameState.phase] || gameState.phase;
  
  turnInfo.textContent = `Tur ${gameState.turn}`;
  
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  if (activePlayer) {
    activeInfo.textContent = activePlayer.name;
  }
  
  const percent = (gameState.citizenshipIndex / 10) * 100;
  citizenshipFill.style.width = `${percent}%`;
  citizenshipValue.textContent = gameState.citizenshipIndex;
}

// ========== RESOURCES ==========

function renderResources() {
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (me) {
    civicSpan.textContent = me.resources.civic;
    ecoSpan.textContent = me.resources.eco;
    capitalSpan.textContent = me.resources.capital;
    techSpan.textContent = me.resources.tech;
  }
}

// ========== COSTS ==========

function renderCosts() {
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (me && me.faction) {
    // Settlement cost
    const settlementCost = me.faction.settlementCost;
    const settlementStr = Object.entries(settlementCost)
      .map(([k, v]) => `${v} ${k}`)
      .join(' + ');
    settlementCostSpan.textContent = settlementStr;
    
    // Road cost
    const roadCost = me.faction.roadCost;
    const roadStr = Object.entries(roadCost)
      .map(([k, v]) => `${v} ${k}`)
      .join(' + ');
    roadCostSpan.textContent = roadStr;
  } else {
    settlementCostSpan.textContent = '-';
    roadCostSpan.textContent = '-';
  }
}

// ========== ACTIONS ==========

function renderActions() {
  const me = gameState.players.find(p => p.id === myPlayerId);
  
  // Hide all
  confirmPlacementBtn.style.display = 'none';
  endSetupBtn.style.display = 'none';
  expandBtn.style.display = 'none';
  organizeBtn.style.display = 'none';
  tradeBtn.style.display = 'none';
  endTurnBtn.style.display = 'none';
  
  actionHint.textContent = '';
  
  if (!me || !me.faction) {
    actionHint.textContent = 'Fraksiyonunuz atanıyor...';
    selectedMode = null;
    return;
  }
  
  // Setup değerlerini kontrol et
  const setupSettlements = me.setupSettlements || 0;
  const setupRoads = me.setupRoads || 0;
  
  const myTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
  
  if (gameState.phase === 'setup') {
    
    if (myTurn) {
      // Onay butonu - seçim yapıldıysa MUTLAKA göster
      if ((selectedMode === 'settlement' && lastClickedVertex !== null) ||
          (selectedMode === 'road' && lastClickedEdge !== null)) {
        confirmPlacementBtn.style.display = 'block';
        console.log('✓ Yerleştir butonu gösteriliyor! Vertex:', lastClickedVertex, 'Edge:', lastClickedEdge);
      }
      
      endSetupBtn.style.display = 'block';
      endSetupBtn.disabled = setupSettlements < 2 || setupRoads < 2;
      
      actionHint.textContent = `Kurulum: ${setupSettlements}/2 yerleşim, ${setupRoads}/2 yol`;
      
      // Otomatik mod seçimi
      if (setupSettlements < 2) {
        selectedMode = 'settlement';
        if (lastClickedVertex !== null) {
          actionHint.innerHTML = `<strong style="color: #ffeb3b;">Yerleşim SEÇİLDİ!</strong> "✓ Yerleştir" butonuna basın (${setupSettlements}/2)`;
        } else {
          actionHint.innerHTML = `<strong>SıRANıZ!</strong> <span style="color: #9e9e9e;">Gri noktaya</span> tıklayın (${setupSettlements}/2)<br><small>Sarı = seçili</small>`;
        }
      } else if (setupRoads < 2) {
        selectedMode = 'road';
        if (lastClickedEdge !== null) {
          actionHint.innerHTML = `<strong style="color: #ffeb3b;">Yol SEÇİLDİ!</strong> "✓ Yerleştir" butonuna basın (${setupRoads}/2)`;
        } else {
          actionHint.innerHTML = `<strong>SıRANıZ!</strong> <span style="color: #ff9800;">Turuncu çizgiye</span> tıklayın (${setupRoads}/2)<br><small>Sarı = seçili</small>`;
        }
      } else {
        selectedMode = null;
        lastClickedVertex = null;
        lastClickedEdge = null;
        actionHint.innerHTML = '<strong style="color: #4caf50;">✓ Kurulumunuz tamamlandı!</strong> "Kurulumu Bitir" butonuna tıklayın';
      }
    } else {
      selectedMode = null;
      lastClickedVertex = null;
      lastClickedEdge = null;
      const activePlayer = gameState.players[gameState.currentPlayerIndex];
      actionHint.innerHTML = `<strong>Kurulum Fazı:</strong> ${activePlayer.name} yerleştirme yapıyor... Sıranızı bekleyin.`;
    }
    
    console.log('Setup mode:', selectedMode, '| MyTurn:', myTurn, '| LastVertex:', lastClickedVertex, '| LastEdge:', lastClickedEdge);
    
  } else if (gameState.phase === 'main' && myTurn) {
    // Ana oyun butonları
    expandBtn.style.display = 'block';
    organizeBtn.style.display = 'block';
    tradeBtn.style.display = 'block';
    playerTradeBtn.style.display = 'block';
    endTurnBtn.style.display = 'block';
    
    // Expand modunda seçim yapılmışsa onay butonunu göster
    if ((selectedMode === 'expand-settlement' && pendingExpandSettlementId !== null) ||
        (selectedMode === 'expand-road' && pendingExpandRoadId !== null)) {
      confirmPlacementBtn.style.display = 'block';
      
      if (selectedMode === 'expand-settlement') {
        actionHint.innerHTML = '<strong style="color: #ffeb3b;">Yerleşim SEÇİLDİ!</strong> "✓ Yerleştir" butonuna basın';
      } else {
        actionHint.innerHTML = '<strong style="color: #ffeb3b;">Yol SEÇİLDİ!</strong> "✓ Yerleştir" butonuna basın';
      }
    } else if (selectedMode === 'expand-settlement') {
      actionHint.innerHTML = 'Haritadan <span style="color: #9e9e9e;">gri noktaya</span> tıklayın (yerleşim kur)<br><small>Sarı = seçili</small>';
    } else if (selectedMode === 'expand-road') {
      actionHint.innerHTML = 'Haritadan <span style="color: #ff9800;">turuncu çizgiye</span> tıklayın (yol kur)<br><small>Sarı = seçili</small>';
    } else {
      actionHint.textContent = 'Genişle (yeni yerleşim/yol) VEYA Örgütlen (kaynak topla)';
    }
  } else {
    selectedMode = null;
    actionHint.textContent = gameState.phase === 'setup' 
      ? 'Diğer oyuncular kurulumlarını tamamlıyor...' 
      : 'Sıranızı bekleyin...';
  }
}

// ========== LOG ==========

function addLog(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = message;
  logPanel.appendChild(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
}

// ========== EVENT LISTENERS ==========

// Onay butonu - Settlement/Road yerleştir (Setup VE Expand)
confirmPlacementBtn.addEventListener('click', () => {
  console.log('Confirm button clicked! Mode:', selectedMode);
  
  // Setup fazı
  if (selectedMode === 'settlement' && lastClickedVertex !== null) {
    console.log('Sending placeSettlement:', lastClickedVertex);
    send({ type: 'placeSettlement', vertexId: lastClickedVertex });
    lastClickedVertex = null;
    renderMap();
  } else if (selectedMode === 'road' && lastClickedEdge !== null) {
    console.log('Sending placeRoad:', lastClickedEdge);
    send({ type: 'placeRoad', edgeId: lastClickedEdge });
    lastClickedEdge = null;
    renderMap();
  }
  // Expand fazı
  else if (selectedMode === 'expand-settlement' && pendingExpandSettlementId !== null) {
    console.log('Sending expand settlement:', pendingExpandSettlementId);
    send({ type: 'expand', expandType: 'settlement', vertexId: pendingExpandSettlementId });
    pendingExpandSettlementId = null;
    selectedMode = null;
    renderMap();
  } else if (selectedMode === 'expand-road' && pendingExpandRoadId !== null) {
    console.log('Sending expand road:', pendingExpandRoadId);
    send({ type: 'expand', expandType: 'road', edgeId: pendingExpandRoadId });
    pendingExpandRoadId = null;
    selectedMode = null;
    renderMap();
  } else {
    console.log('No valid selection to confirm');
  }
});

joinBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim();
  
  if (!roomCode || roomCode.length !== 4 || !/^\d{4}$/.test(roomCode)) {
    alert('Lütfen 4 haneli bir oda kodu girin (sadece rakam)');
    return;
  }
  
  if (!name) {
    alert('Lütfen bir isim girin');
    return;
  }
  
  send({ type: 'join', name, roomCode });
});

startBtn.addEventListener('click', () => {
  send({ type: 'startGame' });
});

endSetupBtn.addEventListener('click', () => {
  send({ type: 'endSetup' });
});

expandBtn.addEventListener('click', () => {
  // Modal yerine basit seçim
  const choice = prompt('Ne yapmak istersiniz?\n1 = Yerleşim kur (maliyet: fraksiyona göre değişir)\n2 = Yol kur (maliyet: 1 tech + 1 capital)\n\n(1 veya 2 yazın)');
  
  if (choice === '1') {
    selectedMode = 'expand-settlement';
    actionHint.textContent = 'Genişle: Haritadan yeni yerleşim yeri seçin (boş köşe)';
  } else if (choice === '2') {
    selectedMode = 'expand-road';
    actionHint.textContent = 'Genişle: Haritadan yeni yol seçin (boş kenar)';
  } else {
    return;
  }
  
  renderMap();
});

organizeBtn.addEventListener('click', () => {
  selectedMode = 'organize';
  selectedVertices = [];
  const me = gameState.players.find(p => p.id === myPlayerId);
  const maxSlots = Math.max(1, Math.floor(me.settlements / 2));
  actionHint.textContent = `Örgütlen: ${maxSlots} köy seçin`;
  renderMap();
});

tradeBtn.addEventListener('click', () => {
  openTradeModal();
});

tradeCancelBtn.addEventListener('click', () => {
  closeTradeModal();
});

playerTradeBtn.addEventListener('click', () => {
  openPlayerTradeModal();
});

playerTradeCancelBtn.addEventListener('click', () => {
  closePlayerTradeModal();
});

acceptTradeBtn.addEventListener('click', () => {
  if (currentTradeOffer) {
    send({ 
      type: 'respondTrade', 
      offerId: currentTradeOffer.offerId,
      accept: true 
    });
  }
});

rejectTradeBtn.addEventListener('click', () => {
  if (currentTradeOffer) {
    send({ 
      type: 'respondTrade', 
      offerId: currentTradeOffer.offerId,
      accept: false 
    });
  }
  closeTradeOfferModal();
});

endTurnBtn.addEventListener('click', () => {
  if (selectedMode === 'organize' && selectedVertices.length > 0) {
    send({ type: 'organize', vertexIds: selectedVertices });
    selectedMode = null;
    selectedVertices = [];
  } else {
    send({ type: 'endTurn' });
  }
});

playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

// ========== TRADE MODAL ==========

const RESOURCE_INFO = {
  civic: { icon: '🏛️', name: 'Civic' },
  eco: { icon: '🌿', name: 'Eco' },
  capital: { icon: '💰', name: 'Capital' },
  tech: { icon: '⚙️', name: 'Tech' }
};

function openTradeModal() {
  tradeGiveResource = null;
  tradeStep1.style.display = 'block';
  tradeStep2.style.display = 'none';
  
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (!me) return;
  
  // Step 1: Give options (4+ olan kaynaklar)
  tradeGiveOptions.innerHTML = '';
  Object.entries(RESOURCE_INFO).forEach(([key, info]) => {
    const amount = me.resources[key];
    const card = document.createElement('div');
    card.className = 'trade-card';
    
    if (amount < 4) {
      card.classList.add('disabled');
    } else {
      card.onclick = () => selectTradeGive(key);
    }
    
    card.innerHTML = `
      <div class="trade-card-icon">${info.icon}</div>
      <div class="trade-card-name">${info.name}</div>
      <div class="trade-card-amount">Elinizde: ${amount}</div>
    `;
    
    tradeGiveOptions.appendChild(card);
  });
  
  tradeModal.style.display = 'flex';
}

function selectTradeGive(resource) {
  tradeGiveResource = resource;
  tradeStep1.style.display = 'none';
  tradeStep2.style.display = 'block';
  
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (!me) return;
  
  // Step 2: Receive options (tüm kaynaklar)
  tradeReceiveOptions.innerHTML = '';
  Object.entries(RESOURCE_INFO).forEach(([key, info]) => {
    const amount = me.resources[key];
    const card = document.createElement('div');
    card.className = 'trade-card';
    card.onclick = () => selectTradeReceive(key);
    
    card.innerHTML = `
      <div class="trade-card-icon">${info.icon}</div>
      <div class="trade-card-name">${info.name}</div>
      <div class="trade-card-amount">Elinizde: ${amount}</div>
    `;
    
    tradeReceiveOptions.appendChild(card);
  });
}

function selectTradeReceive(resource) {
  if (tradeGiveResource) {
    send({ type: 'trade', give: tradeGiveResource, receive: resource });
    closeTradeModal();
  }
}

function closeTradeModal() {
  tradeModal.style.display = 'none';
  tradeGiveResource = null;
}

// ========== PLAYER TRADE ==========

function openPlayerTradeModal() {
  selectedTradePlayer = null;
  playerTradeGive = null;
  playerTradeReceive = null;
  
  playerTradeStep1.style.display = 'block';
  playerTradeStep2.style.display = 'none';
  playerTradeStep3.style.display = 'none';
  
  const me = gameState.players.find(p => p.id === myPlayerId);
  if (!me) return;
  
  // Diğer oyuncuları listele
  playerSelectOptions.innerHTML = '';
  gameState.players.forEach(player => {
    if (player.id === myPlayerId) return; // Kendimizi gösterme
    
    const card = document.createElement('div');
    card.className = 'trade-card';
    card.onclick = () => selectTradePlayer(player.id);
    
    card.innerHTML = `
      <div class="trade-card-icon">${player.faction.icon}</div>
      <div class="trade-card-name">${player.name}</div>
      <div class="trade-card-amount">${player.settlements} puan</div>
    `;
    
    playerSelectOptions.appendChild(card);
  });
  
  playerTradeModal.style.display = 'flex';
}

function selectTradePlayer(playerId) {
  selectedTradePlayer = playerId;
  playerTradeStep1.style.display = 'none';
  playerTradeStep2.style.display = 'block';
  
  const me = gameState.players.find(p => p.id === myPlayerId);
  
  // Ne vermek istiyorsun?
  playerTradeGiveOptions.innerHTML = '';
  Object.entries(RESOURCE_INFO).forEach(([key, info]) => {
    const amount = me.resources[key];
    const card = document.createElement('div');
    card.className = 'trade-card';
    
    if (amount < 1) {
      card.classList.add('disabled');
    } else {
      card.onclick = () => selectPlayerTradeGive(key);
    }
    
    card.innerHTML = `
      <div class="trade-card-icon">${info.icon}</div>
      <div class="trade-card-name">${info.name}</div>
      <div class="trade-card-amount">Elinizde: ${amount}</div>
    `;
    
    playerTradeGiveOptions.appendChild(card);
  });
}

function selectPlayerTradeGive(resource) {
  playerTradeGive = resource;
  playerTradeStep2.style.display = 'none';
  playerTradeStep3.style.display = 'block';
  
  // Ne almak istiyorsun?
  playerTradeReceiveOptions.innerHTML = '';
  Object.entries(RESOURCE_INFO).forEach(([key, info]) => {
    const card = document.createElement('div');
    card.className = 'trade-card';
    card.onclick = () => selectPlayerTradeReceive(key);
    
    card.innerHTML = `
      <div class="trade-card-icon">${info.icon}</div>
      <div class="trade-card-name">${info.name}</div>
    `;
    
    playerTradeReceiveOptions.appendChild(card);
  });
}

function selectPlayerTradeReceive(resource) {
  playerTradeReceive = resource;
  
  // Teklifi gönder
  send({
    type: 'offerTrade',
    targetPlayerId: selectedTradePlayer,
    give: playerTradeGive,
    receive: playerTradeReceive
  });
  
  closePlayerTradeModal();
  addLog(`Takas teklifi gönderildi...`);
}

function closePlayerTradeModal() {
  playerTradeModal.style.display = 'none';
  selectedTradePlayer = null;
  playerTradeGive = null;
  playerTradeReceive = null;
}

function showTradeOffer(msg) {
  currentTradeOffer = msg;
  
  const offerer = gameState.players.find(p => p.id === msg.fromPlayerId);
  
  tradeOfferContent.innerHTML = `
    <h3>${offerer.name} ${offerer.faction.icon} takas teklif ediyor:</h3>
    <div style="font-size: 2em; margin: 20px 0;">
      <strong>Sen veriyorsun:</strong> ${RESOURCE_INFO[msg.give].icon} ${RESOURCE_INFO[msg.give].name}<br>
      <strong>Sen alıyorsun:</strong> ${RESOURCE_INFO[msg.receive].icon} ${RESOURCE_INFO[msg.receive].name}
    </div>
  `;
  
  tradeOfferModal.style.display = 'flex';
}

function closeTradeOfferModal() {
  tradeOfferModal.style.display = 'none';
  currentTradeOffer = null;
}

// ========== WINNER SCREEN ==========

function showWinnerScreen(winnerName) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.5s;
  `;
  
  const message = document.createElement('div');
  message.style.cssText = `
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    padding: 60px;
    border-radius: 20px;
    text-align: center;
    border: 5px solid #ff9800;
    box-shadow: 0 0 50px rgba(255, 215, 0, 0.8);
    animation: pulse 1s infinite;
  `;
  
  message.innerHTML = `
    <h1 style="font-size: 4em; margin: 0; color: #3e2723; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
      🎉 ${winnerName} 🎉
    </h1>
    <h2 style="font-size: 2em; margin: 20px 0; color: #5d4037;">
      KAZANDI!
    </h2>
    <p style="font-size: 1.5em; color: #6d4c41; margin: 0;">
      Tebrikler! 🏆
    </p>
  `;
  
  overlay.appendChild(message);
  document.body.appendChild(overlay);
  
  // CSS animasyonları ekle
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);
}

// ========== INIT ==========

window.addEventListener('load', () => {
  connectWebSocket();
});
